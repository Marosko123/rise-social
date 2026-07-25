import {
  CampaignDecisionSchema,
  type CampaignDecision,
  type TopicRequest,
} from './schemas';

export interface PlanningSignals {
  evidenceInsightCount: number;
  visualClassCount: number;
  buyerQuestionCount: number;
}

function requestedPostCount(request: TopicRequest): number {
  if (request.mode === 'single') return 1;
  return request.requestedPostCount ?? 2;
}

export function resolveCampaignDecision(
  request: TopicRequest,
  signals: PlanningSignals,
): CampaignDecision {
  const requested = requestedPostCount(request);
  const autoQualified =
    signals.evidenceInsightCount >= 3 &&
    signals.visualClassCount >= 2 &&
    signals.buyerQuestionCount >= 2;

  if (request.mode === 'single') {
    return CampaignDecisionSchema.parse({
      requestedMode: request.mode,
      resolvedMode: 'single',
      postCount: 1,
      ...signals,
      reason: 'Režim single vždy pripravuje jeden príspevok.',
    });
  }

  if (request.mode === 'auto' && !autoQualified) {
    return CampaignDecisionSchema.parse({
      requestedMode: request.mode,
      resolvedMode: 'single',
      postCount: 1,
      ...signals,
      reason:
        'Auto režim zostal pri jednom príspevku, pretože chýbajú tri neprekrývajúce sa evidenčné insighty, dve použiteľné vizuálne triedy alebo dve buyer otázky.',
    });
  }

  return CampaignDecisionSchema.parse({
    requestedMode: request.mode,
    resolvedMode: 'campaign',
    postCount: Math.min(3, Math.max(2, requested)),
    ...signals,
    reason:
      request.mode === 'auto'
        ? 'Auto režim splnil prah evidencie, vizuálnych tried a buyer otázok.'
        : 'Kampaňový režim žiada viac príspevkov; zdrojové, rizikové a nezávislé review brány zostávajú povinné.',
  });
}
