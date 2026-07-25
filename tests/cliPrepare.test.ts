import { describe, expect, test, vi } from 'vitest';

import {
  ManualContentCheckpointError,
  createClaimLedger,
  deriveProductionCampaignDecision,
  prepareTopicRequest,
} from '@/cli/prepare';
import { computeApprovalDigest } from '@/domain/approval';
import { AssetRecordSchema, DraftPackSchema } from '@/domain/schemas';
import { classifyContentBrief } from '@/domain/risk';
import { assessCampaignContinuity } from '@/workflow/continuity';
import { prepareProductionDraft } from '@/cli/services';

import { createFixtureDraft } from './fixtures';

const now = new Date('2026-07-25T12:00:00.000Z');

describe('production prepare contract', () => {
  test('maps defaults and an exact public project to a validated TopicRequest', () => {
    const plan = prepareTopicRequest({
      brief: 'Čo modernizovať ako prvé',
      demo: false,
      mode: 'auto',
      audience: 'owners',
      goal: 'consideration',
      projects: ['slates'],
      sources: [],
      allowGenerativeVisuals: false,
    });

    expect(plan.topicRequest).toEqual({
      topic: 'Čo modernizovať ako prvé',
      audience: 'Majitelia a riaditelia slovenských firiem.',
      goal: 'consideration',
      mode: 'auto',
      projectUrls: ['https://rise.sk/portfolio/slates'],
      sourceUrls: ['https://rise.sk/portfolio/slates'],
      allowGenerativeVisuals: false,
    });
    expect(plan.projects.map(project => project.id)).toEqual(['slates']);
    expect(plan.editorialBrief.approvalState).toBe('approved');
  });

  test('accepts custom audience text, deduplicates public sources and keeps forced campaign bounded', () => {
    const plan = prepareTopicRequest({
      brief: 'Ako prepojiť systém a prevádzku',
      demo: false,
      mode: 'campaign',
      audience: 'Prevádzkoví a nákupní lídri',
      goal: 'awareness',
      projects: ['rise-sk', 'rise-sk'],
      sources: [
        'https://rise.sk/portfolio/rise-sk',
        'https://rise.sk/blog/produktovy-web',
      ],
      allowGenerativeVisuals: false,
    });

    expect(plan.topicRequest).toMatchObject({
      audience: 'Prevádzkoví a nákupní lídri',
      requestedPostCount: 3,
      projectUrls: ['https://rise.sk/portfolio/rise-sk'],
      sourceUrls: [
        'https://rise.sk/portfolio/rise-sk',
        'https://rise.sk/blog/produktovy-web',
      ],
    });
    expect(new Set(plan.assetRecords.map(asset => asset.visualClass))).toEqual(
      new Set(['product-screenshot']),
    );
  });

  test('rejects unknown projects and non-public source URLs', () => {
    expect(() =>
      prepareTopicRequest({
        brief: 'Téma',
        demo: false,
        mode: 'auto',
        audience: 'owners',
        goal: 'consideration',
        projects: ['private-client'],
        sources: [],
        allowGenerativeVisuals: false,
      }),
    ).toThrow(/unknown public project/i);

    expect(() =>
      prepareTopicRequest({
        brief: 'Téma',
        demo: false,
        mode: 'auto',
        audience: 'owners',
        goal: 'consideration',
        projects: [],
        sources: ['http://localhost:3000/private'],
        allowGenerativeVisuals: false,
      }),
    ).toThrow(/https|public/i);

    for (const source of [
      'https://127.0.0.1.sslip.io/private',
      'https://metadata.google.internal/latest/meta-data/',
    ]) {
      expect(() =>
        prepareTopicRequest({
          brief: 'Téma',
          demo: false,
          mode: 'auto',
          audience: 'owners',
          goal: 'consideration',
          projects: [],
          sources: [source],
          allowGenerativeVisuals: false,
        }),
      ).toThrow(/public|safe/i);
    }
  });

  test('rejects unsupported goals at the production DTO boundary', () => {
    expect(() =>
      prepareTopicRequest({
        brief: 'Téma',
        demo: false,
        mode: 'auto',
        audience: 'owners',
        goal: 'sales' as never,
        projects: [],
        sources: ['https://rise.sk'],
        allowGenerativeVisuals: false,
      }),
    ).toThrow(/goal/i);
  });

  test.each([
    {
      name: 'generative intent',
      input: {
        brief: 'Abstraktný vizuál k automatizácii',
        demo: false,
        mode: 'auto' as const,
        audience: 'owners',
        goal: 'consideration' as const,
        projects: ['rise-sk'],
        sources: [],
        allowGenerativeVisuals: true,
      },
    },
    {
      name: 'high-risk project',
      input: {
        brief: 'Ako navrhujeme citlivý pracovný tok',
        demo: false,
        mode: 'single' as const,
        audience: 'owners',
        goal: 'consideration' as const,
        projects: ['viac-ako-nick'],
        sources: [],
        allowGenerativeVisuals: false,
      },
    },
    {
      name: 'high-risk topic',
      input: {
        brief: 'Klientský výsledok s úsporou 40 %',
        demo: false,
        mode: 'auto' as const,
        audience: 'owners',
        goal: 'consideration' as const,
        projects: [],
        sources: ['https://rise.sk'],
        allowGenerativeVisuals: false,
      },
    },
  ])('stops $name at a manual checkpoint before research or authoring', ({ input }) => {
    let researchStarted = false;
    let authorStarted = false;

    expect(() => {
      const plan = prepareTopicRequest(input);
      researchStarted = true;
      if (plan.editorialBrief.approvalState === 'approved') authorStarted = true;
    }).toThrow(ManualContentCheckpointError);

    expect(researchStarted).toBe(false);
    expect(authorStarted).toBe(false);
  });

  test('creates exact, stable, fresh claim entries from checked public documents', () => {
    const ledger = createClaimLedger(
      [
        {
          url: 'https://rise.sk/portfolio/slates',
          title: 'Slates',
          publisher: 'rise.sk',
          checkedAt: now.toISOString(),
          text: 'Modernizácia existujúcej platformy zachovala produktový kontext. Ďalšia veta.',
        },
      ],
      now,
    );

    expect(ledger).toEqual([
      {
        id: expect.stringMatching(/^claim-[a-f0-9]{12}$/),
        sourceId: expect.stringMatching(/^source-[a-f0-9]{12}$/),
        sourceUrl: 'https://rise.sk/portfolio/slates',
        claim: 'Modernizácia existujúcej platformy zachovala produktový kontext.',
        evidence:
          'Modernizácia existujúcej platformy zachovala produktový kontext. Ďalšia veta.',
        checkedAt: now.toISOString(),
        risk: 'stable',
        expiresAt: '2027-07-25T12:00:00.000Z',
      },
    ]);
  });

  test.each([
    ['Rozhovor s Marošom Bednárom o tom, ako vedie Rise', 'named-person'],
    ['Čo nám Tatiana povedala o projekte', 'named-person'],
    ['Príspevok s Marošom Bednárom', 'named-person'],
    ['Rozhovor s Marošom o vývoji', 'named-person'],
    ['Fotografia Tatiany pri práci', 'named-person'],
    ['Príspevok o Jánovi Novákovi', 'named-person'],
    ['Video o Petrovi Horváthovi', 'named-person'],
    ['Profil Jána Nováka', 'named-person'],
    ['Citát od Petra Horvátha', 'named-person'],
    ['Video o Jánovi Novákovi a projekte MapaTrhu', 'named-person'],
    ['Profil Petra Horvátha pre Rise Social Studio', 'named-person'],
    ['Citát od Petra Horvátha k Smart Gym produktu', 'named-person'],
    ['Porovnanie Rise.sk so spoločnosťou Netguru', 'competitor'],
    ['Netguru vs Rise.sk', 'competitor'],
    ['Porovnanie Rise.sk so spoločnosťou Accenture', 'competitor'],
    ['Rise.sk vs Accenture', 'competitor'],
    ['Accenture vs Rise.sk', 'competitor'],
    ['Ako sa Rise.sk líši od Accenture', 'competitor'],
    ['AI Act v praxi', 'regulated-topic'],
    ['Klient dosiahol úsporu bez čísla', 'client-result'],
  ] as const)('classifies protected intent in “%s”', (brief, risk) => {
    expect(classifyContentBrief(brief).riskFlags).toContain(risk);
  });

  test.each([
    'Rozhovor s Marošom Bednárom o tom, ako vedie Rise',
    'Čo nám Tatiana povedala o projekte',
    'Porovnanie Rise.sk so spoločnosťou Netguru',
    'AI Act v praxi',
    'Klient dosiahol úsporu bez čísla',
  ])('service boundary stops protected brief “%s” before fetch, author and board', async brief => {
    const fetchSource = vi.fn();
    const prepare = vi.fn();
    const board = vi.fn();

    await expect(
      prepareProductionDraft(
        {
          brief,
          demo: false,
          mode: 'auto',
          audience: 'owners',
          goal: 'consideration',
          projects: [],
          sources: ['https://rise.sk'],
          allowGenerativeVisuals: false,
        },
        {
          now,
          previousCaptions: [],
          runNumber: 1,
          fetchSource,
          orchestrator: { prepare },
        },
      ).then(result => board(result)),
    ).rejects.toThrow(/checkpoint|risk|approval/i);

    expect(fetchSource).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
    expect(board).not.toHaveBeenCalled();
  });

  test('service boundary reclassifies appended reviewer feedback before fetch, author and board', async () => {
    const fetchSource = vi.fn();
    const prepare = vi.fn();
    const board = vi.fn();

    await expect(
      prepareProductionDraft(
        {
          brief: 'Bezpečná téma',
          demo: false,
          mode: 'auto',
          audience: 'owners',
          goal: 'consideration',
          projects: [],
          sources: ['https://rise.sk'],
          allowGenerativeVisuals: false,
        },
        {
          now,
          previousFeedback: 'Klientský výsledok s úsporou 40 % a meno CEO.',
          previousCaptions: [],
          runNumber: 1,
          fetchSource,
          orchestrator: { prepare },
        },
      ).then(result => board(result)),
    ).rejects.toThrow(/checkpoint|risk|approval/i);

    expect(fetchSource).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
    expect(board).not.toHaveBeenCalled();
  });

  test('keeps ordinary predefined and custom audience labels out of the risk gate', () => {
    const safe = prepareTopicRequest({
      brief: 'Ako prepojiť systém a prevádzku',
      demo: false,
      mode: 'auto',
      audience: 'Prevádzkoví a nákupní lídri',
      goal: 'consideration',
      projects: ['rise-sk'],
      sources: [],
      allowGenerativeVisuals: false,
    });

    expect(safe.editorialBrief.riskFlags).toEqual([]);
  });

  test.each([
    'Porovnanie mapy s tabuľkou',
    'Ako porovnať modernizáciu s prepisom systému',
    'Rozhovor s produktovým tímom o modernizácii',
    'Video o Rozvoji Dopravy Trnava',
    'Príspevok o Personálno Mzdovom Systéme',
    'Profil Mapa Trhu',
    'Fotografia Smart Gym produktu',
    'Rozhovor o Rise Social Studio',
  ])('does not classify ordinary editorial intent “%s” as a protected entity', brief => {
    const flags = classifyContentBrief(brief).riskFlags;
    expect(flags).not.toContain('named-person');
    expect(flags).not.toContain('competitor');
  });

  test('derives auto expansion only from distinct ledger insights, explicit questions and rights-safe visual classes', () => {
    const request = prepareTopicRequest({
      brief: 'Ako zvoliť ďalší krok modernizácie',
      demo: false,
      mode: 'auto',
      audience: 'owners',
      goal: 'consideration',
      projects: [],
      sources: ['https://rise.sk'],
      allowGenerativeVisuals: false,
    }).topicRequest;
    const assets = [
      AssetRecordSchema.parse({
        id: 'owned-ui',
        visualClass: 'product-screenshot',
        origin: 'rise-owned',
        owner: 'Rise.sk',
        license: 'owned',
        project: 'Rise.sk',
        confidentiality: 'public',
        allowedPlatforms: ['instagram', 'linkedin', 'facebook'],
        redactionStatus: 'not-required',
        approved: true,
        rightsStatus: 'confirmed',
        rightsReference: 'Rise ownership register',
        path: '/owned/ui.webp',
      }),
      AssetRecordSchema.parse({
        id: 'owned-diagram',
        visualClass: 'branded-diagram',
        origin: 'rise-owned',
        owner: 'Rise.sk',
        license: 'owned',
        project: 'Rise.sk',
        confidentiality: 'public',
        allowedPlatforms: ['instagram', 'linkedin', 'facebook'],
        redactionStatus: 'not-required',
        approved: true,
        rightsStatus: 'confirmed',
        rightsReference: 'Rise ownership register',
        path: '/owned/diagram.webp',
      }),
    ];
    const ledger = ['mapa zasadí dáta do priestoru', 'systém zjednotí stav', 'modernizácia zachová kontext']
      .map((claim, index) => ({
        id: `claim-${index}`,
        sourceId: `source-${index}`,
        sourceUrl: `https://rise.sk/source-${index}`,
        claim,
        evidence: `${claim}.`,
        checkedAt: now.toISOString(),
        risk: 'stable' as const,
        expiresAt: '2027-07-25T12:00:00.000Z',
      }));

    expect(
      deriveProductionCampaignDecision(request, ledger, assets, [
        'Kde vzniká najväčšie prevádzkové trenie?',
        'Ktorý krok má zmysel modernizovať ako prvý?',
      ]),
    ).toMatchObject({ resolvedMode: 'campaign', postCount: 2 });
    expect(
      deriveProductionCampaignDecision(request, ledger, assets.slice(0, 1), [
        'Kde vzniká najväčšie prevádzkové trenie?',
        'Ktorý krok má zmysel modernizovať ako prvý?',
      ]),
    ).toMatchObject({ resolvedMode: 'single', postCount: 1 });
    expect(
      deriveProductionCampaignDecision(request, [ledger[0], { ...ledger[0], id: 'duplicate' }], assets, [
        'Kde vzniká najväčšie prevádzkové trenie?',
        'Kde vzniká najväčšie prevádzkové trenie?',
      ]),
    ).toMatchObject({ resolvedMode: 'single', postCount: 1 });
    expect(
      deriveProductionCampaignDecision(
        request,
        ledger,
        assets.map(asset => ({ ...asset, path: undefined })),
        [
          'Kde vzniká najväčšie prevádzkové trenie?',
          'Ktorý krok má zmysel modernizovať ako prvý?',
        ],
      ),
    ).toMatchObject({ resolvedMode: 'single', postCount: 1 });
  });

  test('production preparation derives an evidence-rich auto campaign after research', async () => {
    const assets = [
      AssetRecordSchema.parse({
        id: 'rise-ui',
        visualClass: 'product-screenshot',
        origin: 'rise-owned',
        owner: 'Rise.sk',
        license: 'owned',
        project: 'Rise.sk',
        confidentiality: 'public',
        allowedPlatforms: ['instagram', 'linkedin', 'facebook'],
        redactionStatus: 'not-required',
        approved: true,
        rightsStatus: 'confirmed',
        rightsReference: 'Rise ownership register',
        path: '/owned/rise-ui.webp',
      }),
      AssetRecordSchema.parse({
        id: 'rise-diagram',
        visualClass: 'branded-diagram',
        origin: 'rise-owned',
        owner: 'Rise.sk',
        license: 'owned',
        project: 'Rise.sk',
        confidentiality: 'public',
        allowedPlatforms: ['instagram', 'linkedin', 'facebook'],
        redactionStatus: 'not-required',
        approved: true,
        rightsStatus: 'confirmed',
        rightsReference: 'Rise ownership register',
        path: '/owned/rise-diagram.webp',
      }),
    ];
    const prepare = vi.fn().mockResolvedValue(createFixtureDraft());
    let sourceIndex = 0;

    await prepareProductionDraft(
      {
        brief: 'Ako zvoliť ďalší krok modernizácie',
        demo: false,
        mode: 'auto',
        audience: 'owners',
        goal: 'consideration',
        projects: ['rise-sk'],
        sources: ['https://rise.sk/research/a', 'https://rise.sk/research/b'],
        allowGenerativeVisuals: false,
      },
      {
        now,
        previousCaptions: [],
        runNumber: 1,
        assetCatalog: assets,
        fetchSource: async url => {
          sourceIndex += 1;
          return {
            url,
            title: `Zdroj ${sourceIndex}`,
            publisher: 'rise.sk',
            checkedAt: now.toISOString(),
            text: `Odlišný insight ${sourceIndex} vysvetľuje rozhodnutie. Ktorú fázu ${sourceIndex} treba overiť?`,
          };
        },
        orchestrator: { prepare },
      },
    );

    expect(prepare).toHaveBeenCalledWith(
      expect.objectContaining({
        planningSignals: {
          evidenceInsightCount: 3,
          visualClassCount: 2,
          buyerQuestionCount: 4,
        },
      }),
    );
  });

  test('rejects reordered semantic duplicates across campaign opening, promise and core', () => {
    expect(
      assessCampaignContinuity([
        {
          topic: 'Mapa',
          title: 'Kontext v priestore',
          opening: 'Mapa ukáže kontext.',
          promise: 'Ukážeme rozhodovací kontext.',
          core: 'Mapa zasadí dáta do priestoru.',
        },
        {
          topic: 'Mapa',
          title: 'Priestorový kontext',
          opening: 'Kontext ukáže mapa.',
          promise: 'Rozhodovací kontext vám ukážeme.',
          core: 'Dáta zasadí do priestoru práve mapa.',
        },
      ]),
    ).toMatchObject({ passed: false });
  });

  test.each([
    ['Mapa rozhoduje', 'Rozhoduje mapa'],
    ['Mapa ukáže kontext', 'Mapou ukazujeme kontext'],
    ['Modernizovať či prepísať', 'Prepísať alebo modernizovať'],
  ])('rejects short or morphological continuity sibling “%s” / “%s”', (left, right) => {
    expect(
      assessCampaignContinuity([
        {
          topic: 'A',
          title: 'A',
          opening: left,
          promise: 'Prvý prísľub o produkte',
          core: 'Prvé jadro o produkte',
        },
        {
          topic: 'B',
          title: 'B',
          opening: right,
          promise: 'Druhý prísľub o prevádzke',
          core: 'Druhé jadro o prevádzke',
        },
      ]),
    ).toMatchObject({ passed: false });
  });

  test('keeps genuinely distinct campaign questions separate', () => {
    expect(
      assessCampaignContinuity([
        {
          topic: 'Mapa',
          title: 'Cenový kontext',
          opening: 'Kde mapa ukáže cenový kontext?',
          promise: 'Vysvetlíme priestorové rozhodnutie.',
          core: 'Mapa spája ponuku s lokalitou.',
        },
        {
          topic: 'Trend',
          title: 'Časový trend',
          opening: 'Kedy tabuľka odhalí časový trend?',
          promise: 'Vysvetlíme porovnanie období.',
          core: 'Tabuľka zoradí vývoj v čase.',
        },
      ]),
    ).toMatchObject({ passed: true });
  });

  test('binds TopicRequest and all workflow evidence into the approval digest', () => {
    const draft = createFixtureDraft();
    const baseline = computeApprovalDigest(draft);
    const topicRequest = {
      topic: 'Ako modernizovať systém',
      audience: 'Majitelia a riaditelia slovenských firiem.',
      goal: 'consideration',
      mode: 'auto' as const,
      projectUrls: ['https://rise.sk/portfolio/slates'],
      sourceUrls: ['https://rise.sk/portfolio/slates'],
      allowGenerativeVisuals: false,
    };
    const withRequest = DraftPackSchema.parse({
      ...draft,
      workflowContext: {
        topicRequest,
        claimLedger: [],
        visualDirections: [],
        assetRights: [],
        cropsRedactions: [],
        generationProvenance: [],
      },
    });

    expect(withRequest.workflowContext?.topicRequest).toEqual(topicRequest);
    expect(computeApprovalDigest(withRequest)).not.toBe(baseline);
  });
});
