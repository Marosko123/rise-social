import { computeApprovalDigest } from '@/domain/approval';
import {
  ContentRunSchema,
  DraftPackSchema,
  type ContentRun,
  type DraftPack,
  type Platform,
  type Theme,
} from '@/domain/schemas';

const checkedAt = '2026-07-24T08:00:00.000Z';
const approvedReview = {
  approved: true,
  blocker: false,
  issues: [],
  revisionInstructions: 'Bez ďalších úprav.',
  scorecard: {
    factualAccuracy: 5,
    voice: 5,
    specificity: 5,
    continuity: 5,
    visualClarity: 5,
    businessFit: 5,
    passed: true,
    notes: ['Testovací balík prešiel kontrolou.'],
  },
};

export function createFixtureDraft(): DraftPack {
  const themes: { theme: Theme; sourceId: string; title: string }[] = [
    { theme: 'decision-education', sourceId: 'source-education', title: 'Najprv proces' },
    { theme: 'product-proof', sourceId: 'source-product', title: 'GrantAI v praxi' },
    { theme: 'people-process', sourceId: 'source-human', title: 'Ako začíname projekt' },
  ];
  const platforms: Platform[] = ['instagram', 'linkedin', 'facebook'];

  return DraftPackSchema.parse({
    schemaVersion: 1,
    brief: 'Testovací balík Rise.',
    generatedAt: checkedAt,
    author: 'codex',
    critic: 'claude',
    warnings: [],
    workflowContext: {
      editorialBrief: {
        buyerQuestion: 'Ako overiť testovací obsah?',
        risePerspective: 'Každý výstup musí prejsť kontrolou.',
        desiredAction: 'Overiť export.',
        businessFit: 'Testuje schvaľovací kontrakt.',
        riskFlags: [],
        approvalState: 'approved',
      },
      claimLedger: [],
      visualDirections: [],
      assetRights: [],
      cropsRedactions: [],
      generationProvenance: [],
      firstCritique: approvedReview,
      finalValidation: approvedReview,
    },
    sources: themes.map(({ theme, sourceId }) => ({
      id: sourceId,
      url: `https://rise.sk/${theme}`,
      title: `Rise ${theme}`,
      publisher: 'Rise',
      checkedAt,
      claim: `Verejný zdroj pre tému ${theme}.`,
    })),
    posts: themes.map(({ theme, sourceId, title }, postIndex) => ({
      id: `post-${postIndex + 1}`,
      theme,
      title,
      summary: `Konkrétny obsah pre tému ${theme}.`,
      sourceIds: [sourceId],
      visualKind:
        theme === 'product-proof' ? 'product-screenshot' : theme === 'people-process' ? 'team-photo' : 'branded-diagram',
      slides: Array.from({ length: 4 }, (_, slideIndex) => ({
        id: `${postIndex + 1}-${slideIndex + 1}`,
        eyebrow: `0${slideIndex + 1}`,
        title: slideIndex === 0 ? title : `Krok ${slideIndex + 1}`,
        body: `Konkrétne vysvetlenie číslo ${slideIndex + 1} pre ${theme}.`,
        alt: `Karta ${slideIndex + 1} pre tému ${theme}.`,
      })),
      platforms: Object.fromEntries(
        platforms.map((platform, platformIndex) => [
          platform,
          {
            platform,
            caption: `${title}. Verzia pre ${platform} prináša konkrétny pohľad ${postIndex + 1}.${platformIndex + 1}. #rise${platform === 'instagram' ? ' #softver' : ''}`,
            altText: `Štyri karty k téme ${title}.`,
            scheduledFor: `2026-07-${27 + postIndex * 2}T${platform === 'instagram' ? '10' : platform === 'linkedin' ? '14' : '15'}:00:00.000Z`,
          },
        ]),
      ),
    })),
  });
}

export function createFixtureRun(approved = true): ContentRun {
  const draft = createFixtureDraft();
  const run: ContentRun = {
    id: 'run-fixture',
    status: approved ? 'approved' : 'draft',
    createdAt: checkedAt,
    updatedAt: approved ? '2026-07-24T09:00:00.000Z' : checkedAt,
    revision: 1,
    qualifiedConversations: 0,
    draft,
    approval: approved
      ? {
          runId: 'run-fixture',
          digest: computeApprovalDigest(draft),
          approvedAt: '2026-07-24T09:00:00.000Z',
          action: 'export',
          revision: 1,
        }
      : undefined,
  };
  return ContentRunSchema.parse(run);
}
