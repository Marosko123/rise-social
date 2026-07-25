// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ReviewStudio } from '@/components/ReviewStudio';
import { createDemoDraft } from '@/demo/createDemoDraft';
import { assertLocalMutationRequest } from '@/server/requestSecurity';

import { createFixtureRun } from './fixtures';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ReviewStudio', () => {
  test('shows a count-derived review with evidence, grid, and manual approval', () => {
    const run = createFixtureRun(false);
    run.boardLink = {
      provider: 'youtrack',
      issueId: 'RISE-12',
      issueUrl: 'https://rise.youtrack.cloud/issue/RISE-12',
      boardUrl: 'https://rise.youtrack.cloud/agiles/204-1/current',
    };
    render(<ReviewStudio initialRun={run} publishingReady={false} />);

    expect(screen.getByText('3-príspevkový balík')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'Najprv proces' })).toBeInTheDocument();
    expect(screen.getByText('Instagram grid')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn dokument')).toBeInTheDocument();
    expect(screen.getByText('Facebook crop')).toBeInTheDocument();
    expect(screen.getByText(/Koncept · nie je publikované/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText('Náhľad Instagram gridu').querySelectorAll('.grid-tile'),
    ).toHaveLength(9);
    expect(screen.getByText('Overené zdroje')).toBeInTheDocument();
    expect(screen.getByText('Dôkazy tvrdení')).toBeInTheDocument();
    expect(screen.getByText('Editorská kontrola')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Content plán' })).toHaveAttribute(
      'href',
      '/content-plan',
    );
    expect(screen.getByRole('link', { name: /YouTrack RISE-12/i })).toHaveAttribute(
      'href',
      'https://rise.youtrack.cloud/issue/RISE-12',
    );
    expect(screen.getByRole('button', { name: 'Schváliť a exportovať' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Schváliť a naplánovať' })).not.toBeInTheDocument();
  });

  test('renders the public review as a read-only, not-published showcase', () => {
    render(
      <ReviewStudio
        initialRun={createFixtureRun(false)}
        publishingReady
        mode="public-readonly"
      />,
    );

    expect(
      screen.getByRole('status', { name: 'Verejná read-only ukážka' }),
    ).toHaveTextContent(/nič nie je publikované/i);
    expect(screen.getByText('LinkedIn dokument')).toBeInTheDocument();
    expect(screen.getByText('Facebook crop')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Náhľad Instagram gridu').querySelectorAll('.grid-tile'),
    ).toHaveLength(9);
    expect(screen.getByLabelText('Náhľad strán LinkedIn PDF').children.length).toBeGreaterThanOrEqual(4);
    expect(screen.getByLabelText('Náhľad strán LinkedIn PDF').children.length).toBeLessThanOrEqual(8);

    expect(screen.queryByLabelText('Čas pre Instagram')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Kvalifikované rozhovory')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Schváliť/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /exportovať/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /naplánovať/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Uložiť výsledok/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Požiadať o úpravy/i })).not.toBeInTheDocument();
  });

  test('shows stored brief, campaign, rights, visual QA, provenance and human checkpoints', () => {
    const run = createFixtureRun(false);
    run.draft.workflowContext = {
      editorialBrief: {
        topic: 'Bezpečný AI workflow',
        audience: 'owners',
        goal: 'consideration',
        buyerQuestion: 'Čo musí zostať pod kontrolou človeka?',
        risePerspective: 'Automatizácia potrebuje dôkazy a jasné hranice.',
        businessFit: 'Ukazuje spôsob zodpovednej dodávky Rise.',
        desiredAction: 'Otvoriť diskusiu o pracovnom toku.',
        riskFlags: [],
      },
      campaignDecision: {
        requestedMode: 'auto',
        resolvedMode: 'single',
        reason: 'Jedna jasná otázka kupujúceho.',
        postCount: 1,
        distinctInsightCount: 1,
        visualEvidenceClassCount: 1,
        buyerQuestionCount: 1,
        duplicateOpenings: false,
      },
      claimLedger: [],
      visualDirections: [{
        id: 'direction-1',
        visualClass: 'branded-diagram',
        rationale: 'Vysvetlí human gate bez falošného UI.',
        narrative: 'Téma → dôkaz → kontrola → človek.',
        layout: 'decision-note',
        assetIds: ['asset-1'],
        crop: '4:5 center safe',
        safeZones: ['84 px'],
        allowGenerativeVisuals: false,
      }],
      assetRights: [{
        assetId: 'asset-1',
        status: 'confirmed',
        reference: 'Rise-owned diagram',
      }],
      cropsRedactions: [{
        assetId: 'asset-1',
        crop: '4:5 center safe',
        redactions: [],
      }],
      visualQaFindings: [{
        visualDirectionId: 'direction-1',
        status: 'pass',
        findings: ['Kontrast AA a bezpečný 84 px okraj.'],
        altTextPassed: true,
        cropPassed: true,
        humanInspectionRequired: true,
      }],
      generationProvenance: [{
        visualDirectionId: 'direction-1',
        model: 'approved-local-model',
        prompt: 'Abstract material layers, no text, no people.',
        negativePrompt: 'text, logo, UI, people, chart',
        referenceAssetIds: [],
        parameters: {},
        disclosure: 'Abstraktné editoriálne pozadie vytvorené AI.',
        generatedAt: '2026-07-24T09:00:00.000Z',
        generationApproved: true,
        generationApprovedAt: '2026-07-24T08:00:00.000Z',
        width: 1080,
        height: 1350,
        allowGenerativeVisuals: true,
        subject: 'abstract',
      }],
    } as never;

    render(<ReviewStudio initialRun={run} publishingReady={false} />);

    expect(screen.getByText('Biznisový brief')).toBeInTheDocument();
    expect(screen.getByText(/jeden post · 1 príspevok/i)).toBeInTheDocument();
    expect(screen.getByText('Rise-owned diagram')).toBeInTheDocument();
    expect(screen.getByText('Vizuálna QA')).toBeInTheDocument();
    expect(screen.getByText(/Kontrast AA/)).toBeInTheDocument();
    expect(screen.getByText(/Pôvod AI vizuálu/)).toBeInTheDocument();
    expect(screen.getByText('Ľudské checkpointy')).toBeInTheDocument();
    expect(screen.getByText(/Čaká na ľudské schválenie exportu/i)).toBeInTheDocument();
  });

  test('default demo exposes a safe v2 digest and all human checkpoints', () => {
    const run = createFixtureRun(false);
    run.draft = createDemoDraft(new Date('2026-07-24T08:00:00.000Z'));

    render(<ReviewStudio initialRun={run} publishingReady={false} />);

    expect(run.draft.schemaVersion).toBe(2);
    expect(run.draft.workflowContext).toBeDefined();
    expect(screen.getByText('Biznisový brief')).toBeInTheDocument();
    expect(screen.getByText('Vizuálna QA')).toBeInTheDocument();
    expect(screen.getByText('Ľudské checkpointy')).toBeInTheDocument();
    expect(screen.getByText(/Nezávislá kontrola/i)).toBeInTheDocument();
  });

  test('labels legacy v1-compatible runs honestly instead of hiding the missing digest', () => {
    const run = createFixtureRun(false);
    delete run.draft.workflowContext;

    render(<ReviewStudio initialRun={run} publishingReady={false} />);

    expect(screen.getByText('Starší pracovný balík')).toBeInTheDocument();
    expect(screen.getByText(/neobsahuje v2 schvaľovací digest/i)).toBeInTheDocument();
  });

  test('renders nine independently labelled grid tiles without repeated placeholders', () => {
    render(<ReviewStudio initialRun={createFixtureRun(false)} publishingReady={false} />);
    const tiles = Array.from(
      screen
        .getByLabelText('Náhľad Instagram gridu')
        .querySelectorAll<HTMLElement>('.grid-tile'),
    );
    const labels = tiles.map(tile => tile.textContent?.trim());

    expect(tiles).toHaveLength(9);
    expect(new Set(labels).size).toBe(9);
    expect(tiles.every(tile => tile.querySelector('strong'))).toBe(true);
    expect(tiles.every(tile => tile.querySelector('small'))).toBe(true);
    expect(tiles.every(tile => tile.querySelector('em'))).toBe(true);
    expect(labels.some(label => label?.includes('Samostatný tile'))).toBe(false);
  });

  test('uses natural Slovak review terminology', () => {
    const run = createFixtureRun(false);
    run.draft.workflowContext = {
      claimLedger: [],
      visualDirections: [],
      assetRights: [],
      cropsRedactions: [],
      generationProvenance: [],
      firstCritique: {
        approved: false,
        blocker: true,
        issues: ['Chýba zdroj.'],
        revisionInstructions: 'Doplňte zdroj.',
        scorecard: {
          factualAccuracy: 2,
          voice: 4,
          specificity: 4,
          continuity: 4,
          visualClarity: 4,
          businessFit: 3,
          passed: false,
          notes: [],
        },
      },
    };

    render(<ReviewStudio initialRun={run} publishingReady={false} />);

    expect(screen.getByText('Dôkazy tvrdení')).toBeInTheDocument();
    expect(screen.getByText('Editorská kontrola')).toBeInTheDocument();
    expect(screen.getByText('BLOKUJE')).toBeInTheDocument();
    expect(screen.queryByText('Claim evidence')).not.toBeInTheDocument();
    expect(screen.queryByText('Editorial scorecard')).not.toBeInTheDocument();
    expect(screen.queryByText('BLOCKER')).not.toBeInTheDocument();
  });

  test('derives one- and two-post summary counts from the current run', () => {
    const onePost = createFixtureRun(false);
    onePost.draft.posts = onePost.draft.posts.slice(0, 1);
    render(<ReviewStudio initialRun={onePost} publishingReady={false} />);
    expect(screen.getByText('1-príspevkový balík')).toBeInTheDocument();
    expect(screen.getByText(/1 téma, 3 verzie/)).toBeInTheDocument();
    cleanup();

    const twoPosts = createFixtureRun(false);
    twoPosts.draft.posts = twoPosts.draft.posts.slice(0, 2);
    render(<ReviewStudio initialRun={twoPosts} publishingReady={false} />);
    expect(screen.getByText('2-príspevkový balík')).toBeInTheDocument();
    expect(screen.getByText(/2 témy, 6 verzií/)).toBeInTheDocument();
  });

  test('renders persisted critique and final-validation evidence without presenting a blocker as approval', () => {
    const run = createFixtureRun(false);
    const blockedReview = {
      approved: false,
      blocker: true,
      issues: ['Chýba preukázaný zdroj.'],
      revisionInstructions: 'Vráťte sa k verejnému claim ledgeru.',
      scorecard: { factualAccuracy: 2, voice: 3, specificity: 4, continuity: 4, visualClarity: 3, businessFit: 2, passed: false, notes: ['Zdroj a vizuál treba opraviť.'] },
    };
    const finalReview = {
      approved: true,
      blocker: false,
      issues: [],
      revisionInstructions: '',
      scorecard: { factualAccuracy: 4, voice: 4, specificity: 4, continuity: 4, visualClarity: 4, businessFit: 4, passed: true, notes: ['Finálna nezávislá validácia.'] },
    };
    run.draft.workflowContext = {
      claimLedger: [], visualDirections: [], assetRights: [], cropsRedactions: [], generationProvenance: [],
      firstCritique: blockedReview, finalValidation: finalReview,
    };

    render(<ReviewStudio initialRun={run} publishingReady={false} />);
    expect(screen.getByText('Prvá kritika')).toBeInTheDocument();
    expect(screen.getByText('BLOKUJE')).toBeInTheDocument();
    expect(screen.getByText('Chýba preukázaný zdroj.')).toBeInTheDocument();
    expect(screen.getByText('Vráťte sa k verejnému claim ledgeru.')).toBeInTheDocument();
    expect(screen.getByText(/Fakty 2\/5/)).toBeInTheDocument();
    expect(screen.getByText('Finálna validácia')).toBeInTheDocument();
    expect(screen.getByText('PREŠLO')).toBeInTheDocument();
    expect(screen.getByText('Finálna nezávislá validácia.')).toBeInTheDocument();
  });

  test('switches platform copy and calls the approval endpoint only after a click', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ run: createFixtureRun(), downloadUrl: '/api/download' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<ReviewStudio initialRun={createFixtureRun(false)} publishingReady />);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Schváliť Buffer koncepty' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'LinkedIn' }));
    expect(screen.getByText(/Verzia pre linkedin/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Schváliť a exportovať' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/runs/run-fixture/approve',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'x-rise-social-action': 'approve' }),
          body: JSON.stringify({ action: 'export' }),
        }),
      ),
    );
  });

  test('saves an edited schedule and the qualified-conversation outcome explicitly', async () => {
    const scheduleUpdated = createFixtureRun(false);
    scheduleUpdated.revision = 2;
    scheduleUpdated.draft.posts[0].platforms.instagram.scheduledFor =
      '2026-07-28T10:00:00.000Z';
    const metricsUpdated = structuredClone(scheduleUpdated);
    metricsUpdated.qualifiedConversations = 2;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ run: scheduleUpdated }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ run: metricsUpdated }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    render(<ReviewStudio initialRun={createFixtureRun()} publishingReady={false} />);

    fireEvent.change(screen.getByLabelText('Čas pre Instagram'), {
      target: { value: '2026-07-28T12:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Uložiť čas' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        '/api/runs/run-fixture/schedule',
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    fireEvent.change(screen.getByLabelText('Kvalifikované rozhovory'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Uložiť výsledok' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/runs/run-fixture/metrics',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});

describe('local mutation protection', () => {
  test('accepts the local review origin and rejects an external origin', () => {
    expect(() =>
      assertLocalMutationRequest(
        new Request('http://127.0.0.1:4173/api/runs/x/approve', {
          method: 'POST',
          headers: {
            origin: 'http://127.0.0.1:4173',
            'x-rise-social-action': 'approve',
          },
        }),
        'approve',
      ),
    ).not.toThrow();

    expect(() =>
      assertLocalMutationRequest(
        new Request('http://127.0.0.1:4173/api/runs/x/approve', {
          method: 'POST',
          headers: {
            origin: 'https://attacker.example',
            'x-rise-social-action': 'approve',
          },
        }),
        'approve',
      ),
    ).toThrow(/local origin/i);
  });
});
