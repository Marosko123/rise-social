import { ContentBriefSchema, type ContentBrief } from './schemas';
import { RISE_CONTENT_PLAN } from '@/contentPlan/plan';

const EDITORIAL_ENTITY_NAMES = [
  ...RISE_CONTENT_PLAN.projects.map(project => project.name),
  'Rise Social Studio',
];

function entityWords(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('sk')
    .match(/\p{L}+/gu) ?? [];
}

function entityStem(word: string): string {
  for (const ending of ['ovej', 'ami', 'och', 'om', 'ou', 'ovi', 'e', 'i', 'y', 'a']) {
    if (word.length >= ending.length + 3 && word.endsWith(ending)) {
      return word.slice(0, -ending.length);
    }
  }
  return word;
}

function isEditorialEntityCandidate(candidate: string): boolean {
  const words = entityWords(candidate);
  const compact = words.join('');
  return EDITORIAL_ENTITY_NAMES.some(name => {
    const aliasWords = entityWords(name);
    if (compact === aliasWords.join('')) return true;
    return (
      aliasWords.length === words.length &&
      aliasWords
        .map(entityStem)
        .every((stem, index) => entityStem(words[index]) === stem)
    );
  });
}

function hasNamedPersonIntent(text: string, normalized: string): boolean {
  const knownRisePerson =
    /(?:^|[^\p{L}])(?:maroš\p{L}*|tatian\p{L}*)(?:$|[^\p{L}])/u.test(
      normalized,
    );
  const personContent =
    /(?:[Pp]ríspev\p{L}*|[Vv]ideo|[Ff]otograf\p{L}*|[Ff]oto|[Pp]rofil|[Rr]ozhovor|[Cc]itát)\s+(?:(?:o|s|so|od)\s+)?(?<candidate>\p{Lu}\p{Ll}{2,}\s+\p{Lu}\p{Ll}{2,}(?:\s+\p{Lu}\p{Ll}{2,})?)/gu;
  const targetsPerson = [...text.matchAll(personContent)].some(match => {
    const candidate = match.groups?.candidate;
    return Boolean(candidate && !isEditorialEntityCandidate(candidate));
  });
  return knownRisePerson || targetsPerson;
}

function hasRiseCompetitorIntent(text: string): boolean {
  const entity = String.raw`\p{Lu}[\p{L}\p{N}&.-]*`;
  const rise = String.raw`[Rr]ise\.sk`;
  return [
    new RegExp(`${rise}\\s+vs\\s+${entity}`, 'u'),
    new RegExp(`${entity}\\s+vs\\s+${rise}`, 'u'),
    new RegExp(
      String.raw`[Pp]orovn\p{L}*\s+${rise}\s+(?:s|so)\s+(?:spoločnosť\p{L}*\s+)?${entity}`,
      'u',
    ),
    new RegExp(
      String.raw`${rise}\s+líš\p{L}*\s+od\s+${entity}`,
      'u',
    ),
  ].some(pattern => pattern.test(text));
}

export function classifyContentBrief(brief: string): ContentBrief {
  const text = brief.trim() || 'Vybrať jednu konkrétnu tému z verejných Rise zdrojov.';
  const normalized = text.toLocaleLowerCase('sk');
  const riskFlags: ContentBrief['riskFlags'] = [];
  if (
    (/(?:klient\p{L}*|prípadov\p{L}*\s+štúdi\p{L}*)/u.test(normalized)) &&
    /(výsled|úspor|nárast|pokles|dosiah|zlepš|zrýchl|ušet|navýš|obrat)/u.test(normalized)
  ) {
    riskFlags.push('client-result');
  }
  if (/(?:^|[^\p{L}\p{N}])\d+(?:[,.]\d+)?\s*(?:%|eur(?:$|[^\p{L}])|€|hodín|dni|dní)/iu.test(text)) {
    riskFlags.push('metric');
  }
  if (/(?:^|[^\p{L}\p{N}])\d+(?:[,.]\d+)?\s*x(?:$|[^\p{L}\p{N}])/iu.test(text)) {
    riskFlags.push('metric');
  }
  if (
    /(gdpr|ai[\s-]*act|zdravot\p{L}*|právn\p{L}*|úver\p{L}*|investič\p{L}*|daň\p{L}*)/u.test(
      normalized,
    ) ||
    /finanč\p{L}*\s+(?:poraden|regul|produkt|údaj|rozhod)/u.test(normalized)
  ) {
    riskFlags.push('regulated-topic');
  }
  if (
    /konkurent\p{L}*/u.test(normalized) ||
    hasRiseCompetitorIntent(text) ||
    /(?:netguru|strv|dept(?:agency)?|work\s*&\s*co|clay(?:\.global)?|ustwo)/u.test(
      normalized,
    )
  ) {
    riskFlags.push('competitor');
  }
  if (/(neverejn|dôvern|interný príbeh|zákulisie klienta)/u.test(normalized)) {
    riskFlags.push('non-public-story');
  }
  if (
    /(menovan|citáci|riaditeľ|riaditeľka|ceo|zakladateľ|zakladateľka)/u.test(normalized) ||
    /(?:[Rr]ozhovor|[Pp]rofil)\s+s[o]?\s+\p{Lu}\p{Ll}+\s+\p{Lu}\p{Ll}+/u.test(text) ||
    /[Čč]o\s+nám\s+\p{Lu}\p{Ll}+\s+(?:povedal|povedala)/u.test(text) ||
    hasNamedPersonIntent(text, normalized) ||
    /(?:príspevok|post|video)\s+s[o]?\s+(?:maroš\p{L}*\s+bednár\p{L}*|tatian\p{L}*)/u.test(
      normalized,
    )
  ) {
    riskFlags.push('named-person');
  }
  if (/(generatív\p{L}*|vygenerovan\p{L}* obráz|ai obráz)/u.test(normalized)) {
    riskFlags.push('generative-image');
  }
  const uniqueFlags = [...new Set(riskFlags)];
  return ContentBriefSchema.parse({
    problem: text,
    audience: 'Firmy a produktové tímy, ktoré riešia softvér a pracovné toky.',
    objective: 'Pripraviť konkrétny, užitočný a zdrojovaný obsah.',
    riskLevel: uniqueFlags.length > 0 ? 'high' : 'low',
    riskFlags: uniqueFlags,
    requiresBriefApproval: uniqueFlags.length > 0,
  });
}

export function assertBriefMayDraft(brief: ContentBrief): void {
  if (
    (brief.riskLevel === 'high' || brief.requiresBriefApproval) &&
    !brief.approvedAt
  ) {
    throw new Error(
      `High-risk content requires brief review before drafting (${brief.riskFlags.join(', ') || 'risk not classified'}).`,
    );
  }
}
