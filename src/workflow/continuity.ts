export interface ContinuityCandidate {
  topic: string;
  title: string;
  opening: string;
  promise: string;
  core: string;
}

export interface ContinuityAssessment {
  passed: boolean;
  issues: string[];
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('sk')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const SEMANTIC_FILLERS = new Set([
  'a',
  'aj',
  'ale',
  'alebo',
  'ci',
  'do',
  'na',
  'o',
  'od',
  'po',
  'pre',
  'prave',
  's',
  'sa',
  'si',
  'so',
  'v',
  'vam',
  'vo',
  'z',
  'za',
]);

function canonicalToken(token: string): string {
  const endings = [
    'ujeme',
    'ujete',
    'ovanie',
    'ovat',
    'avat',
    'enie',
    'ami',
    'och',
    'ou',
    'at',
    'it',
    'e',
    'a',
  ];
  for (const ending of endings) {
    if (token.length >= ending.length + 3 && token.endsWith(ending)) {
      return token.slice(0, -ending.length);
    }
  }
  return token;
}

function meaningfulTokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(' ')
      .filter(token => token.length > 1 && !SEMANTIC_FILLERS.has(token))
      .map(canonicalToken),
  );
}

function isSemanticDuplicate(left: string, right: string): boolean {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  if (normalizedLeft === normalizedRight) return true;
  const leftTokens = meaningfulTokens(left);
  const rightTokens = meaningfulTokens(right);
  const intersection = [...leftTokens].filter(token => rightTokens.has(token)).length;
  if (
    leftTokens.size >= 2 &&
    leftTokens.size === rightTokens.size &&
    intersection === leftTokens.size
  ) {
    return true;
  }
  if (leftTokens.size < 3 || rightTokens.size < 3) return false;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const containment = intersection / Math.min(leftTokens.size, rightTokens.size);
  const jaccard = intersection / union;
  return containment >= 0.8 && jaccard >= 0.6;
}

/** Campaign siblings must answer distinct buyer questions, not merely use different titles. */
export function assessCampaignContinuity(candidates: readonly ContinuityCandidate[]): ContinuityAssessment {
  const issues: string[] = [];
  const seen = new Map<keyof Pick<ContinuityCandidate, 'opening' | 'promise' | 'core'>, Array<{ value: string; index: number }>>();
  for (const [index, candidate] of candidates.entries()) {
    for (const field of ['opening', 'promise', 'core'] as const) {
      const value = normalize(candidate[field]);
      if (!value) {
        issues.push(`Post ${index + 1} has no ${field}.`);
        continue;
      }
      const prior = (seen.get(field) ?? []).find(entry =>
        isSemanticDuplicate(entry.value, candidate[field]),
      );
      if (prior) {
        issues.push(`Post ${index + 1} repeats ${field} from post ${prior.index + 1}.`);
      } else {
        seen.set(field, [...(seen.get(field) ?? []), { value: candidate[field], index }]);
      }
    }
  }
  return { passed: issues.length === 0, issues };
}
