import { classifyContentBrief } from '@/domain/risk';
import {
  TopicRequestSchema,
  type EditorialBrief,
  type TopicRequest,
} from '@/domain/schemas';

export interface TopicIntakeResult {
  request: TopicRequest;
  buyerQuestion: string;
  brief: EditorialBrief;
}

function desiredAction(goal: string): string {
  const normalized = goal.toLocaleLowerCase('sk');
  if (normalized.includes('awareness')) return 'Zapamätať si konkrétny pohľad Rise.';
  if (normalized.includes('conversion') || normalized.includes('kontakt') || normalized.includes('conversation')) {
    return 'Navštíviť portfólio alebo začať nezáväznú konzultáciu.';
  }
  return 'Porovnať vlastnú situáciu a rozhodnúť sa o ďalšom kroku.';
}

/** Pure, deterministic intake. It prepares a brief but never grants a risk approval. */
export function createEditorialBrief(input: TopicRequest): TopicIntakeResult {
  const request = TopicRequestSchema.parse(input);
  const risk = classifyContentBrief(
    [request.topic, request.audience, request.goal]
      .concat(request.allowGenerativeVisuals ? ['generatívny obrázok'] : [])
      .join('\n'),
  );
  const buyerQuestion = `${request.audience}: aké rozhodnutie okolo témy „${request.topic}“ potrebujete urobiť skôr, než investujete do zmeny?`;

  return {
    request,
    buyerQuestion,
    brief: {
      buyerQuestion,
      risePerspective:
        'Rise prepája produktové rozhodnutie, návrh, vývoj, dáta a prevádzku; vysvetľujeme konkrétnu hranicu alebo kompromis, nie všeobecnú technológiu.',
      businessFit:
        'Téma musí pomôcť vlastníkovi alebo lídrovi vyhodnotiť softvér, automatizáciu, dáta alebo modernizáciu ako obchodné rozhodnutie.',
      desiredAction: desiredAction(request.goal),
      riskFlags: risk.riskFlags,
      approvalState: risk.riskFlags.length > 0 ? 'pending' : 'approved',
    },
  };
}
