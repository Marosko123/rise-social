import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test, vi } from 'vitest';

import { computeApprovalDigest } from '@/domain/approval';
import type { Platform } from '@/domain/schemas';
import type { ExportBundleResult } from '@/export/createExportBundle';
import {
  cleanupPublishedMedia,
  publishApprovedRun,
  type MediaHost,
  type PublishingGateway,
  type PublishingPostInput,
} from '@/publishing/publishApprovedRun';
import { BufferGraphqlClient } from '@/publishing/bufferGraphqlClient';
import { CloudinaryMediaHost } from '@/publishing/cloudinaryMediaHost';

import { createFixtureRun } from './fixtures';

function createBundle(run = createFixtureRun()): ExportBundleResult {
  const root = mkdtempSync(join(tmpdir(), 'rise-publish-'));
  const digest = run.approval!.digest;
  for (const [index, post] of run.draft.posts.entries()) {
    const directory = join(root, `${String(index + 1).padStart(2, '0')}-${post.theme}`);
    for (const platform of ['instagram', 'linkedin', 'facebook'] as Platform[]) {
      mkdirSync(join(directory, platform), { recursive: true });
    }
    for (let slide = 1; slide <= 4; slide += 1) {
      writeFileSync(
        join(directory, 'instagram', `slide-${String(slide).padStart(2, '0')}.png`),
        `image-${index}-${slide}`,
      );
    }
    writeFileSync(join(directory, 'linkedin', 'carousel.pdf'), `pdf-${index}`);
  }
  const fileDigests = Object.fromEntries(
    readdirSync(root, { recursive: true })
      .map(path => String(path))
      .filter(path => statSync(join(root, path)).isFile())
      .map(path => [
        path,
        createHash('sha256').update(readFileSync(join(root, path))).digest('hex'),
      ]),
  );
  return {
    directory: root,
    zipPath: join(root, `${digest}.zip`),
    digest,
    fileDigests,
  } as ExportBundleResult;
}

function approvedScheduleRun() {
  const run = createFixtureRun();
  run.approval!.action = 'schedule';
  return run;
}

function createFakes(options: { scheduledCount?: number; failScheduleAt?: number } = {}) {
  const uploads: string[] = [];
  const drafts: PublishingPostInput[] = [];
  const scheduled: string[] = [];
  const deleted: string[] = [];
  const removedMedia: string[] = [];
  let scheduleAttempt = 0;
  const mediaHost: MediaHost = {
    async upload(filePath) {
      uploads.push(filePath);
      return {
        url: `https://media.example/${encodeURIComponent(filePath.split('/').at(-1)!)}`,
        publicId: `asset-${uploads.length}`,
        resourceType: filePath.endsWith('.pdf') ? 'raw' : 'image',
      };
    },
    async remove(publicId) {
      removedMedia.push(publicId);
    },
  };
  const gateway: PublishingGateway = {
    async preflight(channels) {
      return (Object.entries(channels) as [Platform, string][]).map(([platform, channelId]) => ({
        platform,
        channelId,
        service: platform,
        organizationId: 'organization',
        queuePaused: false,
        scheduledCount: options.scheduledCount ?? 2,
      }));
    },
    async createDraft(input) {
      drafts.push(input);
      return { id: `draft-${drafts.length}`, text: input.text, status: 'draft' };
    },
    async verifyDraft() {
      return true;
    },
    async scheduleDraft(id) {
      scheduleAttempt += 1;
      if (options.failScheduleAt === scheduleAttempt) {
        throw new Error('Buffer edit failed');
      }
      scheduled.push(id);
      return { id, status: 'scheduled' };
    },
    async deletePost(id) {
      deleted.push(id);
    },
    async sentPostIds() {
      return new Set(scheduled);
    },
  };
  return { mediaHost, gateway, uploads, drafts, scheduled, deleted, removedMedia };
}

const channels: Record<Platform, string> = {
  instagram: 'ig-channel',
  linkedin: 'li-channel',
  facebook: 'fb-channel',
};

async function stageAndReapprove(
  run: ReturnType<typeof approvedScheduleRun>,
  fakes: ReturnType<typeof createFakes>,
) {
  const drafted = await publishApprovedRun(
    run,
    createBundle(run),
    channels,
    fakes.mediaHost,
    fakes.gateway,
    new Date('2026-07-24T10:00:00.000Z'),
    { draftOnly: true },
  );
  run.publishReceipt = drafted;
  run.approval!.approvedAt = '2026-07-24T10:02:00.000Z';
  return drafted;
}

describe('approved publisher', () => {
  test('requires staged drafts and a newer approval before scheduling', async () => {
    const fakes = createFakes();
    const run = approvedScheduleRun();

    await expect(
      publishApprovedRun(
        run,
        createBundle(run),
        channels,
        fakes.mediaHost,
        fakes.gateway,
      ),
    ).rejects.toThrow(/stage|staged/i);
    expect(fakes.uploads).toEqual([]);
    expect(fakes.scheduled).toEqual([]);
  });

  test('rejects changed or symlinked bundle media before provider upload', async () => {
    const changedFakes = createFakes();
    const changedRun = approvedScheduleRun();
    const changedBundle = createBundle(changedRun) as ExportBundleResult & {
      fileDigests: Record<string, string>;
    };
    const changedSlide = join(
      changedBundle.directory,
      '01-decision-education',
      'instagram',
      'slide-01.png',
    );
    writeFileSync(changedSlide, 'unapproved replacement');

    await expect(
      publishApprovedRun(
        changedRun,
        changedBundle,
        channels,
        changedFakes.mediaHost,
        changedFakes.gateway,
        new Date(),
        { draftOnly: true },
      ),
    ).rejects.toThrow(/bundle|attest|changed/i);
    expect(changedFakes.uploads).toEqual([]);

    const linkedFakes = createFakes();
    const linkedRun = approvedScheduleRun();
    const linkedBundle = createBundle(linkedRun) as ExportBundleResult & {
      fileDigests: Record<string, string>;
    };
    const linkedSlide = join(
      linkedBundle.directory,
      '01-decision-education',
      'instagram',
      'slide-01.png',
    );
    const outside = join(mkdtempSync(join(tmpdir(), 'rise-publish-outside-')), 'same.png');
    writeFileSync(outside, readFileSync(linkedSlide));
    unlinkSync(linkedSlide);
    symlinkSync(outside, linkedSlide);

    await expect(
      publishApprovedRun(
        linkedRun,
        linkedBundle,
        channels,
        linkedFakes.mediaHost,
        linkedFakes.gateway,
        new Date(),
        { draftOnly: true },
      ),
    ).rejects.toThrow(/regular|symlink|outside/i);
    expect(linkedFakes.uploads).toEqual([]);
  });

  test('rechecks current approval before provider mutations', async () => {
    const fakes = createFakes();
    const run = approvedScheduleRun();
    const options = {
      draftOnly: true,
      assertCurrentApproval: () => {
        throw new Error('Current approval was invalidated.');
      },
    };

    await expect(
      publishApprovedRun(
        run,
        createBundle(run),
        channels,
        fakes.mediaHost,
        fakes.gateway,
        new Date(),
        options,
      ),
    ).rejects.toThrow(/invalidated/i);
    expect(fakes.uploads).toEqual([]);
    expect(fakes.drafts).toEqual([]);
  });

  test('uploads unique media, verifies nine drafts, then schedules all variants', async () => {
    const fakes = createFakes();
    const run = approvedScheduleRun();
    run.draft.posts[0].platforms.linkedin.link = 'https://rise.sk/sluzby';
    run.approval!.digest = computeApprovalDigest(run.draft);
    await stageAndReapprove(run, fakes);
    const receipt = await publishApprovedRun(
      run,
      createBundle(run),
      channels,
      fakes.mediaHost,
      fakes.gateway,
      new Date('2026-07-24T10:00:00.000Z'),
    );

    expect(receipt.status).toBe('scheduled');
    expect(receipt.remotes).toHaveLength(9);
    expect(receipt.mediaCleanup).toHaveLength(15);
    expect(fakes.uploads).toHaveLength(15);
    expect(fakes.drafts).toHaveLength(9);
    expect(fakes.drafts.filter(draft => draft.platform === 'linkedin').every(draft => draft.assets[0].kind === 'document')).toBe(true);
    expect(
      fakes.drafts.find(
        draft => draft.localPostId === 'post-1' && draft.platform === 'linkedin',
      )?.text,
    ).toContain('utm_source=linkedin');
    expect(fakes.scheduled).toHaveLength(9);
    expect(fakes.deleted).toEqual([]);
  });

  test('deletes hosted media only after every related post is confirmed sent plus seven days', async () => {
    const fakes = createFakes();
    const run = approvedScheduleRun();
    await stageAndReapprove(run, fakes);
    const receipt = await publishApprovedRun(
      run,
      createBundle(run),
      channels,
      fakes.mediaHost,
      fakes.gateway,
      new Date('2026-07-24T10:00:00.000Z'),
    );

    const tooEarly = await cleanupPublishedMedia(
      receipt,
      channels,
      fakes.mediaHost,
      fakes.gateway,
      new Date('2026-07-31T09:59:59.000Z'),
    );
    expect(tooEarly.mediaCleanup?.every(media => media.status === 'pending')).toBe(true);
    expect(fakes.removedMedia).toEqual([]);

    const cleaned = await cleanupPublishedMedia(
      receipt,
      channels,
      fakes.mediaHost,
      fakes.gateway,
      new Date('2026-08-10T10:00:00.000Z'),
    );
    expect(cleaned.mediaCleanup?.every(media => media.status === 'deleted')).toBe(true);
    expect(fakes.removedMedia).toHaveLength(15);
  });

  test('can stage verified Buffer drafts and requires a newer browser approval before scheduling them', async () => {
    const fakes = createFakes();
    const run = approvedScheduleRun();
    const drafted = await publishApprovedRun(
      run,
      createBundle(run),
      channels,
      fakes.mediaHost,
      fakes.gateway,
      new Date('2026-07-24T10:00:00.000Z'),
      { draftOnly: true },
    );
    expect(drafted.status).toBe('drafted');
    expect(fakes.drafts).toHaveLength(9);
    expect(fakes.scheduled).toEqual([]);

    run.publishReceipt = drafted;
    await expect(
      publishApprovedRun(
        run,
        createBundle(run),
        channels,
        fakes.mediaHost,
        fakes.gateway,
        new Date('2026-07-24T10:01:00.000Z'),
      ),
    ).rejects.toThrow(/approve again/i);

    run.approval!.approvedAt = '2026-07-24T10:02:00.000Z';
    const scheduled = await publishApprovedRun(
      run,
      createBundle(run),
      channels,
      fakes.mediaHost,
      fakes.gateway,
      new Date('2026-07-24T10:03:00.000Z'),
    );
    expect(scheduled.status).toBe('scheduled');
    expect(fakes.uploads).toHaveLength(15);
    expect(fakes.drafts).toHaveLength(9);
    expect(fakes.scheduled).toHaveLength(9);
  });

  test('stops before uploading when a free Buffer channel has fewer than three slots', async () => {
    const fakes = createFakes({ scheduledCount: 8 });

    await expect(
      publishApprovedRun(
        approvedScheduleRun(),
        createBundle(),
        channels,
        fakes.mediaHost,
        fakes.gateway,
        new Date(),
        { draftOnly: true },
      ),
    ).rejects.toThrow(/three free queue positions/i);
    expect(fakes.uploads).toEqual([]);
    expect(fakes.drafts).toEqual([]);
  });

  test('returns an exact partial receipt and leaves remaining drafts untouched', async () => {
    const fakes = createFakes({ failScheduleAt: 3 });
    const run = approvedScheduleRun();
    await stageAndReapprove(run, fakes);
    const receipt = await publishApprovedRun(
      run,
      createBundle(run),
      channels,
      fakes.mediaHost,
      fakes.gateway,
      new Date('2026-07-24T10:00:00.000Z'),
    );

    expect(receipt.status).toBe('partial');
    expect(receipt.remotes.filter(remote => remote.status === 'scheduled')).toHaveLength(2);
    expect(receipt.remotes.filter(remote => remote.status === 'draft')).toHaveLength(7);
    expect(receipt.remotes.find(remote => remote.status === 'draft')?.error).toMatch(/manual reconciliation/i);
    expect(fakes.deleted).toEqual([]);
  });

  test('reuses a completed matching receipt without any remote calls', async () => {
    const run = approvedScheduleRun();
    run.status = 'scheduled';
    run.publishReceipt = {
      runId: run.id,
      digest: run.approval!.digest,
      attemptedAt: '2026-07-24T10:00:00.000Z',
      status: 'scheduled',
      remotes: [],
    };
    const fakes = createFakes();

    const receipt = await publishApprovedRun(
      run,
      createBundle(),
      channels,
      fakes.mediaHost,
      fakes.gateway,
    );

    expect(receipt).toEqual(run.publishReceipt);
    expect(fakes.uploads).toEqual([]);
    expect(fakes.drafts).toEqual([]);
  });
});

describe('publishing adapters', () => {
  test('treats a Buffer delete MutationError as a rollback failure', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            deletePost: {
              __typename: 'MutationError',
              message: 'Delete rejected',
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const client = new BufferGraphqlClient({
      apiKey: 'secret',
      fetcher,
    });

    await expect(client.deletePost('draft-1')).rejects.toThrow(/delete rejected/i);
  });
  test('sends Buffer drafts as GraphQL variables with AI disclosure and image alt text', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            createPost: {
              __typename: 'PostActionSuccess',
              post: { id: 'remote-1', text: 'Caption', status: 'draft' },
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const client = new BufferGraphqlClient({
      apiKey: 'secret',
      fetcher,
    });

    await client.createDraft({
      localPostId: 'post-1',
      platform: 'instagram',
      channelId: 'channel-1',
      text: 'Caption',
      altText: 'Opis obrázka.',
      dueAt: '2026-07-27T10:00:00.000Z',
      assets: [{ kind: 'image', url: 'https://media.example/slide.png' }],
    });

    const request = fetcher.mock.calls[0];
    const body = JSON.parse(String((request[1] as RequestInit).body)) as {
      variables: { input: Record<string, unknown> };
    };
    expect(request[0]).toBe('https://api.buffer.com');
    expect((request[1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer secret',
    });
    expect(body.variables.input).toMatchObject({
      channelId: 'channel-1',
      saveToDraft: true,
      aiAssisted: true,
      mode: 'addToQueue',
      assets: [
        {
          image: {
            url: 'https://media.example/slide.png',
            metadata: { altText: 'Opis obrázka.' },
          },
        },
      ],
    });
  });

  test('signs Cloudinary uploads without placing the API secret in the multipart body', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'rise-cloudinary-'));
    const filePath = join(directory, 'slide.png');
    writeFileSync(filePath, 'image');
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          secure_url: 'https://res.cloudinary.com/rise/image/upload/slide.png',
          public_id: 'rise/slide',
          resource_type: 'image',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const host = new CloudinaryMediaHost({
      cloudName: 'rise',
      apiKey: 'key',
      apiSecret: 'super-secret',
      fetcher,
      now: () => new Date('2026-07-24T10:00:00.000Z'),
    });

    await host.upload(filePath, 'rise/run/slide');

    expect(fetcher.mock.calls[0][0]).toBe('https://api.cloudinary.com/v1_1/rise/image/upload');
    const body = (fetcher.mock.calls[0][1] as RequestInit).body as FormData;
    expect(body.get('api_key')).toBe('key');
    expect(body.get('signature')).toMatch(/^[a-f0-9]{40}$/);
    expect([...body.values()].map(String).join(' ')).not.toContain('super-secret');
  });
});
