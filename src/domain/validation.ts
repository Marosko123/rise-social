import type { DraftPack, Platform } from './schemas';

export interface ValidationIssue {
  code:
    | 'missing-source'
    | 'missing-claim'
    | 'banned-phrase'
    | 'banned-punctuation'
    | 'too-many-hashtags'
    | 'too-few-hashtags'
    | 'unapproved-hashtag'
    | 'too-many-emojis'
    | 'insecure-link'
    | 'generic-question'
    | 'duplicate-opening'
    | 'unadapted-caption'
    | 'platform-link-placement'
    | 'platform-caption-length';
  path: string;
  message: string;
}

const BANNED_PHRASES = [
  'v dnešnej dynamickej dobe',
  'v dnešnom rýchlo sa meniacom svete',
  's nadšením oznamujeme',
  'revolučný',
  'game-changer',
  'odomkneme váš potenciál',
  'odomknúť potenciál',
  'posunúť na ďalšiu úroveň',
  'nie je to len',
  'posuňte svoje podnikanie',
  'bezproblémové riešenie',
  'komplexné riešenie',
  'špičkové riešenie',
  'revolučné riešenie',
];

const APPROVED_HASHTAGS = new Set([
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
]);

function opening(caption: string): string {
  return caption
    .toLocaleLowerCase('sk')
    .replace(/#[\p{L}\p{N}_-]+/gu, '')
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(' ');
}

function captionIssues(caption: string, path: string, platform: Platform): ValidationIssue[] {
  const normalized = caption.toLocaleLowerCase('sk');
  const issues: ValidationIssue[] = [];
  for (const phrase of BANNED_PHRASES) {
    if (normalized.includes(phrase)) {
      issues.push({
        code: 'banned-phrase',
        path,
        message: `Caption contains banned AI-like phrase: "${phrase}".`,
      });
    }
  }
  if (/[—–;]/u.test(caption)) {
    issues.push({
      code: 'banned-punctuation',
      path,
      message: 'Caption contains an em dash, en dash, or semicolon.',
    });
  }
  const hashtags = caption.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  const hashtagCount = hashtags.length;
  const hashtagLimit = platform === 'instagram' ? 5 : platform === 'linkedin' ? 3 : 2;
  if (hashtagCount > hashtagLimit) {
    issues.push({
      code: 'too-many-hashtags',
      path,
      message: `${platform} caption has ${hashtagCount} hashtags; maximum is ${hashtagLimit}.`,
    });
  }
  if (platform === 'instagram' && hashtagCount < 2) {
    issues.push({
      code: 'too-few-hashtags',
      path,
      message: `Instagram caption has ${hashtagCount} hashtags; expected 2 to 5.`,
    });
  }
  for (const hashtag of hashtags) {
    const normalizedHashtag = hashtag
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('sk');
    if (!APPROVED_HASHTAGS.has(normalizedHashtag)) {
      issues.push({
        code: 'unapproved-hashtag',
        path,
        message: `Hashtag "${hashtag}" is not in the controlled Rise vocabulary.`,
      });
    }
  }
  const emojiCount = caption.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
  if (emojiCount > 1) {
    issues.push({
      code: 'too-many-emojis',
      path,
      message: `Caption contains ${emojiCount} emoji; maximum is one.`,
    });
  }
  if (/^(?:chcete|vedeli ste|čo si myslíte|súhlasíte)\b.*\?/iu.test(caption.trim())) {
    issues.push({
      code: 'generic-question',
      path,
      message: 'Caption starts with a generic engagement question.',
    });
  }
  if (platform === 'instagram' && /https?:\/\/\S+/iu.test(caption)) {
    issues.push({
      code: 'platform-link-placement',
      path,
      message: 'Instagram caption must use „odkaz v profile“ instead of a raw URL.',
    });
  }
  if (platform === 'facebook' && caption.length > 900) {
    issues.push({
      code: 'platform-caption-length',
      path,
      message: `Facebook caption has ${caption.length} characters; the Rise editorial maximum is 900.`,
    });
  }
  return issues;
}

export function validateDraftPack(
  draft: DraftPack,
  previousCaptions: string[] = [],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sourceIds = new Set(draft.sources.map(source => source.id));
  const seenOpenings = new Map(
    previousCaptions
      .map(caption => opening(caption))
      .filter(Boolean)
      .map(value => [value, 'prior-post history']),
  );

  for (const [postIndex, post] of draft.posts.entries()) {
    for (const sourceId of post.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push({
          code: 'missing-source',
          path: `posts.${postIndex}.sourceIds`,
          message: `Post references unknown source "${sourceId}".`,
        });
      }
    }
    const claimIds = new Set(draft.claims.map(claim => claim.id));
    for (const claimId of post.claimIds) {
      if (!claimIds.has(claimId)) {
        issues.push({
          code: 'missing-claim',
          path: `posts.${postIndex}.claimIds`,
          message: `Post references unknown claim "${claimId}".`,
        });
      }
    }

    const captions = Object.entries(post.platforms) as [
      Platform,
      (typeof post.platforms)[Platform],
    ][];
    const distinctCaptions = new Set(captions.map(([, value]) => value.caption.trim()));
    if (distinctCaptions.size !== captions.length) {
      issues.push({
        code: 'unadapted-caption',
        path: `posts.${postIndex}.platforms`,
        message: 'Every platform needs its own adapted caption.',
      });
    }

    for (const [platform, variant] of captions) {
      const path = `posts.${postIndex}.platforms.${platform}.caption`;
      issues.push(...captionIssues(variant.caption, path, platform));
      if (variant.link && new URL(variant.link).protocol !== 'https:') {
        issues.push({
          code: 'insecure-link',
          path: `posts.${postIndex}.platforms.${platform}.link`,
          message: 'Publishing links must use HTTPS.',
        });
      }
      const captionOpening = opening(variant.caption);
      const previousPath = seenOpenings.get(captionOpening);
      if (captionOpening.length > 0 && previousPath) {
        issues.push({
          code: 'duplicate-opening',
          path,
          message: `Caption opening duplicates ${previousPath}.`,
        });
      } else {
        seenOpenings.set(captionOpening, path);
      }
    }
  }

  return issues;
}
