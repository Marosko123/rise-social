import { describe, expect, test, vi } from 'vitest';

import { SocialPackOrchestrator, type AgentRunner } from '@/agents/socialPackOrchestrator';
import { sanitizeAgentEnvironment } from '@/agents/cliAgentRunner';
import { fetchPublicSource } from '@/research/fetchPublicSource';

import { createFixtureDraft } from './fixtures';

describe('SocialPackOrchestrator', () => {
  test('uses one allowed revision and a second independent validation for a failed review', async () => {
    const fixture = createFixtureDraft();
    const singleDraft = {
      ...fixture,
      sources: fixture.sources.slice(0, 1),
      claims: fixture.claims.slice(0, 1),
      posts: fixture.posts.slice(0, 1),
    };
    const calls: { model: string; prompt: string }[] = [];
    const runner: AgentRunner = {
      async run(model, prompt) {
        calls.push({ model, prompt });
        if (calls.length === 2) {
          return JSON.stringify({
            approved: false,
            blocker: true,
            issues: ['Skráťte úvod pre LinkedIn.'],
            revisionInstructions: 'Zachovajte fakty a upravte iba rytmus úvodu.',
            scorecard: {
              factualAccuracy: 4,
              voice: 3,
              specificity: 4,
              continuity: 4,
              visualClarity: 4,
              businessFit: 4,
              passed: false,
              notes: ['Úvod potrebuje úpravu.'],
            },
          });
        }
        if (calls.length === 4) {
          return JSON.stringify({
            approved: true,
            blocker: false,
            issues: [],
            revisionInstructions: '',
            scorecard: {
              factualAccuracy: 4,
              voice: 4,
              specificity: 4,
              continuity: 4,
              visualClarity: 4,
              businessFit: 4,
              passed: true,
              notes: ['Revidovaný návrh prešiel nezávislou kontrolou.'],
            },
          });
        }
        return JSON.stringify(singleDraft);
      },
    };
    const sourceDocuments = fixture.sources.map(source => ({
      url: source.url,
      title: source.title,
      publisher: source.publisher,
      checkedAt: source.checkedAt,
      text: source.claim,
    }));
    const orchestrator = new SocialPackOrchestrator(runner);

    const first = await orchestrator.prepare({
      brief: 'Priprav tri konkrétne príspevky.',
      sourceDocuments,
      previousCaptions: ['Starší príspevok o návrhu produktu.'],
      runNumber: 1,
      now: new Date('2026-07-24T08:00:00.000Z'),
    });
    expect(first.author).toBe('codex');
    expect(first.critic).toBe('claude');
    expect(first.posts).toHaveLength(1);
    expect(calls.map(call => call.model)).toEqual(['codex', 'claude', 'codex', 'claude']);
    expect(calls[0].prompt).toContain('posts: exactly 1 post');
    expect(calls[2].prompt).toContain('Skráťte úvod pre LinkedIn.');
    expect(calls[2].prompt).toContain('https://rise.sk/decision-education');
    expect(calls.every(call => call.prompt.includes('Starší príspevok'))).toBe(true);
    expect(first.scorecard.businessFit).toBe(4);
    expect(first.posts[0].platforms.instagram.scheduledFor).toBe('2026-07-27T10:00:00.000Z');
  });

  test('rejects a final draft with an invented source', async () => {
    const fixture = createFixtureDraft();
    const invented = structuredClone(fixture);
    invented.sources[0].url = 'https://invented.example/case-study';
    invented.claims[0].sourceUrl = 'https://invented.example/case-study';
    invented.sources = invented.sources.slice(0, 1);
    invented.claims = invented.claims.slice(0, 1);
    invented.posts = invented.posts.slice(0, 1);
    let call = 0;
    const runner: AgentRunner = {
      async run() {
        call += 1;
        if (call === 2) {
          return JSON.stringify({
            approved: false,
            blocker: true,
            issues: ['Overte zdroje.'],
            revisionInstructions: 'Použite iba dodané zdroje.',
            scorecard: {
              factualAccuracy: 1,
              voice: 4,
              specificity: 4,
              continuity: 4,
              visualClarity: 4,
              businessFit: 4,
              passed: false,
              notes: ['Zdroj nie je schválený.'],
            },
          });
        }
        return JSON.stringify(invented);
      },
    };
    const sourceDocuments = fixture.sources.map(source => ({
      url: source.url,
      title: source.title,
      publisher: source.publisher,
      checkedAt: source.checkedAt,
      text: source.claim,
    }));

    await expect(
      new SocialPackOrchestrator(runner).prepare({
        brief: '',
        sourceDocuments,
        runNumber: 1,
        now: new Date('2026-07-24T08:00:00.000Z'),
      }),
    ).rejects.toThrow(/not present in the approved research set/i);
  });

  test('stops risk-flagged topic requests before the author call unless explicitly approved', async () => {
    const runner: AgentRunner = { run: async () => JSON.stringify(createFixtureDraft()) };
    const sourceDocuments = createFixtureDraft().sources.map(source => ({
      url: source.url,
      title: source.title,
      publisher: source.publisher,
      checkedAt: source.checkedAt,
      text: source.claim,
    }));
    const run = vi.spyOn(runner, 'run');

    await expect(
      new SocialPackOrchestrator(runner).prepare({
        topicRequest: {
          topic: 'Klientsky výsledok s úsporou 40 %.',
          audience: 'Firmy',
          goal: 'Vysvetliť výsledok',
          mode: 'campaign',
          allowGenerativeVisuals: true,
        },
        sourceDocuments,
        runNumber: 1,
      }),
    ).rejects.toThrow(/human approval/i);
    expect(run).not.toHaveBeenCalled();
  });

  test('stops a generative-visual request without explicit human approval before the author call', async () => {
    const runner: AgentRunner = { run: async () => JSON.stringify(createFixtureDraft()) };
    const run = vi.spyOn(runner, 'run');
    const sourceDocuments = createFixtureDraft().sources.map(source => ({
      url: source.url,
      title: source.title,
      publisher: source.publisher,
      checkedAt: source.checkedAt,
      text: source.claim,
    }));

    await expect(
      new SocialPackOrchestrator(runner).prepare({
        topicRequest: {
          topic: 'Prvý automatizovaný krok.',
          audience: 'Produktové tímy',
          goal: 'Vysvetliť postup',
          mode: 'single',
          allowGenerativeVisuals: true,
        },
        sourceDocuments,
        runNumber: 1,
      }),
    ).rejects.toThrow(/human approval/i);
    expect(run).not.toHaveBeenCalled();
  });

  test('stops an unapproved explicit editorial risk even when the topic classifier is benign', async () => {
    const runner: AgentRunner = { run: async () => JSON.stringify(createFixtureDraft()) };
    const run = vi.spyOn(runner, 'run');
    const sourceDocuments = createFixtureDraft().sources.map(source => ({
      url: source.url,
      title: source.title,
      publisher: source.publisher,
      checkedAt: source.checkedAt,
      text: source.claim,
    }));

    await expect(
      new SocialPackOrchestrator(runner).prepare({
        topicRequest: {
          topic: 'Prvý automatizovaný krok.',
          audience: 'Produktové tímy',
          goal: 'Vysvetliť postup',
          mode: 'single',
          allowGenerativeVisuals: false,
        },
        editorialBrief: {
          buyerQuestion: 'Kde začať?',
          risePerspective: 'Začíname pracovným tokom.',
          desiredAction: 'Vybrať prvý krok.',
          businessFit: 'Pomáha prioritizovať investíciu.',
          riskFlags: ['non-public-story'],
          approvalState: 'pending',
        },
        sourceDocuments,
        runNumber: 1,
      }),
    ).rejects.toThrow(/human approval/i);
    expect(run).not.toHaveBeenCalled();
  });

  test('unions risk from the exact final brief before the author call', async () => {
    const fixture = createFixtureDraft();
    const source = fixture.sources[0];
    const claim = {
      ...fixture.claims[0],
      risk: 'stable' as const,
      expiresAt: '2027-07-24T08:00:00.000Z',
    };
    const runner: AgentRunner = { run: async () => JSON.stringify(fixture) };
    const run = vi.spyOn(runner, 'run');

    await expect(
      new SocialPackOrchestrator(runner).prepare({
        brief: 'Bezpečná téma.\n\nPripomienka:\nKlientský výsledok s úsporou 40 % a meno CEO.',
        topicRequest: {
          topic: 'Bezpečná téma.',
          audience: 'Majitelia firiem',
          goal: 'consideration',
          mode: 'single',
          allowGenerativeVisuals: false,
        },
        sourceDocuments: [{ ...source, text: source.claim }],
        claimLedger: [claim],
        runNumber: 1,
        now: new Date('2026-07-25T00:00:00.000Z'),
      }),
    ).rejects.toThrow(/risk|approval/i);

    expect(run).not.toHaveBeenCalled();
  });

  test('rejects a draft source whose checked date differs from the approved document', async () => {
    const fixture = createFixtureDraft();
    const draft = {
      ...fixture,
      sources: fixture.sources.slice(0, 1),
      claims: fixture.claims.slice(0, 1),
      posts: fixture.posts.slice(0, 1),
    };
    const sourceDocuments = draft.sources.map(source => ({
      url: source.url,
      title: source.title,
      publisher: source.publisher,
      checkedAt: '2026-07-25T08:00:00.000Z',
      text: source.claim,
    }));
    const runner: AgentRunner = { run: async () => JSON.stringify(draft) };

    await expect(
      new SocialPackOrchestrator(runner).prepare({
        brief: 'Jeden zdrojovaný príspevok.',
        sourceDocuments,
        runNumber: 1,
      }),
    ).rejects.toThrow(/checked date.*approved research/i);
  });
});

describe('public research ingestion', () => {
  test('pins the validated DNS snapshot into the HTTPS transport without a second lookup', async () => {
    let resolutions = 0;
    const transportCalls: Array<{
      pinned: { address: string; family: 4 | 6 };
      redirect?: RequestRedirect;
    }> = [];

    const document = await fetchPublicSource(
      'https://safe.example/article',
      ['safe.example'],
      undefined,
      new Date('2026-07-25T00:00:00.000Z'),
      {
        resolver: async () => {
          resolutions += 1;
          return [{ address: '93.184.216.34', family: 4 }];
        },
        transport: async (_url, init, pinned) => {
          transportCalls.push({ pinned, redirect: init.redirect });
          return new Response(
            '<html><head><title>Safe</title></head><body><main><p>Verejný zdroj.</p></main></body></html>',
            { status: 200, headers: { 'content-type': 'text/html' } },
          );
        },
      },
    );

    expect(resolutions).toBe(1);
    expect(transportCalls).toEqual([
      {
        pinned: { address: '93.184.216.34', family: 4 },
        redirect: 'error',
      },
    ]);
    expect(document.text).toBe('Verejný zdroj.');
  });

  test('extracts concise text from an approved public HTML page', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(
        '<html><head><title> GrantAI | Rise </title></head><body><nav>Menu</nav><main><h1>GrantAI</h1><p>Pracuje s verejnými grantovými podkladmi.</p></main><script>secret()</script></body></html>',
        {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        },
      );

    const source = await fetchPublicSource(
      'https://rise.sk/portfolio/grant-ai',
      ['rise.sk'],
      fetcher,
      new Date('2026-07-24T08:00:00.000Z'),
    );

    expect(source.title).toBe('GrantAI | Rise');
    expect(source.text).toContain('GrantAI Pracuje s verejnými grantovými podkladmi.');
    expect(source.text).not.toContain('Menu');
    expect(source.text).not.toContain('secret');
  });

  test('does not pass social publishing credentials to model processes', () => {
    const sanitized = sanitizeAgentEnvironment({
      PATH: '/usr/bin',
      HOME: '/tmp/home',
      OPENAI_API_KEY: 'model-auth',
      ANTHROPIC_API_KEY: 'model-auth',
      GROQ_API_KEY: 'must-not-leak',
      BUFFER_API_KEY: 'must-not-leak',
      CLOUDINARY_API_SECRET: 'must-not-leak',
    });

    expect(sanitized.PATH).toBe('/usr/bin');
    expect(sanitized.OPENAI_API_KEY).toBeUndefined();
    expect(sanitized.ANTHROPIC_API_KEY).toBeUndefined();
    expect(sanitized.GROQ_API_KEY).toBeUndefined();
    expect(sanitized.BUFFER_API_KEY).toBeUndefined();
    expect(sanitized.CLOUDINARY_API_SECRET).toBeUndefined();
  });
});
