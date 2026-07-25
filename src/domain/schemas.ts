import { z } from 'zod';

export const PlatformSchema = z.enum(['instagram', 'linkedin', 'facebook']);
export type Platform = z.infer<typeof PlatformSchema>;

export const ThemeSchema = z.enum([
  'product-proof',
  'decision-education',
  'growth-system',
  'people-process',
  'signal-noise',
]);
export type Theme = z.infer<typeof ThemeSchema>;

const LegacyThemeSchema = z.enum(['education', 'product', 'human']);
const LEGACY_THEME_PILLARS: Record<z.infer<typeof LegacyThemeSchema>, Theme> = {
  education: 'decision-education',
  product: 'product-proof',
  human: 'people-process',
};

export const ModelSchema = z.enum(['codex', 'claude']);
export type ModelName = z.infer<typeof ModelSchema>;

export const RiskFlagSchema = z.enum([
  'client-result',
  'metric',
  'regulated-topic',
  'competitor',
  'non-public-story',
  'named-person',
  'generative-image',
]);

export const CampaignModeSchema = z.enum(['single', 'auto', 'campaign']);
export type CampaignMode = z.infer<typeof CampaignModeSchema>;

export const TopicRequestSchema = z.object({
  topic: z.string().min(1).max(1_000),
  audience: z.string().min(1).max(500),
  goal: z.string().min(1).max(500),
  mode: CampaignModeSchema.default('single'),
  requestedPostCount: z.number().int().min(1).max(3).optional(),
  projectUrls: z.array(z.url()).max(20).optional(),
  sourceUrls: z.array(z.url()).max(50).optional(),
  allowGenerativeVisuals: z.boolean().default(false),
});
export type TopicRequest = z.infer<typeof TopicRequestSchema>;

export const EditorialBriefSchema = z.object({
  buyerQuestion: z.string().min(1).max(1_000),
  risePerspective: z.string().min(1).max(1_000),
  desiredAction: z.string().min(1).max(500),
  businessFit: z.string().min(1).max(1_000),
  riskFlags: z.array(RiskFlagSchema),
  approvalState: z.enum(['pending', 'approved', 'rejected']),
});
export type EditorialBrief = z.infer<typeof EditorialBriefSchema>;

export const CampaignDecisionSchema = z.object({
  requestedMode: CampaignModeSchema,
  resolvedMode: CampaignModeSchema,
  postCount: z.number().int().min(1).max(3),
  evidenceInsightCount: z.number().int().min(0),
  visualClassCount: z.number().int().min(0),
  buyerQuestionCount: z.number().int().min(0),
  reason: z.string().min(1).max(2_000),
});
export type CampaignDecision = z.infer<typeof CampaignDecisionSchema>;

export const BrandProfileSchema = z.object({
  id: z.string().min(1),
  language: z.literal('sk-SK'),
  voice: z.array(z.string().min(1)).min(3),
  preferredWords: z.array(z.string().min(1)).min(5),
  blockedPhrases: z.array(z.string().min(1)).min(5),
  hashtagVocabulary: z.array(z.string().regex(/^#[\p{L}\p{N}_-]+$/u)).min(5),
  maxEmoji: z.number().int().min(0).max(1),
  firstPersonPlural: z.boolean(),
  formalAddressCapitalized: z.boolean(),
  sourceUrls: z.array(z.url()).min(1),
  updatedAt: z.iso.datetime(),
});
export type BrandProfile = z.infer<typeof BrandProfileSchema>;

export const RISE_BRAND_PROFILE: BrandProfile = BrandProfileSchema.parse({
  id: 'rise-sk-social-v1',
  language: 'sk-SK',
  voice: ['priamy', 'pokojný', 'slušný', 'konkrétny', 'priateľský'],
  preferredWords: [
    'softvér',
    'pracovný tok',
    'dáta',
    'rozhodnutie',
    'zodpovednosť',
    'prevádzka',
    'overiť',
    'postaviť',
    'zjednodušiť',
  ],
  blockedPhrases: [
    'v dnešnej dynamickej dobe',
    's nadšením oznamujeme',
    'revolučný',
    'game-changer',
    'odomknúť potenciál',
    'posunúť na ďalšiu úroveň',
    'nie je to len X, je to Y',
  ],
  hashtagVocabulary: [
    '#softver',
    '#automatizacia',
    '#produkt',
    '#vyvoj',
    '#data',
    '#ai',
    '#grantai',
    '#mojafirma',
    '#rise',
    '#timrise',
  ],
  maxEmoji: 1,
  firstPersonPlural: true,
  formalAddressCapitalized: true,
  sourceUrls: ['https://rise.sk', 'https://rise.sk/o-nas', 'https://rise.sk/blog'],
  updatedAt: '2026-07-24T00:00:00.000Z',
});

export const ContentBriefSchema = z.object({
  problem: z.string().min(1).max(1_000),
  audience: z.string().min(1).max(500),
  objective: z.string().min(1).max(500),
  riskLevel: z.enum(['low', 'medium', 'high']),
  riskFlags: z.array(RiskFlagSchema),
  requiresBriefApproval: z.boolean(),
  approvedAt: z.iso.datetime().optional(),
});
export type ContentBrief = z.infer<typeof ContentBriefSchema>;

export const PriorPostSchema = z.object({
  id: z.string().min(1),
  platform: PlatformSchema,
  caption: z.string().min(1).max(5_000),
  opening: z.string().min(1).max(500),
  publishedAt: z.iso.datetime().optional(),
  sourceUrl: z.url().optional(),
  importedAt: z.iso.datetime(),
});
export type PriorPost = z.infer<typeof PriorPostSchema>;

export const SourceEvidenceSchema = z.object({
  id: z.string().min(1),
  url: z.url(),
  title: z.string().min(1),
  publisher: z.string().min(1),
  checkedAt: z.iso.datetime(),
  claim: z.string().min(1),
  excerpt: z.string().min(1).optional(),
});
export type SourceEvidence = z.infer<typeof SourceEvidenceSchema>;

export const ClaimEvidenceSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  sourceUrl: z.url(),
  claim: z.string().min(1).max(1_000),
  evidence: z.string().min(1).max(2_000),
  checkedAt: z.iso.datetime(),
  risk: z.enum(['stable', 'current', 'fast-moving']).optional(),
  expiresAt: z.iso.datetime().optional(),
});
export type ClaimEvidence = z.infer<typeof ClaimEvidenceSchema>;

export const ClaimLedgerEntrySchema = ClaimEvidenceSchema.extend({
  risk: z.enum(['stable', 'current', 'fast-moving']),
  expiresAt: z.iso.datetime(),
});
export type ClaimLedgerEntry = z.infer<typeof ClaimLedgerEntrySchema>;

export const EditorialScorecardSchema = z.object({
  factualAccuracy: z.number().int().min(0).max(5),
  voice: z.number().int().min(0).max(5),
  specificity: z.number().int().min(0).max(5),
  continuity: z.number().int().min(0).max(5),
  visualClarity: z.number().int().min(0).max(5),
  businessFit: z.number().int().min(0).max(5),
  passed: z.boolean(),
  notes: z.array(z.string().min(1)),
});
export type EditorialScorecard = z.infer<typeof EditorialScorecardSchema>;

export const ReviewReportSchema = z.object({
  approved: z.boolean(),
  blocker: z.boolean(),
  issues: z.array(z.string()),
  revisionInstructions: z.string(),
  scorecard: EditorialScorecardSchema,
});
export type ReviewReport = z.infer<typeof ReviewReportSchema>;

export function reviewReportPasses(review: ReviewReport): boolean {
  const scores = [
    review.scorecard.factualAccuracy,
    review.scorecard.voice,
    review.scorecard.specificity,
    review.scorecard.continuity,
    review.scorecard.visualClarity,
    review.scorecard.businessFit,
  ];
  return review.approved && !review.blocker && review.scorecard.passed && scores.every(score => score >= 4);
}

export const CarouselSlideSchema = z.object({
  id: z.string().min(1),
  eyebrow: z.string().max(32),
  title: z.string().min(1).max(90),
  body: z.string().min(1).max(240),
  alt: z.string().min(1).max(300),
  claimIds: z.array(z.string().min(1)).min(1),
  imagePath: z.string().min(1).optional(),
  assetId: z.string().min(1).optional(),
  visualLayout: z
    .enum(['image-detail', 'diagram', 'calm-text', 'full-bleed', 'split-detail'])
    .optional(),
});
export type CarouselSlide = z.infer<typeof CarouselSlideSchema>;

export const PlatformPostSchema = z.object({
  platform: PlatformSchema,
  caption: z.string().min(1).max(3_000),
  altText: z.string().min(1).max(1_000),
  scheduledFor: z.iso.datetime(),
  claimIds: z.array(z.string().min(1)).min(1),
  link: z.url().optional(),
});
export type PlatformPost = z.infer<typeof PlatformPostSchema>;

const PlatformVariantsSchema = z
  .object({
    instagram: PlatformPostSchema,
    linkedin: PlatformPostSchema,
    facebook: PlatformPostSchema,
  })
  .superRefine((value, context) => {
    for (const [platform, post] of Object.entries(value)) {
      if (post.platform !== platform) {
        context.addIssue({
          code: 'custom',
          message: `Platform variant ${platform} must declare platform ${platform}.`,
          path: [platform, 'platform'],
        });
      }
    }
  });

export const PostConceptSchema = z.object({
  id: z.string().min(1),
  theme: ThemeSchema,
  title: z.string().min(1).max(100),
  summary: z.string().min(1).max(300),
  opening: z.string().min(1).max(500).optional(),
  promise: z.string().min(1).max(500).optional(),
  core: z.string().min(1).max(1_000).optional(),
  sourceIds: z.array(z.string().min(1)).min(1),
  claimIds: z.array(z.string().min(1)).min(1),
  visualKind: z.enum(['product-screenshot', 'team-photo', 'branded-diagram']),
  project: z.string().min(1).max(500).optional(),
  carouselTemplate: z
    .enum(['product-anatomy', 'decision-note', 'before-after', 'signal-noise'])
    .optional(),
  slides: z.array(CarouselSlideSchema).min(4).max(8),
  platforms: PlatformVariantsSchema,
});
export type PostConcept = z.infer<typeof PostConceptSchema>;

const AssetRecordBaseSchema = z
  .object({
  id: z.string().min(1),
  visualClass: z.enum([
    'product-screenshot',
    'screen-recording',
    'team-photo',
    'branded-diagram',
    'data-visual',
    'new-documentation',
    'generated-illustration',
  ]),
  origin: z.enum(['rise-owned', 'client-approved', 'public-licensed', 'generated']),
  owner: z.string().min(1).max(500),
  license: z.enum(['owned', 'client-approved', 'cc-by', 'stock-licensed', 'public-domain']),
  project: z.string().min(1).max(500),
  confidentiality: z.enum(['public', 'approval-required', 'confidential']),
  allowedPlatforms: z.array(PlatformSchema),
  // Deprecated input retained for migration only. New records use
  // redactionStatus, whose completed state carries its own timestamp.
  requiresRedaction: z.boolean().optional(),
  redactionCompletedAt: z.iso.datetime().optional(),
  redactionStatus: z.enum(['not-required', 'pending', 'completed']),
  sourceUrl: z.url().optional(),
  path: z.string().min(1).optional(),
  contentSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  approved: z.boolean(),
  rightsNote: z.string().min(1).max(1_000).optional(),
  rightsEvidence: z.string().min(1).max(1_000).optional(),
  rightsStatus: z.enum(['needs-confirmation', 'confirmed']),
  rightsConfirmedAt: z.iso.datetime().optional(),
  rightsConfirmedBy: z.string().min(1).max(500).optional(),
  rightsReference: z.string().min(1).max(1_000).optional(),
  qualityNote: z.string().min(1).max(1_000).optional(),
  aiEdited: z.boolean().optional(),
  requiresVisualApproval: z.boolean().optional(),
  })
  .superRefine((asset, context) => {
    if (asset.redactionStatus === 'completed' && !asset.redactionCompletedAt) {
      context.addIssue({ code: 'custom', message: 'Completed redaction requires redactionCompletedAt.', path: ['redactionCompletedAt'] });
    }
    if (asset.redactionStatus !== 'completed' && asset.redactionCompletedAt) {
      context.addIssue({ code: 'custom', message: 'Only completed redaction may record redactionCompletedAt.', path: ['redactionCompletedAt'] });
    }
    if (asset.rightsStatus === 'confirmed' && !asset.rightsReference && (!asset.rightsConfirmedAt || !asset.rightsConfirmedBy)) {
      context.addIssue({ code: 'custom', message: 'Confirmed rights require a reference or timestamped approver.', path: ['rightsStatus'] });
    }
  });

export const AssetRecordSchema = z.preprocess(
  value => {
    if (!value || typeof value !== 'object') return value;
    const raw = value as Record<string, unknown>;
    return {
      ...raw,
      redactionStatus:
        raw.redactionStatus ?? (raw.requiresRedaction === true ? 'pending' : 'not-required'),
      rightsStatus: raw.rightsStatus ?? 'needs-confirmation',
    };
  },
  AssetRecordBaseSchema,
);
export type AssetRecord = z.infer<typeof AssetRecordSchema>;

export const VisualDirectionSchema = z.object({
  id: z.string().min(1).max(500).optional(),
  visualClass: AssetRecordBaseSchema.shape.visualClass,
  rationale: z.string().min(1).max(1_000),
  narrative: z.string().min(1).max(2_000),
  layout: z.string().min(1).max(500),
  assetIds: z.array(z.string().min(1)).min(1).max(20),
  crop: z.string().min(1).max(500),
  safeZones: z.array(z.string().min(1)).min(1).max(10),
  allowGenerativeVisuals: z.boolean(),
});
export type VisualDirection = z.infer<typeof VisualDirectionSchema>;

export const GenerationRecipeSchema = z.object({
  visualDirectionId: z.string().min(1),
  model: z.string().min(1).max(500),
  playbookVersion: z.literal('rise-visual-generation-v1').optional(),
  prompt: z.string().min(1).max(4_000),
  negativePrompt: z.string().max(2_000).optional(),
  sourceUrls: z.array(z.url()).max(20).default([]),
  project: z.string().min(1).max(500).optional(),
  projectSourceUrl: z.url().optional(),
  referenceAssetIds: z.array(z.string().min(1)).max(20),
  referenceRoles: z
    .array(
      z.object({
        assetId: z.string().min(1),
        role: z.enum([
          'content-evidence',
          'protected-ui',
          'composition-reference',
          'abstract-style-reference',
        ]),
        preserve: z.string().min(1).max(1_000),
      }),
    )
    .max(20)
    .default([]),
  parameters: z.record(z.string(), z.unknown()),
  disclosure: z.string().min(1).max(1_000),
  generatedAt: z.iso.datetime(),
  generationApproved: z.literal(true),
  generationApprovedAt: z.iso.datetime(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  platform: PlatformSchema.optional(),
  crop: z.string().min(1).max(500).optional(),
  altText: z.string().min(1).max(1_000).optional(),
  allowGenerativeVisuals: z.literal(true),
  subject: z.enum(['abstract', 'editorial-material']).optional(),
});
export type GenerationRecipe = z.infer<typeof GenerationRecipeSchema>;

/**
 * Evidence displayed to the human reviewer. It is intentionally part of a draft
 * so the approval digest changes after a visual, crop, rights or provenance edit.
 */
export const WorkflowContextSchema = z.object({
  topicRequest: TopicRequestSchema.optional(),
  editorialBrief: EditorialBriefSchema.optional(),
  campaignDecision: CampaignDecisionSchema.optional(),
  claimLedger: z.array(ClaimLedgerEntrySchema).default([]),
  visualDirections: z.array(VisualDirectionSchema).default([]),
  assetRights: z
    .array(
      z.object({
        assetId: z.string().min(1),
        status: z.enum(['needs-confirmation', 'confirmed']),
        reference: z.string().min(1).optional(),
      }),
    )
    .default([]),
  cropsRedactions: z
    .array(
      z.object({
        assetId: z.string().min(1),
        crop: z.string().min(1),
        redactions: z.array(z.string().min(1)),
      }),
    )
    .default([]),
  visualQaFindings: z
    .array(
      z.object({
        visualDirectionId: z.string().min(1),
        status: z.enum(['pass', 'fail', 'manual-review']),
        findings: z.array(z.string().min(1)),
        altTextPassed: z.boolean(),
        cropPassed: z.boolean(),
        humanInspectionRequired: z.boolean(),
      }),
    )
    .optional(),
  generationProvenance: z.array(GenerationRecipeSchema).default([]),
  firstCritique: ReviewReportSchema.optional(),
  finalValidation: ReviewReportSchema.optional(),
});
export type WorkflowContext = z.infer<typeof WorkflowContextSchema>;

function defaultContentBrief(rawBrief: unknown): ContentBrief {
  const brief =
    typeof rawBrief === 'string' && rawBrief.trim()
      ? rawBrief.trim()
      : 'Vybrať jednu konkrétnu tému z povolených verejných zdrojov.';
  return {
    problem: brief,
    audience: 'Firmy a produktové tímy, ktoré riešia softvér a pracovné toky.',
    objective: 'Priniesť jeden konkrétny a zdrojovaný pohľad na tému.',
    riskLevel: 'low',
    riskFlags: [],
    requiresBriefApproval: false,
  };
}

function migrateDraftPack(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const raw = structuredClone(value) as Record<string, unknown>;
  const sources = Array.isArray(raw.sources)
    ? (raw.sources as Array<Record<string, unknown>>)
    : [];
  const claims =
    Array.isArray(raw.claims) && raw.claims.length > 0
      ? raw.claims
      : sources.map(source => ({
          id: `claim-${String(source.id)}`,
          sourceId: source.id,
          sourceUrl: source.url,
          claim: source.claim,
          evidence: source.excerpt ?? source.claim,
          checkedAt: source.checkedAt,
        }));
  const claimBySource = new Map(
    (claims as Array<Record<string, unknown>>).map(claim => [
      String(claim.sourceId),
      String(claim.id),
    ]),
  );
  const posts = Array.isArray(raw.posts)
    ? raw.posts.map(postValue => {
        if (!postValue || typeof postValue !== 'object') return postValue;
        const post = postValue as Record<string, unknown>;
        const sourceIds = Array.isArray(post.sourceIds) ? post.sourceIds.map(String) : [];
        const claimIds =
          Array.isArray(post.claimIds) && post.claimIds.length > 0
            ? post.claimIds.map(String)
            : sourceIds.map(sourceId => claimBySource.get(sourceId)).filter(Boolean);
        const slides = Array.isArray(post.slides)
          ? post.slides.map(slide =>
              slide && typeof slide === 'object'
                ? {
                    ...(slide as Record<string, unknown>),
                    claimIds:
                      Array.isArray((slide as Record<string, unknown>).claimIds) &&
                      ((slide as Record<string, unknown>).claimIds as unknown[]).length > 0
                        ? (slide as Record<string, unknown>).claimIds
                        : claimIds,
                  }
                : slide,
            )
          : post.slides;
        const platforms =
          post.platforms && typeof post.platforms === 'object'
            ? Object.fromEntries(
                Object.entries(post.platforms as Record<string, unknown>).map(
                  ([platform, variant]) => [
                    platform,
                    variant && typeof variant === 'object'
                      ? {
                          ...(variant as Record<string, unknown>),
                          claimIds:
                            Array.isArray((variant as Record<string, unknown>).claimIds) &&
                            ((variant as Record<string, unknown>).claimIds as unknown[]).length > 0
                              ? (variant as Record<string, unknown>).claimIds
                              : claimIds,
                        }
                      : variant,
                  ],
                ),
              )
            : post.platforms;
        const theme = LegacyThemeSchema.safeParse(post.theme);
        return {
          ...post,
          theme: theme.success ? LEGACY_THEME_PILLARS[theme.data] : post.theme,
          claimIds,
          slides,
          platforms,
        };
      })
    : raw.posts;
  return {
    ...raw,
    schemaVersion: 2,
    brandProfile: raw.brandProfile ?? RISE_BRAND_PROFILE,
    contentBrief: raw.contentBrief ?? defaultContentBrief(raw.brief),
    priorPosts: raw.priorPosts ?? [],
    claims,
    assetRecords: raw.assetRecords ?? [],
    scorecard:
      raw.scorecard && typeof raw.scorecard === 'object'
        ? { ...(raw.scorecard as Record<string, unknown>), businessFit: (raw.scorecard as Record<string, unknown>).businessFit ?? 0 }
        : {
            factualAccuracy: 0,
            voice: 0,
            specificity: 0,
            continuity: 0,
            visualClarity: 0,
            businessFit: 0,
            passed: false,
            notes: ['Čaká na deterministickú a ľudskú kontrolu.'],
          },
    posts,
  };
}

const DraftPackV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    brief: z.string().max(2_000),
    generatedAt: z.iso.datetime(),
    author: ModelSchema,
    critic: ModelSchema,
    warnings: z.array(z.string()),
    brandProfile: BrandProfileSchema,
    contentBrief: ContentBriefSchema,
    priorPosts: z.array(PriorPostSchema),
    sources: z.array(SourceEvidenceSchema).min(1),
    claims: z.array(ClaimEvidenceSchema).min(1),
    assetRecords: z.array(AssetRecordSchema).default([]),
    workflowContext: WorkflowContextSchema.optional(),
    scorecard: EditorialScorecardSchema,
    posts: z.array(PostConceptSchema).min(1).max(3),
  })
  .superRefine((draft, context) => {
    const themes = new Set(draft.posts.map(post => post.theme));
    if (themes.size !== draft.posts.length) {
      context.addIssue({
        code: 'custom',
        message: 'Posts must use distinct editorial pillars.',
        path: ['posts'],
      });
    }
    if (draft.author === draft.critic) {
      context.addIssue({
        code: 'custom',
        message: 'Author and critic must be different models.',
        path: ['critic'],
      });
    }
    const sourceIds = new Set(draft.sources.map(source => source.id));
    const sourceById = new Map(draft.sources.map(source => [source.id, source]));
    const claimIds = new Set(draft.claims.map(claim => claim.id));
    for (const [claimIndex, claim] of draft.claims.entries()) {
      if (!sourceIds.has(claim.sourceId)) {
        context.addIssue({
          code: 'custom',
          message: `Claim references unknown source "${claim.sourceId}".`,
          path: ['claims', claimIndex, 'sourceId'],
        });
      }
      const source = sourceById.get(claim.sourceId);
      if (source && claim.sourceUrl !== source.url) {
        context.addIssue({
          code: 'custom',
          message: `Claim source URL must match source "${claim.sourceId}".`,
          path: ['claims', claimIndex, 'sourceUrl'],
        });
      }
      if (source && claim.checkedAt !== source.checkedAt) {
        context.addIssue({
          code: 'custom',
          message: `Claim checked date must match source "${claim.sourceId}".`,
          path: ['claims', claimIndex, 'checkedAt'],
        });
      }
    }
    for (const [postIndex, post] of draft.posts.entries()) {
      const references = [
        ...post.claimIds,
        ...post.slides.flatMap(slide => slide.claimIds),
        ...Object.values(post.platforms).flatMap(variant => variant.claimIds),
      ];
      for (const claimId of references) {
        if (!claimIds.has(claimId)) {
          context.addIssue({
            code: 'custom',
            message: `Post references unknown claim "${claimId}".`,
            path: ['posts', postIndex, 'claimIds'],
          });
        }
      }
    }
  });

export const DraftPackSchema = z.preprocess(migrateDraftPack, DraftPackV2Schema);
export type DraftPack = z.infer<typeof DraftPackSchema>;

export const VisualAssetSchema = z.object({
  id: z.string().min(1),
  postId: z.string().min(1),
  platform: PlatformSchema,
  kind: z.enum(['slide', 'cover', 'document']),
  path: z.string().min(1),
  mimeType: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export type VisualAsset = z.infer<typeof VisualAssetSchema>;

export const ApprovalEnvelopeSchema = z.object({
  runId: z.string().min(1),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  approvedAt: z.iso.datetime(),
  action: z.enum(['export', 'schedule']),
  revision: z.number().int().positive(),
});
export type ApprovalEnvelope = z.infer<typeof ApprovalEnvelopeSchema>;

export const RemotePostReceiptSchema = z.object({
  postId: z.string().min(1),
  platform: PlatformSchema,
  remoteId: z.string().min(1),
  status: z.enum(['draft', 'scheduled', 'failed']),
  scheduledFor: z.iso.datetime(),
  error: z.string().optional(),
});

export const MediaCleanupItemSchema = z.object({
  postId: z.string().min(1),
  publicId: z.string().min(1),
  resourceType: z.enum(['image', 'raw']),
  deleteAfter: z.iso.datetime(),
  status: z.enum(['pending', 'deleted', 'error']),
  deletedAt: z.iso.datetime().optional(),
  error: z.string().optional(),
});

export const PublishReceiptSchema = z.object({
  runId: z.string().min(1),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  attemptedAt: z.iso.datetime(),
  status: z.enum(['drafted', 'scheduled', 'partial', 'failed']),
  remotes: z.array(RemotePostReceiptSchema),
  mediaCleanup: z.array(MediaCleanupItemSchema).optional(),
});
export type PublishReceipt = z.infer<typeof PublishReceiptSchema>;

export const BoardLinkSchema = z.preprocess(
  value => {
    if (!value || typeof value !== 'object') return value;
    const raw = value as Record<string, unknown>;
    const issueNumber =
      typeof raw.issueNumber === 'number' && Number.isInteger(raw.issueNumber)
        ? raw.issueNumber
        : undefined;
    const provider =
      raw.provider ??
      (typeof raw.issueUrl === 'string' && raw.issueUrl.includes('github.com')
        ? 'github'
        : 'youtrack');
    return {
      ...raw,
      provider,
      issueId: raw.issueId ?? (issueNumber ? String(issueNumber) : undefined),
      boardUrl: raw.boardUrl ?? raw.projectUrl,
    };
  },
  z.object({
    provider: z.enum(['youtrack', 'github']),
    issueId: z.string().min(1),
    issueNumber: z.number().int().positive().optional(),
    issueUrl: z.url(),
    boardUrl: z.url().optional(),
    projectUrl: z.url().optional(),
  }),
);
export type BoardLink = z.infer<typeof BoardLinkSchema>;

export const BoardSyncReceiptSchema = z.object({
  runId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  status: z.enum(['pending', 'synced', 'partial']),
  attemptedAt: z.iso.datetime(),
  dryRun: z.boolean(),
  error: z.string().optional(),
});
export type BoardSyncReceipt = z.infer<typeof BoardSyncReceiptSchema>;

export const ArchiveManifestSchema = z.object({
  runId: z.string().min(1),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  archivedAt: z.iso.datetime(),
  revision: z.number().int().positive(),
  approvedOnly: z.literal(true),
  files: z.array(z.string().min(1)),
});
export type ArchiveManifest = z.infer<typeof ArchiveManifestSchema>;

export const ContentRunSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    'draft',
    'needs_changes',
    'approved',
    'exported',
    'archived',
    'scheduled',
    'partial',
  ]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  revision: z.number().int().positive(),
  qualifiedConversations: z.number().int().nonnegative(),
  feedback: z.string().max(4_000).optional(),
  draft: DraftPackSchema,
  approval: ApprovalEnvelopeSchema.optional(),
  publishReceipt: PublishReceiptSchema.optional(),
  boardLink: BoardLinkSchema.optional(),
  boardSync: BoardSyncReceiptSchema.optional(),
  archiveManifest: ArchiveManifestSchema.optional(),
});
export type ContentRun = z.infer<typeof ContentRunSchema>;
