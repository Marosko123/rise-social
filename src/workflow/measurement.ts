import { z } from 'zod';

import { PlatformSchema } from '@/domain/schemas';

const NonNegativeCount = z.number().int().nonnegative();
const RequiredText = z.string().trim().min(1);
export const PlatformFormatMetricsSchema = z
  .object({
    platform: PlatformSchema,
    format: z.enum(['pdf-carousel', 'carousel', 'reel', 'photo', 'multi-image', 'text']),
    postId: RequiredText,
    observedAt: z.iso.datetime(),
    periodStart: z.iso.datetime(),
    periodEnd: z.iso.datetime(),
    utm: z.object({
      source: RequiredText,
      medium: RequiredText,
      campaign: RequiredText,
      content: RequiredText,
    }),
    swipes: NonNegativeCount,
    saves: NonNegativeCount,
    shares: NonNegativeCount,
    clicks: NonNegativeCount,
    completion: z.number().min(0).max(1),
    relevantComments: NonNegativeCount,
    profileVisits: NonNegativeCount,
    portfolioVisits: NonNegativeCount,
    contactVisits: NonNegativeCount,
    qualifiedConversations: NonNegativeCount,
  })
  .superRefine((metrics, context) => {
    const periodStart = Date.parse(metrics.periodStart);
    const periodEnd = Date.parse(metrics.periodEnd);
    const observedAt = Date.parse(metrics.observedAt);
    if (periodEnd < periodStart) {
      context.addIssue({ code: 'custom', path: ['periodEnd'], message: 'Measurement period must end after it starts.' });
    }
    if (observedAt < periodEnd) {
      context.addIssue({ code: 'custom', path: ['observedAt'], message: 'Measurement observedAt must be at or after periodEnd.' });
    }
  });
export type PlatformFormatMetrics = z.infer<typeof PlatformFormatMetricsSchema>;

export const MeasurementRulesSnapshotSchema = z.object({
  contentFrequency: z.number().int().positive(),
  automaticRuleChanges: z.literal(false),
});
export type MeasurementRulesSnapshot = z.infer<typeof MeasurementRulesSnapshotSchema>;

export interface MeasurementExperimentProposal {
  status: 'proposed';
  automaticRuleChange: false;
  hypothesis: string;
  nextExperiment: string;
  reviewRequired: true;
}

/** Returns a human-review proposal. This pure function never writes strategy or scheduling rules. */
export function proposeMeasurementExperiment(
  metrics: PlatformFormatMetrics,
  rules: MeasurementRulesSnapshot,
): MeasurementExperimentProposal {
  const validMetrics = PlatformFormatMetricsSchema.parse(metrics);
  const validRules = MeasurementRulesSnapshotSchema.parse(rules);
  const highIntent = validMetrics.saves + validMetrics.shares + validMetrics.clicks + validMetrics.qualifiedConversations;
  const format = validMetrics.format.replaceAll('-', ' ');
  const hypothesis =
    highIntent > 0
      ? `${format} na ${validMetrics.platform} priniesol merateľný signál záujmu; overte rovnakú sériu s novou otázkou kupujúceho.`
      : `${format} na ${validMetrics.platform} zatiaľ nepriniesol merateľný signál záujmu; overte iný opening alebo dôkaz, nie vyššiu frekvenciu.`;
  return {
    status: 'proposed',
    automaticRuleChange: false,
    hypothesis,
    nextExperiment: `Nechať frekvenciu ${validRules.contentFrequency} kvalitných master postov týždenne a pred ďalším experimentom vyžiadať ľudské schválenie.`,
    reviewRequired: true,
  };
}
