import { createHash } from 'node:crypto';
import { lstat, readFile, realpath, readdir } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

import { computeApprovalDigest } from '@/domain/approval';
import { assertRunReadyForApproval } from '@/domain/approvalReadiness';
import {
  PublishReceiptSchema,
  type ContentRun,
  type Platform,
  type PublishReceipt,
} from '@/domain/schemas';
import { publishingText } from '@/domain/tracking';
import type { ExportBundleResult } from '@/export/createExportBundle';

export type PublishingAsset =
  | { kind: 'image'; url: string }
  | { kind: 'document'; url: string; title: string; thumbnailUrl: string };

export interface PublishingPostInput {
  localPostId: string;
  platform: Platform;
  channelId: string;
  text: string;
  altText: string;
  dueAt: string;
  assets: PublishingAsset[];
}

export interface HostedMedia {
  url: string;
  publicId: string;
  resourceType: 'image' | 'raw';
}

export interface MediaHost {
  upload(filePath: string, publicId: string): Promise<HostedMedia>;
  remove(publicId: string, resourceType: 'image' | 'raw'): Promise<void>;
}

export interface ChannelState {
  platform: Platform;
  channelId: string;
  service: string;
  organizationId: string;
  queuePaused: boolean;
  scheduledCount: number;
}

export interface PublishingGateway {
  preflight(channels: Record<Platform, string>): Promise<ChannelState[]>;
  createDraft(input: PublishingPostInput): Promise<{ id: string; text: string; status: 'draft' }>;
  verifyDraft(id: string, channelId: string): Promise<boolean>;
  scheduleDraft(id: string, dueAt: string): Promise<{ id: string; status: 'scheduled' }>;
  deletePost(id: string): Promise<void>;
  sentPostIds(channels: Record<Platform, string>, startDate: string): Promise<Set<string>>;
}

function validateApproval(run: ContentRun, bundle: ExportBundleResult): string {
  assertRunReadyForApproval(run);
  const digest = computeApprovalDigest(run.draft);
  if (!run.approval || run.approval.action !== 'schedule') {
    throw new Error('Run requires explicit schedule approval.');
  }
  if (
    run.approval.digest !== digest ||
    run.approval.revision !== run.revision ||
    bundle.digest !== digest
  ) {
    throw new Error('Run approval or export bundle is stale.');
  }
  return digest;
}

async function postDirectories(bundle: ExportBundleResult): Promise<string[]> {
  const entries = await readdir(bundle.directory, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory() && /^\d{2}-/.test(entry.name))
    .map(entry => join(bundle.directory, entry.name))
    .sort();
}

async function assertAttestedBundleFile(
  bundle: ExportBundleResult,
  filePath: string,
): Promise<void> {
  const root = resolve(bundle.directory);
  const relativePath = relative(root, resolve(filePath)).replaceAll('\\', '/');
  if (
    !relativePath ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    !bundle.fileDigests[relativePath]
  ) {
    throw new Error('Publishing media is outside the attested export bundle.');
  }
  const stats = await lstat(filePath);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error('Publishing media must be a regular non-symlink file.');
  }
  const [realRoot, realFile] = await Promise.all([
    realpath(root),
    realpath(filePath),
  ]);
  if (realFile !== realRoot && !realFile.startsWith(`${realRoot}${sep}`)) {
    throw new Error('Publishing media resolves outside the export bundle.');
  }
  const digest = createHash('sha256')
    .update(await readFile(filePath))
    .digest('hex');
  if (digest !== bundle.fileDigests[relativePath]) {
    throw new Error(`Export bundle file changed after attestation: ${relativePath}.`);
  }
}

async function rollbackDrafts(
  gateway: PublishingGateway,
  drafts: { id: string }[],
): Promise<string[]> {
  const failures: string[] = [];
  for (const draft of drafts) {
    try {
      await gateway.deletePost(draft.id);
    } catch (error) {
      failures.push(`${draft.id}: ${error instanceof Error ? error.message : 'delete failed'}`);
    }
  }
  return failures;
}

export async function publishApprovedRun(
  run: ContentRun,
  bundle: ExportBundleResult,
  channels: Record<Platform, string>,
  mediaHost: MediaHost,
  gateway: PublishingGateway,
  attemptedAt = new Date(),
  options: {
    draftOnly?: boolean;
    assertCurrentApproval?: () => void | Promise<void>;
  } = {},
): Promise<PublishReceipt> {
  const digest = validateApproval(run, bundle);
  if (run.publishReceipt?.status === 'scheduled' && run.publishReceipt.digest === digest) {
    return run.publishReceipt;
  }
  if (
    !options.draftOnly &&
    !(
      run.publishReceipt?.status === 'drafted' &&
      run.publishReceipt.digest === digest
    )
  ) {
    throw new Error(
      'Stage and review Buffer drafts before a newer approval can schedule them.',
    );
  }
  const assertCurrentApproval = async () => {
    await options.assertCurrentApproval?.();
  };

  await assertCurrentApproval();
  const channelStates = await gateway.preflight(channels);
  for (const state of channelStates) {
    if (state.service.toLowerCase() !== state.platform) {
      throw new Error(
        `Buffer channel ${state.channelId} is ${state.service}, expected ${state.platform}.`,
      );
    }
    if (state.queuePaused) {
      throw new Error(`Buffer queue for ${state.platform} is paused.`);
    }
    if (state.scheduledCount > 7) {
      throw new Error(
        `Buffer ${state.platform} needs three free queue positions; ${10 - state.scheduledCount} remain.`,
      );
    }
  }

  if (run.publishReceipt?.status === 'drafted' && run.publishReceipt.digest === digest) {
    if (
      !run.approval ||
      new Date(run.approval.approvedAt) <= new Date(run.publishReceipt.attemptedAt)
    ) {
      throw new Error('Approve again in the browser before scheduling staged Buffer drafts.');
    }
    const remoteStates = structuredClone(run.publishReceipt.remotes);
    for (let index = 0; index < remoteStates.length; index += 1) {
      const remote = remoteStates[index];
      try {
        await assertCurrentApproval();
        await gateway.scheduleDraft(remote.remoteId, remote.scheduledFor);
        remote.status = 'scheduled';
        remote.error = undefined;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Buffer scheduling failed';
        for (let remaining = index; remaining < remoteStates.length; remaining += 1) {
          remoteStates[remaining].error =
            `Manual reconciliation required. Scheduling stopped after: ${message}`;
        }
        return PublishReceiptSchema.parse({
          ...run.publishReceipt,
          attemptedAt: attemptedAt.toISOString(),
          status: 'partial',
          remotes: remoteStates,
        });
      }
    }
    return PublishReceiptSchema.parse({
      ...run.publishReceipt,
      attemptedAt: attemptedAt.toISOString(),
      status: 'scheduled',
      remotes: remoteStates,
    });
  }

  const directories = await postDirectories(bundle);
  if (directories.length !== run.draft.posts.length) {
    throw new Error('Export bundle does not contain one directory per post.');
  }

  const inputs: PublishingPostInput[] = [];
  const mediaCleanup: NonNullable<PublishReceipt['mediaCleanup']> = [];
  for (const [postIndex, post] of run.draft.posts.entries()) {
    const directory = directories[postIndex];
    const slideNames = (await readdir(join(directory, 'instagram')))
      .filter(name => /^slide-\d+\.png$/.test(name))
      .sort();
    if (slideNames.length !== post.slides.length) {
      throw new Error(`Exported slide count does not match post ${post.id}.`);
    }
    const slideMedia: HostedMedia[] = [];
    for (const slideName of slideNames) {
      const slidePath = join(directory, 'instagram', slideName);
      await assertAttestedBundleFile(bundle, slidePath);
      await assertCurrentApproval();
      slideMedia.push(
        await mediaHost.upload(
          slidePath,
          `rise-social/${run.id}/${digest}/${post.id}/${slideName.replace(/\.png$/, '')}`,
        ),
      );
    }
    const documentPath = join(directory, 'linkedin', 'carousel.pdf');
    await assertAttestedBundleFile(bundle, documentPath);
    await assertCurrentApproval();
    const document = await mediaHost.upload(
      documentPath,
      `rise-social/${run.id}/${digest}/${post.id}/carousel.pdf`,
    );
    const latestScheduledAt = Math.max(
      ...Object.values(post.platforms).map(variant =>
        new Date(variant.scheduledFor).getTime(),
      ),
    );
    const deleteAfter = new Date(latestScheduledAt + 7 * 24 * 60 * 60 * 1_000).toISOString();
    mediaCleanup.push(
      ...[...slideMedia, document].map(media => ({
        postId: post.id,
        publicId: media.publicId,
        resourceType: media.resourceType,
        deleteAfter,
        status: 'pending' as const,
      })),
    );

    for (const platform of ['instagram', 'linkedin', 'facebook'] as Platform[]) {
      const variant = post.platforms[platform];
      inputs.push({
        localPostId: post.id,
        platform,
        channelId: channels[platform],
        text: publishingText(
          variant.caption,
          variant.link,
          platform,
          run.id,
          post.id,
          new Date(run.draft.generatedAt),
        ),
        altText: variant.altText,
        dueAt: variant.scheduledFor,
        assets:
          platform === 'linkedin'
            ? [
                {
                  kind: 'document',
                  url: document.url,
                  title: post.title,
                  thumbnailUrl: slideMedia[0].url,
                },
              ]
            : slideMedia.map(media => ({ kind: 'image' as const, url: media.url })),
      });
    }
  }

  const created: {
    id: string;
    input: PublishingPostInput;
  }[] = [];
  try {
    for (const input of inputs) {
      await assertCurrentApproval();
      const draft = await gateway.createDraft(input);
      if (!draft.id || draft.status !== 'draft' || draft.text !== input.text) {
        throw new Error(`Buffer returned an invalid draft for ${input.platform}/${input.localPostId}.`);
      }
      created.push({ id: draft.id, input });
    }
    for (const draft of created) {
      if (!(await gateway.verifyDraft(draft.id, draft.input.channelId))) {
        throw new Error(`Buffer draft ${draft.id} could not be verified.`);
      }
    }
  } catch (error) {
    const rollbackFailures = await rollbackDrafts(gateway, created);
    return PublishReceiptSchema.parse({
      runId: run.id,
      digest,
      attemptedAt: attemptedAt.toISOString(),
      status: 'failed',
      remotes: created.map(draft => ({
        postId: draft.input.localPostId,
        platform: draft.input.platform,
        remoteId: draft.id,
        status: 'failed',
        scheduledFor: draft.input.dueAt,
        error:
          rollbackFailures.length > 0
            ? `Draft rollback incomplete: ${rollbackFailures.join(', ')}`
            : `Draft removed after rollback: ${error instanceof Error ? error.message : 'draft failure'}`,
      })),
      mediaCleanup,
    });
  }

  const remoteStates: {
    postId: string;
    platform: Platform;
    remoteId: string;
    status: 'draft' | 'scheduled' | 'failed';
    scheduledFor: string;
    error?: string;
  }[] = created.map(draft => ({
    postId: draft.input.localPostId,
    platform: draft.input.platform,
    remoteId: draft.id,
    status: 'draft',
    scheduledFor: draft.input.dueAt,
    error: undefined as string | undefined,
  }));

  if (options.draftOnly) {
    return PublishReceiptSchema.parse({
      runId: run.id,
      digest,
      attemptedAt: attemptedAt.toISOString(),
      status: 'drafted',
      remotes: remoteStates,
      mediaCleanup,
    });
  }

  for (let index = 0; index < created.length; index += 1) {
    const draft = created[index];
    try {
      await assertCurrentApproval();
      await gateway.scheduleDraft(draft.id, draft.input.dueAt);
      remoteStates[index].status = 'scheduled';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Buffer scheduling failed';
      for (let remaining = index; remaining < remoteStates.length; remaining += 1) {
        remoteStates[remaining].error =
          `Manual reconciliation required. Scheduling stopped after: ${message}`;
      }
      return PublishReceiptSchema.parse({
        runId: run.id,
        digest,
        attemptedAt: attemptedAt.toISOString(),
        status: 'partial',
        remotes: remoteStates,
        mediaCleanup,
      });
    }
  }

  return PublishReceiptSchema.parse({
    runId: run.id,
    digest,
    attemptedAt: attemptedAt.toISOString(),
    status: 'scheduled',
    remotes: remoteStates,
    mediaCleanup,
  });
}

export async function cleanupPublishedMedia(
  receipt: PublishReceipt,
  channels: Record<Platform, string>,
  mediaHost: MediaHost,
  gateway: PublishingGateway,
  now = new Date(),
): Promise<PublishReceipt> {
  if (!receipt.mediaCleanup?.length) return receipt;
  const due = receipt.mediaCleanup.filter(
    media => media.status !== 'deleted' && new Date(media.deleteAfter) <= now,
  );
  if (due.length === 0) return receipt;

  await gateway.preflight(channels);
  const earliestSchedule =
    receipt.remotes
      .map(remote => remote.scheduledFor)
      .sort()[0] ?? new Date(0).toISOString();
  const sentIds = await gateway.sentPostIds(channels, earliestSchedule);
  const nextMedia = await Promise.all(
    receipt.mediaCleanup.map(async media => {
      if (media.status === 'deleted' || new Date(media.deleteAfter) > now) return media;
      const related = receipt.remotes.filter(remote => remote.postId === media.postId);
      if (
        related.length !== 3 ||
        related.some(remote => remote.status !== 'scheduled' || !sentIds.has(remote.remoteId))
      ) {
        return media;
      }
      try {
        await mediaHost.remove(media.publicId, media.resourceType);
        return {
          ...media,
          status: 'deleted' as const,
          deletedAt: now.toISOString(),
          error: undefined,
        };
      } catch (error) {
        return {
          ...media,
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Cloudinary cleanup failed.',
        };
      }
    }),
  );
  return PublishReceiptSchema.parse({ ...receipt, mediaCleanup: nextMedia });
}
