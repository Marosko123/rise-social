import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { computeApprovalDigest } from '@/domain/approval';
import { ContentRunSchema, DraftPackSchema, type ContentRun, type DraftPack } from '@/domain/schemas';
import { createDefaultSchedule } from '@/domain/schedule';
import { validateDraftPack } from '@/domain/validation';
import { RunRepository } from '@/storage/runRepository';
import { createDemoRun } from '@/demo/createDemoRun';

function makeDraft(): DraftPack {
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
  const platformPost = (platform: 'instagram' | 'linkedin' | 'facebook', caption: string) => ({
    platform,
    caption,
    altText: 'Ukážka obrazovky produktu Rise s vysvetlením pracovného postupu.',
    scheduledFor: `2026-07-${platform === 'instagram' ? '27T10' : platform === 'linkedin' ? '27T14' : '27T15'}:00:00.000Z`,
  });

  return DraftPackSchema.parse({
    schemaVersion: 1,
    brief: 'Ukážme, ako Rise navrhuje interné systémy.',
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
    sources: [
      {
        id: 'source-ai-erp',
        url: 'https://rise.sk/portfolio/ai-erp',
        title: 'AI ERP',
        publisher: 'Rise',
        checkedAt,
        claim: 'Rise verejne predstavuje AI ERP ako vlastný produkt.',
      },
      {
        id: 'source-grant-ai',
        url: 'https://rise.sk/portfolio/grant-ai',
        title: 'GrantAI',
        publisher: 'Rise',
        checkedAt,
        claim: 'GrantAI je verejne prezentovaný produkt Rise.',
      },
      {
        id: 'source-team',
        url: 'https://rise.sk/o-nas',
        title: 'O nás',
        publisher: 'Rise',
        checkedAt,
        claim: 'Rise zverejňuje spôsob práce svojho tímu.',
      },
    ],
    posts: [
      {
        id: 'education',
        theme: 'education',
        title: 'Najprv proces. Potom AI.',
        summary: 'Praktický pohľad na automatizáciu interného procesu.',
        sourceIds: ['source-ai-erp'],
        visualKind: 'branded-diagram',
        slides: [
          { id: '1', eyebrow: '01', title: 'Najprv proces', body: 'Bez jasného procesu AI iba zrýchli chaos.', alt: 'Titulná karta o návrhu procesu.' },
          { id: '2', eyebrow: '02', title: 'Nájdite úzke miesto', body: 'Sledujte, kde ľudia údaje prepisujú ručne.', alt: 'Karta o hľadaní úzkeho miesta.' },
          { id: '3', eyebrow: '03', title: 'Overte dáta', body: 'Automatizácia stojí na spoľahlivých vstupoch.', alt: 'Karta o overení dát.' },
          { id: '4', eyebrow: '04', title: 'Až potom automatizujte', body: 'Malý overený krok je lepší než veľký sľub.', alt: 'Záverečná karta o automatizácii.' },
        ],
        platforms: {
          instagram: platformPost('instagram', 'AI nevyrieši nejasný proces. Najprv hľadáme miesto, kde sa práca opakuje. Potom meriame, čo sa dá bezpečne zmeniť. #automatizacia #softver'),
          linkedin: platformPost('linkedin', 'Pri automatizácii nezačíname modelom. Začíname procesom, ktorý ľudia každý deň obchádzajú alebo ručne opravujú. Až potom má zmysel hovoriť o AI. #automatizacia #softver'),
          facebook: platformPost('facebook', 'Kde začať s automatizáciou? Pri kroku, ktorý ľudia opakujú a ručne opravujú. Nie pri výbere AI nástroja.'),
        },
      },
      {
        id: 'product',
        theme: 'product',
        title: 'GrantAI bez prepisovania podkladov',
        summary: 'Verejný produktový príbeh GrantAI.',
        sourceIds: ['source-grant-ai'],
        visualKind: 'product-screenshot',
        slides: [
          { id: '1', eyebrow: '01', title: 'GrantAI', body: 'Produktový pohľad bez marketingovej vaty.', alt: 'Titulná karta GrantAI.' },
          { id: '2', eyebrow: '02', title: 'Jeden zdroj', body: 'Podklady zostávajú dohľadateľné na jednom mieste.', alt: 'Karta o zdrojoch podkladov.' },
          { id: '3', eyebrow: '03', title: 'Menej prepisovania', body: 'Tím pracuje s rovnakými údajmi.', alt: 'Karta o znížení ručného prepisovania.' },
          { id: '4', eyebrow: '04', title: 'Jasný ďalší krok', body: 'Výsledok musí byť použiteľný v reálnej práci.', alt: 'Záverečná produktová karta.' },
        ],
        platforms: {
          instagram: platformPost('instagram', 'GrantAI sme navrhli okolo práce s podkladmi. Nie okolo zoznamu funkcií. V karuseli ukazujeme, prečo na tom záleží. #grantai #produkt'),
          linkedin: platformPost('linkedin', 'Pri GrantAI je podstatný pracovný postup. Podklady musia zostať dohľadateľné a výsledok musí viesť k jasnému ďalšiemu kroku. #produkt #softver'),
          facebook: platformPost('facebook', 'GrantAI staviame okolo práce s podkladmi. Pozrite si štyri rozhodnutia, ktoré držia produkt pri zemi.'),
        },
      },
      {
        id: 'human',
        theme: 'human',
        title: 'Dobré zadanie vzniká pri stole',
        summary: 'Pohľad tímu Rise na začiatok spolupráce.',
        sourceIds: ['source-team'],
        visualKind: 'team-photo',
        slides: [
          { id: '1', eyebrow: '01', title: 'Najprv otázky', body: 'Dobré zadanie nevzniká zo šablóny.', alt: 'Titulná karta o tímovej práci.' },
          { id: '2', eyebrow: '02', title: 'Ako pracujete dnes', body: 'Potrebujeme vidieť skutočný postup, nie ideálny diagram.', alt: 'Karta o súčasnom pracovnom postupe.' },
          { id: '3', eyebrow: '03', title: 'Čo vás brzdí', body: 'Konkrétny problém určuje poradie práce.', alt: 'Karta o konkrétnom probléme.' },
          { id: '4', eyebrow: '04', title: 'Čo zatiaľ nerobiť', body: 'Rozsah držíme malý, kým nemáme dôkaz.', alt: 'Záverečná karta o rozsahu.' },
        ],
        platforms: {
          instagram: platformPost('instagram', 'Na prvom stretnutí nehľadáme názov technológie. Pýtame sa, ako práca vyzerá dnes a kde sa stráca čas. #timrise #vyvoj'),
          linkedin: platformPost('linkedin', 'Dobré technické zadanie často vznikne pri obyčajnom rozhovore o tom, ako firma pracuje dnes. Technológia prichádza až po konkrétnom probléme. #vyvoj #produkt'),
          facebook: platformPost('facebook', 'Na začiatku projektu sa pýtame hlavne na dnešný spôsob práce. Technológiu vyberáme až vtedy, keď poznáme problém.'),
        },
      },
    ],
  });
}

const tempDirectories: string[] = [];

afterEach(() => {
  tempDirectories.length = 0;
});

describe('domain contract', () => {
  test('migrates legacy themes and requires distinct editorial pillars', () => {
    const draft = makeDraft();
    const duplicate = {
      ...draft,
      posts: [draft.posts[0], draft.posts[0], draft.posts[2]],
    };

    expect(() => DraftPackSchema.parse(duplicate)).toThrow(/pillar/i);
  });

  test('reports unsupported claims and AI-like Slovak copy', () => {
    const draft = makeDraft();
    draft.posts[0].sourceIds = ['missing-source'];
    draft.posts[0].platforms.linkedin.caption =
      'V dnešnom rýchlo sa meniacom svete odomkneme váš potenciál — bez starostí. #a #b #c #d #e #f';

    const issues = validateDraftPack(draft);

    expect(issues.map(issue => issue.code)).toEqual(
      expect.arrayContaining(['missing-source', 'banned-phrase', 'banned-punctuation', 'too-many-hashtags']),
    );
  });

  test('rejects an opening already used in prior Rise content', () => {
    const draft = makeDraft();
    const issues = validateDraftPack(draft, [
      draft.posts[0].platforms.instagram.caption,
    ]);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'duplicate-opening',
          path: 'posts.0.platforms.instagram.caption',
        }),
      ]),
    );
  });

  test('builds three weekday slots with platform-specific Bratislava times', () => {
    const schedule = createDefaultSchedule(new Date('2026-07-24T10:00:00.000Z'));

    expect(schedule.map(slot => slot.localDate)).toEqual(['2026-07-27', '2026-07-29', '2026-07-31']);
    expect(schedule[0].byPlatform.instagram).toBe('2026-07-27T10:00:00.000Z');
    expect(schedule[0].byPlatform.linkedin).toBe('2026-07-27T14:00:00.000Z');
    expect(schedule[0].byPlatform.facebook).toBe('2026-07-27T15:00:00.000Z');
  });

  test('creates a stable digest that changes after an approved field changes', () => {
    const draft = makeDraft();
    const first = computeApprovalDigest(draft);
    const identical = computeApprovalDigest(structuredClone(draft));
    const changed = structuredClone(draft);
    changed.posts[0].platforms.instagram.caption += ' Doplnené.';

    expect(identical).toBe(first);
    expect(computeApprovalDigest(changed)).not.toBe(first);
  });
});

describe('RunRepository', () => {
  test('rejects approval while mandatory workflow review and visual gates are incomplete', () => {
    const directory = mkdtempSync(join(tmpdir(), 'rise-social-'));
    tempDirectories.push(directory);
    const repository = new RunRepository(join(directory, 'studio.sqlite'));
    const run = createDemoRun(new Date('2026-07-24T08:00:00.000Z'));
    repository.save(run);

    expect(() =>
      repository.approve(run.id, 'export', '2026-07-24T09:05:00.000Z'),
    ).toThrow(/workflow|review|approval|visual/i);
  });

  test('stores a run, approves its current digest, and invalidates approval on edit', () => {
    const directory = mkdtempSync(join(tmpdir(), 'rise-social-'));
    tempDirectories.push(directory);
    const repository = new RunRepository(join(directory, 'studio.sqlite'));
    const now = '2026-07-24T09:00:00.000Z';
    const run: ContentRun = ContentRunSchema.parse({
      id: 'run-20260724',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      revision: 1,
      qualifiedConversations: 0,
      draft: makeDraft(),
    });

    repository.save(run);
    const approved = repository.approve(run.id, 'export', '2026-07-24T09:05:00.000Z');

    expect(approved.status).toBe('approved');
    expect(approved.approval?.digest).toBe(computeApprovalDigest(run.draft));

    const editedDraft = structuredClone(approved.draft);
    editedDraft.posts[2].summary = 'Spresnený pohľad tímu.';
    const edited = repository.updateDraft(run.id, editedDraft, '2026-07-24T09:06:00.000Z');

    expect(edited.status).toBe('draft');
    expect(edited.revision).toBe(2);
    expect(edited.approval).toBeUndefined();
    expect(repository.get(run.id)?.draft.posts[2].summary).toBe('Spresnený pohľad tímu.');
  });

  test('records qualified conversations without changing the approved content digest', () => {
    const directory = mkdtempSync(join(tmpdir(), 'rise-social-'));
    tempDirectories.push(directory);
    const repository = new RunRepository(join(directory, 'studio.sqlite'));
    const now = '2026-07-24T09:00:00.000Z';
    const run = ContentRunSchema.parse({
      id: 'run-metrics',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      revision: 1,
      qualifiedConversations: 0,
      draft: makeDraft(),
    });
    repository.save(run);
    const approved = repository.approve(run.id, 'export', '2026-07-24T09:05:00.000Z');

    const updated = repository.updateQualifiedConversations(
      run.id,
      3,
      '2026-07-24T09:06:00.000Z',
    );

    expect(updated.qualifiedConversations).toBe(3);
    expect(updated.approval).toEqual(approved.approval);
    expect(updated.revision).toBe(1);
  });

  test('stores board and archive receipts without changing the approved digest', () => {
    const directory = mkdtempSync(join(tmpdir(), 'rise-social-'));
    const repository = new RunRepository(join(directory, 'studio.sqlite'));
    const now = '2026-07-24T09:00:00.000Z';
    const run = ContentRunSchema.parse({
      id: 'run-board',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      revision: 1,
      qualifiedConversations: 0,
      draft: makeDraft(),
    });
    repository.save(run);
    const approved = repository.approve(run.id, 'export', now);
    const synced = repository.recordBoardSync(run.id, {
      boardLink: {
        provider: 'github',
        issueId: '9',
        issueNumber: 9,
        issueUrl: 'https://github.com/Marosko123/rise-social/issues/9',
      },
      receipt: {
        runId: run.id,
        idempotencyKey: 'board-key',
        status: 'synced',
        attemptedAt: now,
        dryRun: false,
      },
    });
    const archived = repository.recordArchive(run.id, {
      runId: run.id,
      digest: approved.approval!.digest,
      archivedAt: now,
      revision: 1,
      approvedOnly: true,
      files: ['carousel.pdf'],
    });

    expect(synced.approval).toEqual(approved.approval);
    expect(archived.status).toBe('archived');
    expect(archived.archiveManifest?.digest).toBe(approved.approval?.digest);
  });
});
