import { createHash } from 'node:crypto';

import { RISE_CONTENT_PLAN } from '@/contentPlan/plan';
import { resolveCampaignDecision } from '@/domain/adaptivePlanning';
import {
  TopicRequestSchema,
  type AssetRecord,
  type EditorialBrief,
  type TopicRequest,
  type VisualDirection,
} from '@/domain/schemas';
import type { SourceDocument } from '@/research/fetchPublicSource';
import { isPublicAddress, validateSourceUrl } from '@/research/sourcePolicy';
import {
  RISE_ASSET_CATALOG,
  isAssetRenderable,
} from '@/visuals/assetCatalog';
import type { FreshClaimLedgerEntry } from '@/workflow/sourceFreshness';
import { createEditorialBrief } from '@/workflow/topicIntake';

export type PrepareMode = 'auto' | 'single' | 'campaign';
export type PrepareGoal = 'awareness' | 'consideration' | 'conversation';

export interface PrepareCliInput {
  brief: string;
  demo: boolean;
  mode: PrepareMode;
  audience: string;
  goal: PrepareGoal;
  projects: string[];
  sources: string[];
  allowGenerativeVisuals: boolean;
}

type PublicProject = (typeof RISE_CONTENT_PLAN.projects)[number];

export interface PreparedTopicPlan {
  topicRequest: TopicRequest;
  editorialBrief: EditorialBrief;
  projects: PublicProject[];
  sourceUrls: string[];
  assetRecords: AssetRecord[];
  visualDirections: VisualDirection[];
}

const AUDIENCES: Record<string, string> = {
  owners: 'Majitelia a riaditelia slovenských firiem.',
  product: 'Produktoví lídri a produktové tímy.',
  operations: 'Prevádzkoví lídri a tímy zodpovedné za procesy.',
  marketing: 'Marketingoví lídri, ktorí prepájajú produkt, web a meranie.',
};

const DEFAULT_PUBLIC_SOURCES = [
  'https://rise.sk/portfolio/ai-erp',
  'https://rise.sk/portfolio/grant-ai',
  'https://rise.sk/o-nas',
];

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function assertPublicUrl(url: string): void {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`Source URL is not a valid public HTTPS URL: ${url}`);
  }
  const normalizedHost = host.toLowerCase().replace(/^\[|\]$/gu, '');
  if (
    normalizedHost.endsWith('.internal') ||
    normalizedHost.endsWith('.local') ||
    normalizedHost.endsWith('.localhost') ||
    normalizedHost.endsWith('.lan') ||
    normalizedHost.endsWith('.home')
  ) {
    throw new Error(`Source URL is not public and safe: reserved hostname ${host}.`);
  }
  const embeddedIpv4 = normalizedHost.match(
    /(?:^|[.-])(\d{1,3})[.-](\d{1,3})[.-](\d{1,3})[.-](\d{1,3})(?:[.-]|$)/u,
  );
  if (
    embeddedIpv4 &&
    !isPublicAddress(embeddedIpv4.slice(1, 5).join('.'))
  ) {
    throw new Error(`Source URL is not public and safe: private address encoded in ${host}.`);
  }
  const result = validateSourceUrl(url, [host]);
  if (!result.allowed) throw new Error(`Source URL is not public and safe: ${result.reason}`);
}

function approvedAssets(
  projects: readonly PublicProject[],
  catalog: readonly AssetRecord[],
): AssetRecord[] {
  const projectNames = new Set(projects.map(project => project.name));
  return catalog.filter(
    asset =>
      projectNames.has(asset.project) &&
      Boolean(asset.path?.startsWith('/')) &&
      (['instagram', 'linkedin', 'facebook'] as const).every(platform =>
        isAssetRenderable(asset, { project: asset.project, platform }),
      ),
  );
}

function directionsForAssets(assets: readonly AssetRecord[]): VisualDirection[] {
  return assets.map(asset => ({
    id: `direction-${asset.id}`,
    visualClass: asset.visualClass,
    rationale: 'Používa vlastnený a pre všetky tri platformy schválený verejný dôkaz.',
    narrative: 'Reálny produktový detail vysvetlí rozhodnutie bez vymysleného UI alebo výsledku.',
    layout: 'split-detail',
    assetIds: [asset.id],
    crop: 'center 4:5; zachovať bezpečný okraj 84 px',
    safeZones: ['84 px zo všetkých strán', 'stredná zóna pre responzívny orez'],
    allowGenerativeVisuals: false,
  }));
}

export class ManualContentCheckpointError extends Error {
  readonly topicRequest: TopicRequest;

  constructor(topicRequest: TopicRequest, reasons: readonly string[]) {
    super(`Manual content checkpoint required before research or drafting: ${reasons.join(' ')}`);
    this.name = 'ManualContentCheckpointError';
    this.topicRequest = topicRequest;
  }
}

export function assertDemoOptions(input: PrepareCliInput): void {
  if (!input.demo) return;
  const conflicts = [
    input.mode !== 'auto' && '--mode',
    input.audience !== 'owners' && '--audience',
    input.goal !== 'consideration' && '--goal',
    input.projects.length > 0 && '--project',
    input.sources.length > 0 && '--source',
    input.allowGenerativeVisuals && '--allow-generative-visuals',
  ].filter((value): value is string => Boolean(value));
  if (conflicts.length > 0) {
    throw new Error(
      `--demo is deterministic and cannot be combined with production options: ${conflicts.join(', ')}.`,
    );
  }
}

/**
 * Deterministic production intake. It resolves only canonical public projects
 * and stops approval-required work before research, model or board calls.
 */
export function prepareTopicRequest(
  input: PrepareCliInput,
  options: { assetCatalog?: readonly AssetRecord[] } = {},
): PreparedTopicPlan {
  if (!(['auto', 'single', 'campaign'] as const).includes(input.mode)) {
    throw new Error(`Unsupported campaign mode: ${String(input.mode)}.`);
  }
  if (!(['awareness', 'consideration', 'conversation'] as const).includes(input.goal)) {
    throw new Error(`Unsupported production goal: ${String(input.goal)}.`);
  }
  const projectById = new Map(
    RISE_CONTENT_PLAN.projects.map(project => [project.id, project] as const),
  );
  const projectIds = unique(input.projects.map(project => project.trim()).filter(Boolean));
  const projects = projectIds.map(projectId => {
    const project = projectById.get(projectId);
    if (!project) throw new Error(`Unknown public project slug "${projectId}".`);
    return project;
  });
  const projectUrls = unique(projects.map(project => project.publicUrl));
  const sourceUrls = unique([
    ...projectUrls,
    ...input.sources.map(source => source.trim()).filter(Boolean),
  ]);
  const resolvedSources =
    sourceUrls.length > 0 ? sourceUrls : [...DEFAULT_PUBLIC_SOURCES];
  resolvedSources.forEach(assertPublicUrl);

  const audience = AUDIENCES[input.audience] ?? input.audience.trim();
  const topicRequest = TopicRequestSchema.parse({
    topic: input.brief,
    audience,
    goal: input.goal,
    mode: input.mode,
    ...(input.mode === 'campaign' ? { requestedPostCount: 3 } : {}),
    projectUrls,
    sourceUrls: resolvedSources,
    allowGenerativeVisuals: input.allowGenerativeVisuals,
  });
  const editorialBrief = createEditorialBrief(topicRequest).brief;
  const checkpointReasons: string[] = [];
  if (input.allowGenerativeVisuals) {
    checkpointReasons.push(
      'Generatívny zámer musí mať človekom schválený art direction; tento príkaz nič negeneruje.',
    );
  }
  const approvalProjects = projects.filter(project => project.requiresBriefApproval);
  if (approvalProjects.length > 0) {
    checkpointReasons.push(
      `Projekty vyžadujú samostatné schválenie briefu: ${approvalProjects.map(project => project.id).join(', ')}.`,
    );
  }
  if (editorialBrief.approvalState !== 'approved') {
    checkpointReasons.push(
      `Brief obsahuje riziká: ${editorialBrief.riskFlags.join(', ') || 'nešpecifikované'}.`,
    );
  }
  if (checkpointReasons.length > 0) {
    throw new ManualContentCheckpointError(topicRequest, checkpointReasons);
  }

  const assetRecords = approvedAssets(
    projects,
    options.assetCatalog ?? RISE_ASSET_CATALOG.assets,
  );
  const visualDirections = directionsForAssets(assetRecords);
  return {
    topicRequest,
    editorialBrief,
    projects,
    sourceUrls: resolvedSources,
    assetRecords,
    visualDirections,
  };
}

function stableId(prefix: 'source' | 'claim', url: string): string {
  return `${prefix}-${createHash('sha256').update(url).digest('hex').slice(0, 12)}`;
}

function firstSentence(text: string): string {
  const normalized = text.replace(/\s+/gu, ' ').trim();
  const sentence = normalized.match(/^.*?[.!?](?:\s|$)/u)?.[0]?.trim() ?? normalized;
  return sentence.slice(0, 1_000).trim();
}

/** Creates an exact pre-author ledger from the fetched public document snapshot. */
export function createClaimLedger(
  documents: readonly SourceDocument[],
  now = new Date(),
): FreshClaimLedgerEntry[] {
  const seen = new Set<string>();
  return documents.flatMap(document => {
    if (seen.has(document.url)) return [];
    seen.add(document.url);
    const checkedAt = new Date(document.checkedAt);
    if (Number.isNaN(checkedAt.getTime()) || checkedAt.getTime() > now.getTime()) {
      throw new Error(`Source has an invalid or future checked date: ${document.url}`);
    }
    const expiresAt = new Date(checkedAt.getTime() + 365 * 24 * 60 * 60 * 1_000);
    const evidence = document.text.replace(/\s+/gu, ' ').trim().slice(0, 2_000).trim();
    const claim = firstSentence(evidence);
    if (!claim || !evidence) throw new Error(`Source has no claim evidence: ${document.url}`);
    return [{
      id: stableId('claim', document.url),
      sourceId: stableId('source', document.url),
      sourceUrl: document.url,
      claim,
      evidence,
      checkedAt: document.checkedAt,
      risk: 'stable' as const,
      expiresAt: expiresAt.toISOString(),
    }];
  });
}

function normalizedSignal(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('sk')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Campaign expansion is decided only from already researched evidence,
 * explicit buyer questions and visual records that pass the complete
 * all-platform rights/redaction/renderability gate.
 */
export function deriveProductionCampaignDecision(
  request: TopicRequest,
  ledger: readonly FreshClaimLedgerEntry[],
  assets: readonly AssetRecord[],
  buyerQuestions: readonly string[],
) {
  const insights = new Set(
    ledger.map(entry => normalizedSignal(entry.claim)).filter(Boolean),
  );
  const visualClasses = new Set(
    assets
      .filter(
        asset =>
          Boolean(asset.path?.startsWith('/')) &&
          (['instagram', 'linkedin', 'facebook'] as const).every(platform =>
            isAssetRenderable(asset, { project: asset.project, platform }),
          ),
      )
      .map(asset => asset.visualClass),
  );
  const questions = new Set(
    buyerQuestions
      .filter(question => question.trim().endsWith('?'))
      .map(normalizedSignal)
      .filter(Boolean),
  );
  return resolveCampaignDecision(request, {
    evidenceInsightCount: insights.size,
    visualClassCount: visualClasses.size,
    buyerQuestionCount: questions.size,
  });
}
