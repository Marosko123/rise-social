import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { CliAgentRunner } from '@/agents/cliAgentRunner';
import { SocialPackOrchestrator } from '@/agents/socialPackOrchestrator';
import { archiveApprovedRun } from '@/archive/archiveApprovedRun';
import { syncRunToBoard } from '@/board/syncRunToBoard';
import { YouTrackBoardGateway } from '@/board/youTrackBoardGateway';
import { createDemoDraft } from '@/demo/createDemoDraft';
import { assertBriefMayDraft, classifyContentBrief } from '@/domain/risk';
import { ContentRunSchema } from '@/domain/schemas';
import { createExportBundle } from '@/export/createExportBundle';
import { parsePriorPosts } from '@/history/importPriorPosts';
import { BufferGraphqlClient } from '@/publishing/bufferGraphqlClient';
import { CloudinaryMediaHost } from '@/publishing/cloudinaryMediaHost';
import {
  cleanupPublishedMedia,
  publishApprovedRun,
} from '@/publishing/publishApprovedRun';
import { PlaywrightAssetRenderer } from '@/rendering/playwrightAssetRenderer';
import { createProfilePack } from '@/profile/profilePack';
import { fetchPublicSource } from '@/research/fetchPublicSource';
import {
  getRunRepository,
  isPublishingConfigured,
} from '@/server/repository';

import type { CliServices } from './program';
import {
  assertDemoOptions,
  createClaimLedger,
  deriveProductionCampaignDecision,
  prepareTopicRequest,
  type PrepareCliInput,
} from './prepare';

import type { DraftPack } from '@/domain/schemas';
import type { SourceDocument } from '@/research/fetchPublicSource';

const executeFile = promisify(execFile);
const LOCAL_URL = 'http://127.0.0.1:4173';
const YOUTRACK_BASE_URL =
  process.env.RISE_SOCIAL_YOUTRACK_BASE_URL ?? 'https://rise.youtrack.cloud';
const YOUTRACK_PROJECT = process.env.RISE_SOCIAL_YOUTRACK_PROJECT ?? 'RISE';
const YOUTRACK_BOARD_ID = process.env.RISE_SOCIAL_YOUTRACK_BOARD_ID ?? '204-1';

function boardGateway(): YouTrackBoardGateway {
  const token = process.env.RISE_SOCIAL_YOUTRACK_TOKEN?.trim();
  if (!token) throw new Error('RISE_SOCIAL_YOUTRACK_TOKEN is not configured.');
  return new YouTrackBoardGateway({
    baseUrl: YOUTRACK_BASE_URL,
    token,
    projectShortName: YOUTRACK_PROJECT,
    boardId: YOUTRACK_BOARD_ID,
  });
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing publishing configuration: ${name}.`);
  return value;
}

export interface ProductionDraftDependencies {
  now: Date;
  previousFeedback?: string;
  previousCaptions: string[];
  runNumber: number;
  assetCatalog?: readonly import('@/domain/schemas').AssetRecord[];
  fetchSource: (
    url: string,
    approvedHosts: readonly string[],
    checkedAt: Date,
  ) => Promise<SourceDocument>;
  orchestrator: Pick<SocialPackOrchestrator, 'prepare'>;
}

export async function prepareProductionDraft(
  input: PrepareCliInput,
  dependencies: ProductionDraftDependencies,
): Promise<{ draft: DraftPack; contentBrief: ReturnType<typeof classifyContentBrief>; brief: string }> {
  if (input.demo) throw new Error('Production draft preparation cannot run in demo mode.');
  const brief = [input.brief, dependencies.previousFeedback]
    .filter(Boolean)
    .join('\n\nPripomienka:\n');
  const topicPlan = prepareTopicRequest(
    { ...input, brief },
    { assetCatalog: dependencies.assetCatalog },
  );
  const contentBrief = classifyContentBrief(brief);
  assertBriefMayDraft(contentBrief);
  const sourceUrls = topicPlan.sourceUrls;
  const approvedHosts = [...new Set(sourceUrls.map(url => new URL(url).hostname))];
  const documents = await Promise.all(
    sourceUrls.map(url =>
      dependencies.fetchSource(url, approvedHosts, dependencies.now),
    ),
  );
  const claimLedger = createClaimLedger(documents, dependencies.now);
  const sourceQuestions = documents.flatMap(document =>
    document.text.match(/[^.!?]{4,240}\?/gu) ?? [],
  );
  const campaignDecision = deriveProductionCampaignDecision(
    topicPlan.topicRequest,
    claimLedger,
    topicPlan.assetRecords,
    [topicPlan.editorialBrief.buyerQuestion, ...sourceQuestions],
  );
  const draft = await dependencies.orchestrator.prepare({
    brief,
    topicRequest: topicPlan.topicRequest,
    editorialBrief: topicPlan.editorialBrief,
    planningSignals: {
      evidenceInsightCount: campaignDecision.evidenceInsightCount,
      visualClassCount: campaignDecision.visualClassCount,
      buyerQuestionCount: campaignDecision.buyerQuestionCount,
    },
    claimLedger,
    assetRecords: topicPlan.assetRecords,
    visualDirections: topicPlan.visualDirections,
    sourceDocuments: documents,
    previousCaptions: dependencies.previousCaptions,
    runNumber: dependencies.runNumber,
    now: dependencies.now,
  });
  return { draft, contentBrief, brief };
}

function requireRun(runId: string) {
  const run = getRunRepository().get(runId);
  if (!run) throw new Error(`Unknown content run "${runId}".`);
  return run;
}

function currentApprovalGuard(runId: string, digest: string, revision: number) {
  return () => {
    const current = requireRun(runId);
    if (
      !current.approval ||
      current.approval.digest !== digest ||
      current.approval.revision !== revision
    ) {
      throw new Error(
        'Current approval was invalidated before the provider action.',
      );
    }
  };
}

async function exportRun(runId: string) {
  const run = requireRun(runId);
  const result = await createExportBundle(
    run,
    process.env.RISE_SOCIAL_EXPORT_ROOT ?? join(process.cwd(), 'data', 'exports'),
    new PlaywrightAssetRenderer(),
  );
  return { zipPath: result.zipPath, bundle: result };
}

export const defaultCliServices: CliServices = {
  async profilePack(outputDirectory) {
    const result = await createProfilePack(outputDirectory);
    return { directory: result.directory };
  },
  async prepare(input) {
    assertDemoOptions(input);
    const now = new Date();
    const repository = getRunRepository();
    const previous = repository.list()[0];
    const previousCaptions = repository
      .list()
      .flatMap(run =>
        run.draft.posts.flatMap(post =>
          Object.values(post.platforms).map(variant => variant.caption),
        ),
      )
      .concat(repository.listPriorPosts().map(post => post.caption));
    const prepared = input.demo
      ? {
          draft: createDemoDraft(now),
          contentBrief: classifyContentBrief(input.brief),
        }
      : await prepareProductionDraft(input, {
          now,
          previousFeedback: previous?.feedback,
          previousCaptions,
          runNumber: repository.list().length + 1,
          fetchSource: (url, approvedHosts, checkedAt) =>
            fetchPublicSource(url, approvedHosts, undefined, checkedAt),
          orchestrator: new SocialPackOrchestrator(new CliAgentRunner()),
        });
    if (input.demo) assertBriefMayDraft(prepared.contentBrief);
    const generatedDraft = prepared.draft;
    const contentBrief = prepared.contentBrief;
    const runId = `run-${now.toISOString().replace(/\D/g, '').slice(0, 14)}-${randomUUID().slice(0, 6)}`;
    const run = repository.save(
      ContentRunSchema.parse({
        id: runId,
        status: 'draft',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        revision: 1,
        qualifiedConversations: 0,
        draft: {
          ...generatedDraft,
          contentBrief,
          priorPosts: repository.listPriorPosts().slice(0, 60),
        },
      }),
    );
    if (!input.demo) {
      try {
        const boardResult = await syncRunToBoard(run, boardGateway(), { apply: true, now });
        repository.recordBoardSync(run.id, boardResult);
      } catch (error) {
        repository.recordBoardSync(run.id, {
          receipt: {
            runId,
            idempotencyKey: `pending-${runId}`,
            status: 'pending',
            attemptedAt: now.toISOString(),
            dryRun: false,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
    return { runId, url: `${LOCAL_URL}/review?run=${encodeURIComponent(runId)}` };
  },

  async review(runId) {
    const selected = runId ?? getRunRepository().list()[0]?.id;
    if (!selected) throw new Error('No content run exists yet.');
    requireRun(selected);
    const url = `${LOCAL_URL}/review?run=${encodeURIComponent(selected)}`;
    await executeFile('open', [url]);
    return { url };
  },

  async exportRun(runId) {
    const result = await exportRun(runId);
    return { zipPath: result.zipPath };
  },

  async doctor() {
    const checks: string[] = [];
    let ok = true;
    const major = Number(process.versions.node.split('.')[0]);
    const nodeOk = Number.isInteger(major) && major >= 24;
    checks.push(`Node.js ${process.versions.node}: ${nodeOk ? 'OK' : 'vyžaduje sa >=24'}`);
    ok &&= nodeOk;
    for (const [label, command, args] of [
      ['Codex CLI', process.env.RISE_SOCIAL_CODEX_BIN ?? 'codex', ['--version']],
      ['Claude CLI', process.env.RISE_SOCIAL_CLAUDE_BIN ?? 'claude', ['--version']],
      ['GitHub CLI', 'gh', ['auth', 'status']],
      ['Git LFS', 'git', ['lfs', 'version']],
    ] as const) {
      try {
        await executeFile(command, [...args], { timeout: 15_000 });
        checks.push(`${label}: OK`);
      } catch {
        checks.push(`${label}: chýba alebo nie je pripravené`);
        ok = false;
      }
    }
    if (process.env.RISE_SOCIAL_YOUTRACK_TOKEN?.trim()) {
      checks.push(`YouTrack ${YOUTRACK_PROJECT} / board ${YOUTRACK_BOARD_ID}: nakonfigurovaný`);
    } else {
      checks.push('YouTrack: token chýba, runy sa bezpečne ukladajú ako boardSync=pending');
    }
    checks.push(
      isPublishingConfigured()
        ? 'Buffer + Cloudinary: pripravené pre voliteľné schválené publikovanie'
        : 'Buffer + Cloudinary: nenakonfigurované, manuálny export zostáva funkčný',
    );
    return { ok, checks };
  },

  async importHistory(file) {
    const content = await readFile(file, 'utf8');
    const posts = parsePriorPosts(content, file);
    return { imported: getRunRepository().importPriorPosts(posts) };
  },

  async syncBoard(runId, apply) {
    const run = requireRun(runId);
    let result;
    try {
      result = await syncRunToBoard(run, boardGateway(), { apply });
    } catch (error) {
      result = {
        receipt: {
          runId,
          idempotencyKey: `pending-${runId}`,
          status: 'pending' as const,
          attemptedAt: new Date().toISOString(),
          dryRun: !apply,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
    const saved = getRunRepository().recordBoardSync(runId, result);
    return {
      status: saved.boardSync?.status ?? 'pending',
      issueUrl: saved.boardLink?.issueUrl,
    };
  },

  async archiveRun(runId) {
    const run = requireRun(runId);
    const { bundle } = await exportRun(runId);
    const archived = await archiveApprovedRun(
      run,
      bundle.directory,
      join(process.cwd(), 'content', 'approved'),
    );
    getRunRepository().recordArchive(runId, archived.manifest);
    return { directory: archived.directory };
  },

  async stageRun(runId) {
    if (!isPublishingConfigured()) {
      throw new Error('Buffer and Cloudinary publishing is not fully configured.');
    }
    const run = requireRun(runId);
    const { bundle } = await exportRun(runId);
    const receipt = await publishApprovedRun(
      run,
      bundle,
      {
        instagram: requiredEnvironment('BUFFER_INSTAGRAM_CHANNEL_ID'),
        linkedin: requiredEnvironment('BUFFER_LINKEDIN_CHANNEL_ID'),
        facebook: requiredEnvironment('BUFFER_FACEBOOK_CHANNEL_ID'),
      },
      new CloudinaryMediaHost({
        cloudName: requiredEnvironment('CLOUDINARY_CLOUD_NAME'),
        apiKey: requiredEnvironment('CLOUDINARY_API_KEY'),
        apiSecret: requiredEnvironment('CLOUDINARY_API_SECRET'),
      }),
      new BufferGraphqlClient({
        apiKey: requiredEnvironment('BUFFER_API_KEY'),
        apiUrl: process.env.BUFFER_API_URL,
      }),
      new Date(),
      {
        draftOnly: true,
        assertCurrentApproval: currentApprovalGuard(
          runId,
          run.approval!.digest,
          run.revision,
        ),
      },
    );
    getRunRepository().recordPublishReceipt(receipt);
    return { status: receipt.status, remoteCount: receipt.remotes.length };
  },

  async scheduleRun(runId) {
    if (!isPublishingConfigured()) {
      throw new Error('Buffer and Cloudinary publishing is not fully configured.');
    }
    const run = requireRun(runId);
    const { bundle } = await exportRun(runId);
    const receipt = await publishApprovedRun(
      run,
      bundle,
      {
        instagram: requiredEnvironment('BUFFER_INSTAGRAM_CHANNEL_ID'),
        linkedin: requiredEnvironment('BUFFER_LINKEDIN_CHANNEL_ID'),
        facebook: requiredEnvironment('BUFFER_FACEBOOK_CHANNEL_ID'),
      },
      new CloudinaryMediaHost({
        cloudName: requiredEnvironment('CLOUDINARY_CLOUD_NAME'),
        apiKey: requiredEnvironment('CLOUDINARY_API_KEY'),
        apiSecret: requiredEnvironment('CLOUDINARY_API_SECRET'),
      }),
      new BufferGraphqlClient({
        apiKey: requiredEnvironment('BUFFER_API_KEY'),
        apiUrl: process.env.BUFFER_API_URL,
      }),
      new Date(),
      {
        assertCurrentApproval: currentApprovalGuard(
          runId,
          run.approval!.digest,
          run.revision,
        ),
      },
    );
    getRunRepository().recordPublishReceipt(receipt);
    return { status: receipt.status, remoteCount: receipt.remotes.length };
  },

  async cleanup(runId) {
    if (!isPublishingConfigured()) {
      throw new Error('Buffer and Cloudinary publishing is not fully configured.');
    }
    const repository = getRunRepository();
    const runs = runId ? [requireRun(runId)] : repository.list();
    const mediaHost = new CloudinaryMediaHost({
      cloudName: requiredEnvironment('CLOUDINARY_CLOUD_NAME'),
      apiKey: requiredEnvironment('CLOUDINARY_API_KEY'),
      apiSecret: requiredEnvironment('CLOUDINARY_API_SECRET'),
    });
    const gateway = new BufferGraphqlClient({
      apiKey: requiredEnvironment('BUFFER_API_KEY'),
      apiUrl: process.env.BUFFER_API_URL,
    });
    const channels = {
      instagram: requiredEnvironment('BUFFER_INSTAGRAM_CHANNEL_ID'),
      linkedin: requiredEnvironment('BUFFER_LINKEDIN_CHANNEL_ID'),
      facebook: requiredEnvironment('BUFFER_FACEBOOK_CHANNEL_ID'),
    } as const;
    let deleted = 0;
    let pending = 0;
    let errors = 0;
    for (const run of runs) {
      if (!run.publishReceipt?.mediaCleanup?.length) continue;
      const receipt = await cleanupPublishedMedia(
        run.publishReceipt,
        channels,
        mediaHost,
        gateway,
      );
      repository.recordPublishReceipt(receipt);
      deleted += receipt.mediaCleanup?.filter(media => media.status === 'deleted').length ?? 0;
      pending += receipt.mediaCleanup?.filter(media => media.status === 'pending').length ?? 0;
      errors += receipt.mediaCleanup?.filter(media => media.status === 'error').length ?? 0;
    }
    return { deleted, pending, errors };
  },
};
