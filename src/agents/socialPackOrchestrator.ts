import { resolveCampaignDecision, type PlanningSignals } from '@/domain/adaptivePlanning';
import { classifyContentBrief } from '@/domain/risk';
import { createDefaultSchedule } from '@/domain/schedule';
import {
  AssetRecordSchema,
  ClaimLedgerEntrySchema,
  DraftPackSchema,
  EditorialBriefSchema,
  GenerationRecipeSchema,
  ReviewReportSchema,
  TopicRequestSchema,
  VisualDirectionSchema,
  type AssetRecord,
  type DraftPack,
  type EditorialBrief,
  type GenerationRecipe,
  type ModelName,
  type Platform,
  type PostConcept,
  type TopicRequest,
  type VisualDirection,
  reviewReportPasses,
} from '@/domain/schemas';
import { validateDraftPack } from '@/domain/validation';
import { platformPromptBlock } from '@/editorial/platformGuidance';
import type { SourceDocument } from '@/research/fetchPublicSource';
import { isAssetRenderable } from '@/visuals/assetCatalog';
import { assessGenerationRecipe } from '@/visuals/visualQa';
import { assessCampaignContinuity } from '@/workflow/continuity';
import { assertFreshClaimLedger, type FreshClaimLedgerEntry } from '@/workflow/sourceFreshness';
import { createEditorialBrief } from '@/workflow/topicIntake';

export interface AgentRunner {
  run(model: ModelName, prompt: string): Promise<string>;
}

export interface PreparePackInput {
  brief?: string;
  topicRequest?: TopicRequest;
  editorialBrief?: EditorialBrief;
  planningSignals?: Partial<PlanningSignals>;
  claimLedger?: FreshClaimLedgerEntry[];
  assetRecords?: AssetRecord[];
  visualDirections?: VisualDirection[];
  generationRecipes?: GenerationRecipe[];
  sourceDocuments: SourceDocument[];
  previousCaptions?: string[];
  runNumber: number;
  now?: Date;
}

function parseJsonResponse(value: string): unknown {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('Agent response did not contain a JSON object.');
    parsed = JSON.parse(trimmed.slice(start, end + 1));
  }
  if (parsed && typeof parsed === 'object') {
    const envelope = parsed as Record<string, unknown>;
    if (typeof envelope.result === 'string') return parseJsonResponse(envelope.result);
    if (envelope.structured_output) return envelope.structured_output;
  }
  return parsed;
}

function rolesForRun(runNumber: number): { author: ModelName; critic: ModelName } {
  return runNumber % 2 === 1
    ? { author: 'codex', critic: 'claude' }
    : { author: 'claude', critic: 'codex' };
}

function normalizeDraft(
  value: unknown,
  brief: string,
  author: ModelName,
  critic: ModelName,
  now: Date,
  expectedPostCount: number,
): DraftPack {
  if (!value || typeof value !== 'object') throw new Error('Agent draft must be a JSON object.');
  const raw = value as Record<string, unknown>;
  const posts = Array.isArray(raw.posts) ? structuredClone(raw.posts) : raw.posts;
  const schedule = createDefaultSchedule(now);
  if (Array.isArray(posts)) {
    for (const [postIndex, post] of posts.entries()) {
      if (!post || typeof post !== 'object') continue;
      const platforms = (post as Record<string, unknown>).platforms;
      if (!platforms || typeof platforms !== 'object' || !schedule[postIndex]) continue;
      for (const platform of ['instagram', 'linkedin', 'facebook'] as Platform[]) {
        const variant = (platforms as Record<string, unknown>)[platform];
        if (variant && typeof variant === 'object') {
          (variant as Record<string, unknown>).scheduledFor =
            schedule[postIndex].byPlatform[platform];
        }
      }
    }
  }
  const draft = DraftPackSchema.parse({
    ...raw,
    schemaVersion: 2,
    brief,
    generatedAt: now.toISOString(),
    author,
    critic,
    posts,
  });
  if (draft.posts.length !== expectedPostCount) {
    throw new Error(`Author returned ${draft.posts.length} posts; planning decision requires ${expectedPostCount}.`);
  }
  return draft;
}

function assertGroundedSources(draft: DraftPack, sourceDocuments: SourceDocument[]): void {
  const normalizeUrl = (value: string) => new URL(value).href.replace(/\/$/, '');
  const approvedDocuments = new Map(
    sourceDocuments.map(source => [normalizeUrl(source.url), source]),
  );
  const sourceById = new Map(draft.sources.map(source => [source.id, source]));
  for (const source of draft.sources) {
    const approved = approvedDocuments.get(normalizeUrl(source.url));
    if (!approved) {
      throw new Error(`Source ${source.url} is not present in the approved research set.`);
    }
    if (source.checkedAt !== approved.checkedAt) {
      throw new Error(`Source ${source.url} checked date does not match the approved research document.`);
    }
  }
  for (const claim of draft.claims) {
    const source = sourceById.get(claim.sourceId);
    if (!source || normalizeUrl(claim.sourceUrl) !== normalizeUrl(source.url)) {
      throw new Error(`Claim ${claim.id} is not bound to its declared draft source URL.`);
    }
    const approved = approvedDocuments.get(normalizeUrl(source.url));
    if (!approved || claim.checkedAt !== approved.checkedAt) {
      throw new Error(`Claim ${claim.id} checked date does not match the approved research document.`);
    }
  }
}

function assertLedgerMatchesDocuments(
  ledger: readonly FreshClaimLedgerEntry[],
  sourceDocuments: SourceDocument[],
  now: Date,
): FreshClaimLedgerEntry[] {
  if (ledger.length === 0) throw new Error('Production topic requests require a fresh claim ledger before the author call.');
  const docsByUrl = new Map(sourceDocuments.map(document => [new URL(document.url).href.replace(/\/$/u, ''), document]));
  const bindings = new Map<string, { id: string; url: string }>();
  for (const entry of ledger) {
    const document = docsByUrl.get(new URL(entry.sourceUrl).href.replace(/\/$/u, ''));
    if (!document) throw new Error(`Claim ledger source ${entry.sourceUrl} is not in the approved public research set.`);
    if (entry.checkedAt !== document.checkedAt) {
      throw new Error(`Claim ledger ${entry.id} checked date does not match its approved source.`);
    }
    const prior = bindings.get(entry.sourceId);
    if (prior && prior.url !== entry.sourceUrl) throw new Error(`Claim ledger source ID ${entry.sourceId} points to more than one URL.`);
    bindings.set(entry.sourceId, { id: entry.sourceId, url: entry.sourceUrl });
  }
  assertFreshClaimLedger(ledger, [...bindings.values()], now);
  return ledger.map(entry => ClaimLedgerEntrySchema.parse(entry));
}

function assertDraftMatchesLedger(draft: DraftPack, ledger: readonly FreshClaimLedgerEntry[]): void {
  if (ledger.length === 0) return;
  const byId = new Map(ledger.map(entry => [entry.id, entry]));
  const expectedSources = new Map(
    ledger.map(entry => [entry.sourceId, { url: entry.sourceUrl, checkedAt: entry.checkedAt }]),
  );
  if (draft.sources.length !== expectedSources.size) {
    throw new Error('Draft sources do not exactly match the approved fresh claim ledger.');
  }
  if (draft.claims.length !== ledger.length) {
    throw new Error('Draft claim ledger does not contain exactly the approved fresh claims.');
  }
  const sourceById = new Map(draft.sources.map(source => [source.id, source]));
  for (const [sourceId, expected] of expectedSources) {
    const source = sourceById.get(sourceId);
    if (!source || source.url !== expected.url || source.checkedAt !== expected.checkedAt) {
      throw new Error(`Draft source ${sourceId} does not exactly match the approved fresh claim ledger.`);
    }
  }
  for (const claim of draft.claims) {
    const expected = byId.get(claim.id);
    if (!expected || claim.sourceId !== expected.sourceId || claim.sourceUrl !== expected.sourceUrl ||
      claim.claim !== expected.claim || claim.evidence !== expected.evidence || claim.checkedAt !== expected.checkedAt ||
      claim.risk !== expected.risk || claim.expiresAt !== expected.expiresAt) {
      throw new Error(`Draft claim ${claim.id} does not exactly match the approved fresh claim ledger.`);
    }
    const source = sourceById.get(claim.sourceId);
    if (!source || source.url !== expected.sourceUrl || source.checkedAt !== expected.checkedAt) {
      throw new Error(`Draft source ${claim.sourceId} does not exactly match the approved fresh claim ledger.`);
    }
  }
  for (const entry of ledger) {
    if (!draft.claims.some(claim => claim.id === entry.id)) {
      throw new Error(`Approved fresh claim ledger entry ${entry.id} is unused by the draft.`);
    }
  }
}

function assertCampaignContinuity(draft: DraftPack): void {
  if (draft.posts.length < 2) return;
  for (const [index, post] of draft.posts.entries()) {
    if (!post.opening?.trim() || !post.promise?.trim() || !post.core?.trim()) {
      throw new Error(
        `Campaign post ${index + 1} requires explicit opening, promise and core fields.`,
      );
    }
  }
  const assessment = assessCampaignContinuity(
    draft.posts.map(post => ({
      topic: post.project ?? post.theme,
      title: post.title,
      opening: post.opening!,
      promise: post.promise!,
      core: post.core!,
    })),
  );
  if (!assessment.passed) throw new Error(`Campaign continuity failed: ${assessment.issues.join(' ')}`);
}

function assertPostMediaReferences(post: PostConcept, assets: readonly AssetRecord[]): void {
  for (const slide of post.slides) {
    if (!slide.imagePath && !slide.assetId) continue;
    if (!slide.imagePath || !slide.assetId) {
      throw new Error(`Slide ${slide.id} media must include both imagePath and a selected asset ID.`);
    }
    const asset = assets.find(candidate => candidate.id === slide.assetId);
    if (!asset || asset.path !== slide.imagePath) {
      throw new Error(`Slide ${slide.id} media is not bound to a matching selected asset record.`);
    }
    if (!post.project || post.project !== asset.project) {
      throw new Error(`Slide ${slide.id} media project does not match its selected asset.`);
    }
    for (const platform of ['instagram', 'linkedin', 'facebook'] as Platform[]) {
      if (!isAssetRenderable(asset, { project: post.project, platform })) {
        throw new Error(`Slide ${slide.id} media asset ${asset.id} is not safe and renderable for ${platform}.`);
      }
    }
  }
}

function assertDraftMediaReferences(draft: DraftPack, assets: readonly AssetRecord[]): void {
  for (const post of draft.posts) assertPostMediaReferences(post, assets);
}

function preflightVisualInputs(
  request: TopicRequest,
  editorialBrief: EditorialBrief,
  input: PreparePackInput,
): { assetRecords: AssetRecord[]; visualDirections: VisualDirection[]; generationRecipes: GenerationRecipe[] } {
  const assetRecords = (input.assetRecords ?? []).map(asset => AssetRecordSchema.parse(asset));
  const visualDirections = (input.visualDirections ?? []).map(direction => VisualDirectionSchema.parse(direction));
  const generationRecipes = (input.generationRecipes ?? []).map(recipe => GenerationRecipeSchema.parse(recipe));
  const assetsById = new Map(assetRecords.map(asset => [asset.id, asset]));
  const referencedAssetIds = new Set<string>();
  const directionsById = new Map<string, VisualDirection>();
  for (const direction of visualDirections) {
    if (!direction.id) throw new Error('Selected visual directions require a stable ID before the author call.');
    if (directionsById.has(direction.id)) throw new Error(`Visual direction ${direction.id} is duplicated.`);
    directionsById.set(direction.id, direction);
    for (const assetId of direction.assetIds) {
      const asset = assetsById.get(assetId);
      if (!asset) throw new Error(`Visual direction ${direction.id} references unknown asset ${assetId}.`);
      referencedAssetIds.add(assetId);
      for (const platform of ['instagram', 'linkedin', 'facebook'] as Platform[]) {
        if (!isAssetRenderable(asset, { project: asset.project, platform })) {
          throw new Error(`Selected asset ${asset.id} is not safe and approved for ${platform}.`);
        }
      }
    }
  }
  for (const asset of assetRecords) {
    if (!referencedAssetIds.has(asset.id)) throw new Error(`Selected asset ${asset.id} is unused by every visual direction.`);
  }
  for (const recipe of generationRecipes) {
    if (!request.allowGenerativeVisuals || editorialBrief.approvalState !== 'approved' || !editorialBrief.riskFlags.includes('generative-image')) {
      throw new Error('Generative visual recipes require an explicitly approved generative-image brief before the author call.');
    }
    const direction = directionsById.get(recipe.visualDirectionId);
    if (!direction || !direction.allowGenerativeVisuals) {
      throw new Error(`Generation recipe ${recipe.visualDirectionId} is not bound to an approved visual direction.`);
    }
    for (const assetId of recipe.referenceAssetIds) {
      if (!assetsById.has(assetId)) throw new Error(`Generation recipe references unknown asset ${assetId}.`);
    }
    const report = assessGenerationRecipe(recipe);
    if (!report.passed) throw new Error(report.findings.map(finding => finding.message).join(' '));
  }
  return { assetRecords, visualDirections, generationRecipes };
}

function validateFinalDraft(
  draft: DraftPack,
  sourceDocuments: SourceDocument[],
  previousCaptions: string[],
  ledger: readonly FreshClaimLedgerEntry[] = [],
  assets: readonly AssetRecord[] = [],
): void {
  assertGroundedSources(draft, sourceDocuments);
  assertDraftMatchesLedger(draft, ledger);
  assertCampaignContinuity(draft);
  assertDraftMediaReferences(draft, assets);
  const issues = validateDraftPack(draft, previousCaptions);
  if (issues.length > 0) {
    throw new Error(
      `Final draft failed editorial validation: ${issues
        .map(issue => `${issue.code} at ${issue.path}`)
        .join(', ')}`,
    );
  }
}

function sourceBlock(sourceDocuments: SourceDocument[]): string {
  return JSON.stringify(
    sourceDocuments.map(source => ({
      url: source.url,
      title: source.title,
      publisher: source.publisher,
      checkedAt: source.checkedAt,
      text: source.text,
    })),
    null,
    2,
  );
}

function priorPostBlock(previousCaptions: string[]): string {
  if (previousCaptions.length === 0) return 'No prior captions are stored yet.';
  return previousCaptions.slice(0, 60).map(caption => `- ${caption}`).join('\n');
}

function authorPrompt(
  brief: string,
  documents: SourceDocument[],
  previousCaptions: string[],
  postCount: number,
  editorialBrief: EditorialBrief,
  decision: ReturnType<typeof resolveCampaignDecision>,
  claimLedger: FreshClaimLedgerEntry[],
  assetRecords: AssetRecord[],
  visualDirections: VisualDirection[],
  generationRecipes: GenerationRecipe[],
): string {
  return `You are preparing organic social content for Rise.sk, a Slovak software and product team.

Return only one JSON object matching this contract:
- schemaVersion: 2
- brief, generatedAt, author, critic, warnings
- sources: evidence objects with id, url, title, publisher, checkedAt, claim
- claims: stable evidence objects with id, sourceId, sourceUrl, claim, evidence, checkedAt, risk, expiresAt. Copy every approved fresh ledger entry exactly; do not add, omit or rewrite one.
- posts: exactly ${postCount} post${postCount === 1 ? '' : 's'} with distinct themes from product-proof, decision-education, growth-system, people-process, signal-noise
- each post: id, theme, title, summary, explicit opening, promise and core, sourceIds, claimIds, visualKind, 4 to 8 slides
- each slide: id, eyebrow, title, body, alt, claimIds, optional imagePath
- each post has instagram, linkedin, facebook variants with platform, caption, altText, claimIds, scheduledFor

Write natural Slovak. Use only facts in the supplied documents. Never invent metrics, quotes,
client facts, or personal anecdotes. Avoid generic hooks, em dashes, en dashes, semicolons,
engagement bait, and inflated marketing words. Software and product work must remain dominant.
Do not reuse one caption across platforms. Follow these platform-specific contracts:

${platformPromptBlock()}

Approved business brief and campaign decision. These are requirements, not facts to embellish:
${JSON.stringify({ editorialBrief, campaignDecision: decision }, null, 2)}

Fresh claim ledger. This is the only factual ledger permitted in the draft. Preserve every ID,
source ID/URL, claim, evidence excerpt, checked date, risk and expiry exactly:
${JSON.stringify(claimLedger, null, 2)}

Selected visual directions and asset-rights metadata. Use only listed public/approved evidence;
never expose paths, private material, credentials or unapproved client visuals:
${JSON.stringify(
  {
    assetRecords: assetRecords.map(asset => ({
      id: asset.id,
      visualClass: asset.visualClass,
      project: asset.project,
      allowedPlatforms: asset.allowedPlatforms,
      rightsStatus: asset.rightsStatus,
      redactionStatus: asset.redactionStatus,
      approved: asset.approved,
    })),
    visualDirections,
    generationProvenance: generationRecipes.map(recipe => ({
      visualDirectionId: recipe.visualDirectionId,
      disclosure: recipe.disclosure,
      generatedAt: recipe.generatedAt,
      generationApprovedAt: recipe.generationApprovedAt,
    })),
  },
  null,
  2,
)}

Brief:
${brief || 'Vyberte jednu konkrétnu tému z verejných zdrojov.'}

Prior Rise captions. Do not repeat their concept or opening:
${priorPostBlock(previousCaptions)}

Approved source documents:
${sourceBlock(documents)}`;
}

function reviewPrompt(
  draft: DraftPack,
  sourceDocuments: SourceDocument[],
  previousCaptions: string[],
  workflowContext?: {
    topicRequest: TopicRequest;
    editorialBrief?: EditorialBrief;
    campaignDecision?: ReturnType<typeof resolveCampaignDecision>;
    visualDirections: VisualDirection[];
    assetRecords: AssetRecord[];
    generationRecipes: GenerationRecipe[];
    claimLedger: FreshClaimLedgerEntry[];
  },
  stage: 'critique' | 'final-validation' = 'critique',
): string {
  return `${stage === 'final-validation' ? 'Perform the final independent validation of this Rise.sk draft.' : 'Review this Rise.sk draft independently.'} Check every claim against the approved documents,
natural Slovak rhythm, repetitive openings, all platform contracts, carousel clarity, business fit, and generic
AI phrasing. LinkedIn needs a real Rise perspective, Instagram must be visual-first without raw caption URLs,
and Facebook must be concise and conversational. Return only JSON with approved:boolean, blocker:boolean,
issues:string[], revisionInstructions:string and scorecard with factualAccuracy, voice, specificity, continuity,
visualClarity, businessFit as integer scores from 0 to 5, passed:boolean, notes:string[]. A review passes only
when approved is true, blocker is false, every score is at least 4, and passed is true.

Platform contracts:
${platformPromptBlock()}

Approved documents:
${sourceBlock(sourceDocuments)}

Prior Rise captions:
${priorPostBlock(previousCaptions)}

Review digest evidence (claims/sources are in the draft; verify this visual context too):
${JSON.stringify(
  workflowContext && {
    topicRequest: workflowContext.topicRequest,
    editorialBrief: workflowContext.editorialBrief,
    campaignDecision: workflowContext.campaignDecision,
    visualDirections: workflowContext.visualDirections,
    claimLedger: workflowContext.claimLedger,
    assetRights: workflowContext.assetRecords.map(asset => ({
      id: asset.id,
      rightsStatus: asset.rightsStatus,
      redactionStatus: asset.redactionStatus,
      approved: asset.approved,
    })),
    generationProvenance: workflowContext.generationRecipes,
  },
  null,
  2,
)}

Draft:
${JSON.stringify(draft, null, 2)}`;
}

function planningRequest(input: PreparePackInput): TopicRequest {
  if (input.topicRequest) return TopicRequestSchema.parse(input.topicRequest);
  const brief = input.brief?.trim() || 'Vybrať jednu konkrétnu tému z verejných zdrojov.';
  return TopicRequestSchema.parse({
    topic: brief,
    audience: 'Firmy a produktové tímy, ktoré riešia softvér a pracovné toky.',
    goal: 'Priniesť jeden konkrétny a zdrojovaný pohľad na tému.',
  });
}

function assertPlanningMayDraft(
  request: TopicRequest,
  editorialBrief: EditorialBrief | undefined,
  finalBrief: string,
): void {
  const planningText = [request.topic, request.audience, request.goal, finalBrief]
    .concat(request.allowGenerativeVisuals ? ['Generatívny obrázok'] : [])
    .join('\n');
  const classified = classifyContentBrief(planningText);
  const riskFlags = [
    ...new Set([...classified.riskFlags, ...(editorialBrief?.riskFlags ?? [])]),
  ];
  if (riskFlags.length === 0) return;
  if (!editorialBrief || editorialBrief.approvalState !== 'approved') {
    throw new Error('Risk-flagged planning requires explicit human approval before drafting.');
  }
  const missingFlags = riskFlags.filter(
    flag => !editorialBrief.riskFlags.includes(flag),
  );
  if (missingFlags.length > 0) {
    throw new Error(
      `Human approval must explicitly cover planning risks: ${missingFlags.join(', ')}.`,
    );
  }
}

export class SocialPackOrchestrator {
  constructor(private readonly runner: AgentRunner) {}

  async prepare(input: PreparePackInput): Promise<DraftPack> {
    if (input.sourceDocuments.length < 1) {
      throw new Error('At least one approved public source document is required.');
    }
    const now = input.now ?? new Date();
    const previousCaptions = input.previousCaptions ?? [];
    const { author, critic } = rolesForRun(input.runNumber);
    const topicRequest = planningRequest(input);
    const intake = input.topicRequest ? createEditorialBrief(topicRequest) : undefined;
    const editorialBrief = input.editorialBrief
      ? EditorialBriefSchema.parse(input.editorialBrief)
      : intake?.brief ?? {
          buyerQuestion: 'Aké rozhodnutie má publikum po tomto obsahu urobiť?',
          risePerspective: 'Rise vysvetľuje konkrétne produktové alebo prevádzkové rozhodnutie.',
          businessFit: 'Obsah podporuje dôveru v softvérovú a produktovú expertízu Rise.',
          desiredAction: 'Porovnať vlastnú situáciu a rozhodnúť sa o ďalšom kroku.',
          riskFlags: [],
          approvalState: 'approved' as const,
        };
    const brief = input.brief?.trim() || topicRequest.topic;
    assertPlanningMayDraft(topicRequest, editorialBrief, brief);
    const claimLedger = input.topicRequest
      ? assertLedgerMatchesDocuments(input.claimLedger ?? [], input.sourceDocuments, now)
      : input.claimLedger
        ? assertLedgerMatchesDocuments(input.claimLedger, input.sourceDocuments, now)
        : [];
    const { assetRecords, visualDirections, generationRecipes } = preflightVisualInputs(
      topicRequest,
      editorialBrief,
      input,
    );
    const decision = resolveCampaignDecision(topicRequest, {
      evidenceInsightCount: input.planningSignals?.evidenceInsightCount ?? input.sourceDocuments.length,
      visualClassCount: input.planningSignals?.visualClassCount ?? 0,
      buyerQuestionCount: input.planningSignals?.buyerQuestionCount ?? 0,
    });
    const firstResponse = await this.runner.run(
      author,
      authorPrompt(
        brief,
        input.sourceDocuments,
        previousCaptions,
        decision.postCount,
        editorialBrief,
        decision,
        claimLedger,
        assetRecords,
        visualDirections,
        generationRecipes,
      ),
    );
    const firstDraft = normalizeDraft(
      parseJsonResponse(firstResponse),
      brief,
      author,
      critic,
      now,
      decision.postCount,
    );
    assertGroundedSources(firstDraft, input.sourceDocuments);
    assertDraftMatchesLedger(firstDraft, claimLedger);
    assertCampaignContinuity(firstDraft);
    assertDraftMediaReferences(firstDraft, assetRecords);

    const critiqueResponse = await this.runner.run(
      critic,
      reviewPrompt(firstDraft, input.sourceDocuments, previousCaptions, {
        topicRequest,
        editorialBrief,
        campaignDecision: decision,
        visualDirections,
        assetRecords,
        generationRecipes,
        claimLedger,
      }),
    );
    const firstReview = ReviewReportSchema.parse(parseJsonResponse(critiqueResponse));
    let finalDraft = firstDraft;
    let finalReview = firstReview;

    if (!reviewReportPasses(firstReview)) {
      const finalResponse = await this.runner.run(
        author,
        `Revise the Rise.sk draft once. Return only the complete DraftPack JSON object.
Keep every factual claim grounded in the approved documents. Do not add new source URLs.

Critic issues:
${firstReview.issues.join('\n')}

Revision instruction:
${firstReview.revisionInstructions}

Approved documents:
${sourceBlock(input.sourceDocuments)}

Prior Rise captions:
${priorPostBlock(previousCaptions)}

Current draft:
${JSON.stringify(firstDraft, null, 2)}`,
      );
      finalDraft = normalizeDraft(
        parseJsonResponse(finalResponse),
        brief,
        author,
        critic,
        now,
        decision.postCount,
      );
      assertGroundedSources(finalDraft, input.sourceDocuments);
      assertDraftMatchesLedger(finalDraft, claimLedger);
      assertCampaignContinuity(finalDraft);
      assertDraftMediaReferences(finalDraft, assetRecords);
    }
    const validationResponse = await this.runner.run(
      critic,
      reviewPrompt(finalDraft, input.sourceDocuments, previousCaptions, {
        topicRequest,
        editorialBrief,
        campaignDecision: decision,
        visualDirections,
        assetRecords,
        generationRecipes,
        claimLedger,
      }, 'final-validation'),
    );
    finalReview = ReviewReportSchema.parse(parseJsonResponse(validationResponse));
    if (!reviewReportPasses(finalReview)) {
      throw new Error('Independent review did not approve the final draft with all scores at least 4 and no blocker.');
    }
    const scoredDraft = DraftPackSchema.parse({
      ...finalDraft,
      scorecard: finalReview.scorecard,
      assetRecords,
      workflowContext: {
        topicRequest,
        editorialBrief,
        campaignDecision: decision,
        claimLedger,
        visualDirections,
        assetRights: assetRecords.map(asset => ({
          assetId: asset.id,
          status: asset.rightsStatus,
          reference: asset.rightsReference,
        })),
        cropsRedactions: visualDirections.map(direction => ({
          assetId: direction.assetIds[0],
          crop: direction.crop,
          redactions: assetRecords
            .filter(asset => direction.assetIds.includes(asset.id) && asset.redactionStatus !== 'not-required')
            .map(asset => `${asset.id}:${asset.redactionStatus}`),
        })),
        generationProvenance: generationRecipes,
        firstCritique: firstReview,
        finalValidation: finalReview,
      },
    });
    validateFinalDraft(scoredDraft, input.sourceDocuments, previousCaptions, claimLedger, assetRecords);
    return scoredDraft;
  }
}
