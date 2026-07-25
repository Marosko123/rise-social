import { z } from 'zod';

import { PlatformSchema } from '@/domain/schemas';
import { RISE_ASSET_CATALOG } from '@/visuals/assetCatalogData';

export const ContentPillarSchema = z.enum([
  'product-proof',
  'decision-education',
  'growth-system',
  'people-process',
  'signal-noise',
]);
export type ContentPillar = z.infer<typeof ContentPillarSchema>;

export const ContentSeriesSchema = z.enum([
  'inside-build',
  'decision-notes',
  'growth-system',
  'people-behind-product',
  'signal-vs-noise',
]);
export type ContentSeries = z.infer<typeof ContentSeriesSchema>;

export const VisualTemplateSchema = z.enum([
  'product-anatomy',
  'decision-note',
  'before-after',
  'signal-noise',
  'human-video',
]);
export type VisualTemplate = z.infer<typeof VisualTemplateSchema>;

export const DisclosureLevelSchema = z.enum([
  'public-owned',
  'public-case-study',
  'approval-required',
  'confidential-anonymized',
]);
export type DisclosureLevel = z.infer<typeof DisclosureLevelSchema>;

export const ContentVisualKindSchema = z.enum([
  'real-ui',
  'ui-flow',
  'branded-diagram',
  'before-after',
  'team-photo',
  'trend-diagram',
  'public-composite',
  'anonymous-editorial',
]);
export type ContentVisualKind = z.infer<typeof ContentVisualKindSchema>;

const ASSET_VISUAL_COMPATIBILITY: Record<
  ContentVisualKind,
  ReadonlyArray<
    (typeof RISE_ASSET_CATALOG.assets)[number]['visualClass']
  >
> = {
  'real-ui': ['product-screenshot', 'screen-recording'],
  'ui-flow': ['product-screenshot', 'screen-recording', 'branded-diagram'],
  'branded-diagram': ['branded-diagram'],
  'before-after': ['product-screenshot', 'screen-recording'],
  'team-photo': ['team-photo', 'screen-recording'],
  'trend-diagram': [
    'branded-diagram',
    'data-visual',
    'generated-illustration',
  ],
  'public-composite': [
    'product-screenshot',
    'branded-diagram',
    'generated-illustration',
  ],
  'anonymous-editorial': [
    'branded-diagram',
    'generated-illustration',
    'new-documentation',
  ],
};

export const ProjectDisclosureProfileSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    level: DisclosureLevelSchema,
    publicUrl: z.url(),
    allowedClaimIds: z.array(z.string().min(1)).min(1).default([]),
    allowedClaims: z.array(z.string().min(1)).min(1),
    allowedVisuals: z.array(ContentVisualKindSchema).min(1),
    prohibited: z.array(z.string().min(1)).min(1),
    requiresBriefApproval: z.boolean(),
    requiresVisualApproval: z.boolean(),
    note: z.string().min(1).optional(),
  })
  .superRefine((project, context) => {
    if (
      project.level === 'confidential-anonymized' &&
      project.allowedVisuals.includes('real-ui')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['allowedVisuals'],
        message: 'Confidential projects cannot allow real UI.',
      });
    }
  });
export type ProjectDisclosureProfile = z.infer<
  typeof ProjectDisclosureProfileSchema
>;

export const TrendEvidenceSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    url: z.url(),
    publisher: z.string().min(1),
    sourceKind: z.enum(['primary', 'vendor-study']),
    publishedAt: z.iso.datetime(),
    checkedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    scope: z.string().min(1),
  })
  .superRefine((evidence, context) => {
    if (Date.parse(evidence.expiresAt) <= Date.parse(evidence.checkedAt)) {
      context.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Trend evidence expiry must be after its checked date.',
      });
    }
  });
export type TrendEvidence = z.infer<typeof TrendEvidenceSchema>;

export function isTrendEvidenceFresh(
  evidence: TrendEvidence,
  now = new Date(),
): boolean {
  return now.getTime() <= Date.parse(evidence.expiresAt);
}

export const VisualBriefSchema = z
  .object({
    kind: ContentVisualKindSchema,
    sourceType: z.enum([
      'rise-public-asset',
      'public-live-product',
      'original-diagram',
      'original-photo',
      'external-primary-source',
    ]),
    sourceAsset: z.string().min(1),
    altText: z.string().min(1).max(500),
    redactions: z.array(z.string().min(1)),
    aiEdited: z.boolean(),
    requiresVisualApproval: z.boolean(),
    cropNote: z.string().min(1).optional(),
  })
  .superRefine((visual, context) => {
    if (visual.aiEdited && !visual.requiresVisualApproval) {
      context.addIssue({
        code: 'custom',
        path: ['requiresVisualApproval'],
        message: 'AI-edited imagery requires explicit visual approval.',
      });
    }
  });
export type VisualBrief = z.infer<typeof VisualBriefSchema>;

export const ContentPlanClaimSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['verified-fact', 'rise-opinion', 'proposed-interpretation']),
  claim: z.string().min(1),
  evidence: z.string().min(1),
  sourceUrl: z.url(),
  checkedAt: z.iso.datetime(),
  scope: z.string().min(1),
});
export type ContentPlanClaim = z.infer<typeof ContentPlanClaimSchema>;

const PlatformDeliverySchema = z.object({
  platform: PlatformSchema,
  format: z.string().min(1),
  assetCount: z.number().int().min(1).max(8),
  copyRule: z.string().min(1),
  linkObjective: z.enum(['none', 'source', 'case-study', 'portfolio']),
});

const PlatformDeliveriesSchema = z
  .object({
    instagram: PlatformDeliverySchema,
    linkedin: PlatformDeliverySchema,
    facebook: PlatformDeliverySchema,
  })
  .superRefine((deliveries, context) => {
    for (const [platform, delivery] of Object.entries(deliveries)) {
      if (delivery.platform !== platform) {
        context.addIssue({
          code: 'custom',
          path: [platform, 'platform'],
          message: `Delivery ${platform} must declare platform ${platform}.`,
        });
      }
    }
  });

export const ContentCalendarEntrySchema = z.object({
  id: z.string().min(1),
  publishOn: z.iso.date(),
  week: z.number().int().min(1).max(12),
  slot: z.enum(['main', 'secondary']),
  rolloutPhase: z.enum(['pilot', 'rollout']),
  pillar: ContentPillarSchema,
  series: ContentSeriesSchema,
  title: z.string().min(1).max(120),
  businessGoal: z.string().min(1).max(500),
  buyerQuestion: z.string().min(1).max(500),
  risePerspective: z.string().min(1).max(700),
  projectIds: z.array(z.string().min(1)),
  projectClaimMode: z
    .enum(['direct', 'registry-synthesis'])
    .default('direct'),
  trendIds: z.array(z.string().min(1)),
  claimIds: z.array(z.string().min(1)).min(1),
  visualTemplate: VisualTemplateSchema,
  selectedAssetClass: ContentVisualKindSchema,
  specificVisualBrief: z.string().min(40).max(1_500),
  assetSelection: z
    .object({
      assetIds: z.array(z.string().min(1)).max(20),
      status: z.enum([
        'owned-preview',
        'rights-checkpoint',
        'capture-required',
        'original-diagram',
      ]),
      note: z.string().min(1).max(1_000),
    })
    .superRefine((selection, context) => {
      if (
        ['owned-preview', 'rights-checkpoint'].includes(selection.status) &&
        selection.assetIds.length === 0
      ) {
        context.addIssue({
          code: 'custom',
          path: ['assetIds'],
          message: `${selection.status} requires at least one catalog asset ID.`,
        });
      }
      if (
        selection.status === 'capture-required' &&
        selection.assetIds.length > 0
      ) {
        context.addIssue({
          code: 'custom',
          path: ['assetIds'],
          message: 'Capture-required directions cannot claim an existing asset.',
        });
      }
      if (
        selection.status === 'original-diagram' &&
        selection.assetIds.length > 0
      ) {
        context.addIssue({
          code: 'custom',
          path: ['assetIds'],
          message:
            'Original diagrams cannot claim a real catalog asset as their source.',
        });
      }
    }),
  visual: VisualBriefSchema,
  riskLevel: z.enum(['low', 'medium', 'high']),
  approvalNote: z.string().min(1),
  cta: z.string().min(1).max(300),
  platforms: PlatformDeliveriesSchema,
});
export type ContentCalendarEntry = z.infer<typeof ContentCalendarEntrySchema>;

const ContentPillarDefinitionSchema = z.object({
  id: ContentPillarSchema,
  label: z.string().min(1),
  targetPercent: z.number().int().min(1).max(100),
  description: z.string().min(1),
});

const ContentSeriesDefinitionSchema = z.object({
  id: ContentSeriesSchema,
  label: z.string().min(1),
  description: z.string().min(1),
});

const ContentWeekSchema = z.object({
  number: z.number().int().min(1).max(12),
  phase: z.enum(['pilot', 'rollout']),
  label: z.string().min(1),
  mainEntryId: z.string().min(1),
  secondaryEntryId: z.string().min(1),
});

const ChannelRoleSchema = z.object({
  platform: PlatformSchema,
  role: z.string().min(1),
  evidenceFormat: z.string().min(1),
  successSignal: z.string().min(1),
});

const ProfileFoundationItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(['prepared', 'manual-action', 'needs-verification']),
  note: z.string().min(1),
});

const KpiDefinitionSchema = z.object({
  category: z.enum(['quality', 'attention', 'interest', 'business']),
  label: z.string().min(1),
  metrics: z.array(z.string().min(1)).min(1),
  interpretation: z.string().min(1),
});

export const ContentPlanSchema = z
  .object({
    id: z.string().min(1),
    objective: z.literal('brand-awareness'),
    audience: z.string().min(1),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
    updatedAt: z.iso.datetime(),
    projectRegistryCheckedAt: z.iso.date(),
    pillars: z.array(ContentPillarDefinitionSchema).length(5),
    series: z.array(ContentSeriesDefinitionSchema).length(5),
    weeks: z.array(ContentWeekSchema).length(12),
    channelRoles: z.array(ChannelRoleSchema).length(3),
    profileFoundation: z.array(ProfileFoundationItemSchema).length(6),
    cadence: z.object({
      masterPostsPerWeek: z.literal(2),
      linkedin: z.string().min(1),
      instagram: z.string().min(1),
      facebook: z.string().min(1),
      verticalVideo: z.string().min(1),
    }),
    kpis: z.array(KpiDefinitionSchema).length(4),
    decisionRules: z.array(z.string().min(1)).length(3),
    projects: z.array(ProjectDisclosureProfileSchema).length(11),
    trends: z.array(TrendEvidenceSchema).min(4),
    claims: z.array(ContentPlanClaimSchema).min(12),
    entries: z.array(ContentCalendarEntrySchema).length(24),
  })
  .superRefine((plan, context) => {
    const projectIds = new Set(plan.projects.map(project => project.id));
    const trendIds = new Set(plan.trends.map(trend => trend.id));
    const claimIds = new Set(plan.claims.map(claim => claim.id));
    const claimById = new Map(plan.claims.map(claim => [claim.id, claim]));
    const projectById = new Map(plan.projects.map(project => [project.id, project]));
    const canonicalAssetById = new Map(
      RISE_ASSET_CATALOG.assets.map(asset => [asset.id, asset]),
    );
    const entryIds = new Set<string>();
    const dates = new Set<string>();
    const pillarCounts: Record<ContentPillar, number> = {
      'product-proof': 0,
      'decision-education': 0,
      'growth-system': 0,
      'people-process': 0,
      'signal-noise': 0,
    };

    for (const [index, entry] of plan.entries.entries()) {
      pillarCounts[entry.pillar] += 1;
      if (entryIds.has(entry.id)) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index, 'id'],
          message: `Duplicate entry id "${entry.id}".`,
        });
      }
      entryIds.add(entry.id);
      if (dates.has(entry.publishOn)) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index, 'publishOn'],
          message: `Duplicate publishing date "${entry.publishOn}".`,
        });
      }
      dates.add(entry.publishOn);

      if (entry.publishOn < plan.startsOn || entry.publishOn > plan.endsOn) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index, 'publishOn'],
          message: 'Entry falls outside the content-plan window.',
        });
      }
      for (const projectId of entry.projectIds) {
        if (!projectIds.has(projectId)) {
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'projectIds'],
            message: `Unknown project "${projectId}".`,
          });
        }
      }
      for (const trendId of entry.trendIds) {
        if (!trendIds.has(trendId)) {
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'trendIds'],
            message: `Unknown trend "${trendId}".`,
          });
        }
      }
      for (const claimId of entry.claimIds) {
        if (!claimIds.has(claimId)) {
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'claimIds'],
            message: `Unknown claim "${claimId}".`,
          });
        }
      }

      const isDesignatedRegistrySynthesis =
        entry.id === 'w12-project-synthesis' &&
        entry.week === 12 &&
        entry.slot === 'main' &&
        entry.rolloutPhase === 'rollout';
      if (
        entry.projectClaimMode === 'registry-synthesis' &&
        !isDesignatedRegistrySynthesis
      ) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index, 'projectClaimMode'],
          message:
            'Registry synthesis is valid only for the designated week-12 synthesis entry.',
        });
      }
      if (
        entry.id === 'w12-project-synthesis' &&
        !isDesignatedRegistrySynthesis
      ) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index],
          message:
            'The designated week-12 synthesis entry must remain the rollout main slot.',
        });
      }

      const selectedAssets = entry.assetSelection.assetIds.flatMap(assetId => {
        const asset = canonicalAssetById.get(assetId);
        if (!asset) {
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'assetSelection', 'assetIds'],
            message: `Unknown catalog asset "${assetId}".`,
          });
          return [];
        }
        return [asset];
      });
      const entryProjectNames = new Set(
        entry.projectIds
          .map(projectId => projectById.get(projectId)?.name)
          .filter((name): name is string => Boolean(name)),
      );
      const plannedPlatforms = Object.values(entry.platforms).map(
        delivery => delivery.platform,
      );

      for (const asset of selectedAssets) {
        if (!entryProjectNames.has(asset.project)) {
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'assetSelection', 'assetIds'],
            message: `Catalog asset "${asset.id}" is not compatible with the entry projects.`,
          });
        }
        if (
          !ASSET_VISUAL_COMPATIBILITY[entry.selectedAssetClass].includes(
            asset.visualClass,
          )
        ) {
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'selectedAssetClass'],
            message: `Catalog asset "${asset.id}" does not match selected visual kind "${entry.selectedAssetClass}".`,
          });
        }

        if (entry.assetSelection.status === 'owned-preview') {
          const fullyPermitted =
            asset.origin === 'rise-owned' &&
            asset.rightsStatus === 'confirmed' &&
            asset.confidentiality === 'public' &&
            asset.redactionStatus === 'not-required' &&
            asset.approved &&
            !asset.requiresVisualApproval &&
            plannedPlatforms.every(platform =>
              asset.allowedPlatforms.includes(platform),
            );
          if (!fullyPermitted) {
            context.addIssue({
              code: 'custom',
              path: ['entries', index, 'assetSelection', 'status'],
              message: `Owned preview "${asset.id}" requires confirmed Rise ownership, public confidentiality, completed redaction and every permitted platform.`,
            });
          }
        }
      }

      if (
        entry.assetSelection.status === 'rights-checkpoint' &&
        !entry.visual.requiresVisualApproval
      ) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index, 'visual', 'requiresVisualApproval'],
          message:
            'Rights-checkpoint assets require explicit visual approval before use.',
        });
      }

      const isHumanFormat =
        entry.visualTemplate === 'human-video' ||
        entry.selectedAssetClass === 'team-photo';
      const hasApprovedHumanMedia =
        entry.assetSelection.status === 'owned-preview' &&
        selectedAssets.length > 0 &&
        selectedAssets.every(
          asset =>
            ['team-photo', 'screen-recording'].includes(asset.visualClass) &&
            asset.origin === 'rise-owned' &&
            asset.rightsStatus === 'confirmed' &&
            asset.approved &&
            !asset.requiresVisualApproval,
        );
      if (
        isHumanFormat &&
        entry.assetSelection.status !== 'capture-required' &&
        !hasApprovedHumanMedia
      ) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index, 'assetSelection', 'status'],
          message:
            'Human and team formats without approved media must remain capture-required.',
        });
      }

      if (entry.projectIds.length > 0) {
        if (entry.projectClaimMode === 'registry-synthesis') {
          const referencesEveryProject =
            entry.projectIds.length === plan.projects.length &&
            plan.projects.every(project => entry.projectIds.includes(project.id));
          const hasPortfolioRegistryClaim = entry.claimIds.some(claimId => {
            const claim = claimById.get(claimId);
            return (
              claim?.kind === 'verified-fact' &&
              claim.sourceUrl === 'https://rise.sk/portfolio'
            );
          });
          if (!referencesEveryProject || !hasPortfolioRegistryClaim) {
            context.addIssue({
              code: 'custom',
              path: ['entries', index, 'projectClaimMode'],
              message:
                'Registry synthesis requires every project and a verified public portfolio registry claim.',
            });
          }
        } else {
          for (const projectId of entry.projectIds) {
            const project = projectById.get(projectId);
            const hasApprovedProjectClaim =
              project &&
              entry.claimIds.some(claimId => {
                const claim = claimById.get(claimId);
                return (
                  project.allowedClaimIds.includes(claimId) &&
                  claim?.sourceUrl === project.publicUrl
                );
              });
            if (!hasApprovedProjectClaim) {
              context.addIssue({
                code: 'custom',
                path: ['entries', index, 'claimIds'],
                message: `Project "${projectId}" needs an approved public claim bound to its public URL.`,
              });
            }
          }
        }
      }
    }

    for (const [projectIndex, project] of plan.projects.entries()) {
      if (project.allowedClaimIds.length === 0) {
        context.addIssue({
          code: 'custom',
          path: ['projects', projectIndex, 'allowedClaimIds'],
          message: 'Every project needs at least one approved public claim ID.',
        });
      }
      for (const allowedClaimId of project.allowedClaimIds) {
        const claim = claimById.get(allowedClaimId);
        if (!claim || claim.sourceUrl !== project.publicUrl) {
          context.addIssue({
            code: 'custom',
            path: ['projects', projectIndex, 'allowedClaimIds'],
            message: `Approved project claim "${allowedClaimId}" must exist and use the project public URL.`,
          });
        }
      }
    }

    const entryIdsByWeek = new Map(
      plan.weeks.flatMap(week => [
        [week.mainEntryId, { week: week.number, slot: 'main', phase: week.phase }],
        [week.secondaryEntryId, { week: week.number, slot: 'secondary', phase: week.phase }],
      ]),
    );
    for (const [index, entry] of plan.entries.entries()) {
      const weekReference = entryIdsByWeek.get(entry.id);
      if (
        !weekReference ||
        weekReference.week !== entry.week ||
        weekReference.slot !== entry.slot ||
        weekReference.phase !== entry.rolloutPhase
      ) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index],
          message: `Entry "${entry.id}" must match exactly one week and rollout slot.`,
        });
      }
    }

    const expectedWeekNumbers = Array.from({ length: 12 }, (_, index) => index + 1);
    if (
      plan.weeks.map(week => week.number).join(',') !==
      expectedWeekNumbers.join(',')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['weeks'],
        message: 'Weeks must be ordered from 1 through 12.',
      });
    }

    for (const pillar of plan.pillars) {
      const actualPercent =
        (pillarCounts[pillar.id] / plan.entries.length) * 100;
      if (Math.abs(actualPercent - pillar.targetPercent) > 2) {
        context.addIssue({
          code: 'custom',
          path: ['entries'],
          message: `Pillar ${pillar.id} falls outside the two-point mix tolerance.`,
        });
      }
    }

    function requireExactSet(
      actual: readonly string[],
      expected: readonly string[],
      path: string,
      label: string,
    ) {
      const actualSet = new Set(actual);
      if (
        actualSet.size !== expected.length ||
        expected.some(item => !actualSet.has(item))
      ) {
        context.addIssue({
          code: 'custom',
          path: [path],
          message: `${label} must contain the exact unique v2 set.`,
        });
      }
    }

    requireExactSet(
      plan.pillars.map(pillar => pillar.id),
      [
        'product-proof',
        'decision-education',
        'growth-system',
        'people-process',
        'signal-noise',
      ],
      'pillars',
      'Pillar definitions',
    );
    requireExactSet(
      plan.series.map(series => series.id),
      [
        'inside-build',
        'decision-notes',
        'growth-system',
        'people-behind-product',
        'signal-vs-noise',
      ],
      'series',
      'Series definitions',
    );
    requireExactSet(
      plan.entries.map(entry => entry.series),
      [
        'inside-build',
        'decision-notes',
        'growth-system',
        'people-behind-product',
        'signal-vs-noise',
      ],
      'entries',
      'Entry series',
    );
    requireExactSet(
      plan.channelRoles.map(channel => channel.platform),
      ['linkedin', 'instagram', 'facebook'],
      'channelRoles',
      'Channel roles',
    );
    requireExactSet(
      plan.kpis.map(kpi => kpi.category),
      ['quality', 'attention', 'interest', 'business'],
      'kpis',
      'KPI categories',
    );

    const pilotEntries = plan.entries.filter(
      entry => entry.rolloutPhase === 'pilot',
    );
    const pilotPillarCount = (pillar: ContentPillar) =>
      pilotEntries.filter(entry => entry.pillar === pillar).length;
    if (
      pilotEntries.length !== 8 ||
      pilotPillarCount('product-proof') < 4 ||
      pilotPillarCount('decision-education') < 2 ||
      pilotPillarCount('people-process') < 1 ||
      pilotPillarCount('growth-system') < 1
    ) {
      context.addIssue({
        code: 'custom',
        path: ['entries'],
        message:
          '30-day pilot must contain at least four product proofs, two decision posts, one people post and one Growth System post.',
      });
    }
  });
export type ContentPlan = z.infer<typeof ContentPlanSchema>;
