import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { computeApprovalDigest } from '@/domain/approval';
import { SocialPackOrchestrator, type AgentRunner } from '@/agents/socialPackOrchestrator';
import { AssetRecordSchema } from '@/domain/schemas';
import { assertFreshClaimLedger } from '@/workflow/sourceFreshness';
import { assessCampaignContinuity } from '@/workflow/continuity';
import { createEditorialBrief } from '@/workflow/topicIntake';
import { proposeMeasurementExperiment } from '@/workflow/measurement';

import { createFixtureDraft } from './fixtures';

const approvedReview = {
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
    notes: ['Overené.'],
  },
};

function singleTopicInputs() {
  const fixture = createFixtureDraft();
  const source = fixture.sources[0];
  const claim = fixture.claims[0];
  const draft = structuredClone({
    ...fixture,
    sources: [source],
    claims: [{ ...claim, risk: 'stable', expiresAt: '2027-07-24T08:00:00.000Z' }],
    posts: [fixture.posts[0]],
  });
  return {
    draft,
    sourceDocuments: [{ ...source, text: source.claim }],
    claimLedger: [{
      ...claim,
      risk: 'stable' as const,
      expiresAt: '2027-07-24T08:00:00.000Z',
    }],
    topicRequest: {
      topic: 'Rozhodnutie o automatizácii',
      audience: 'Majitelia firiem',
      goal: 'consideration',
      mode: 'single' as const,
      allowGenerativeVisuals: false,
    },
  };
}

const root = process.cwd();
const newSkills = [
  'rise-topic-intake',
  'rise-campaign-architect',
  'rise-asset-librarian',
  'rise-visual-director',
  'rise-generative-visual',
  'rise-visual-qa',
  'rise-content-measurement',
];

describe('Rise Social Studio v2 executable workflow', () => {
  test('turns a topic into a deterministic business brief with unioned risks', () => {
    const intake = createEditorialBrief({
      topic: 'Klientský výsledok automatizácie s úsporou 40 %',
      audience: 'Majitelia slovenských firiem',
      goal: 'consideration',
      mode: 'auto',
      allowGenerativeVisuals: false,
    });

    expect(intake.brief).toMatchObject({
      businessFit: expect.stringMatching(/softvér|automatiz/i),
      desiredAction: expect.any(String),
      approvalState: 'pending',
    });
    expect(intake.brief.riskFlags).toEqual(expect.arrayContaining(['client-result', 'metric']));
    expect(intake.buyerQuestion).toContain('Majitelia');
  });

  test('blocks expired facts and exact-source mismatches before a claim reaches drafting', () => {
    expect(() =>
      assertFreshClaimLedger(
        [
          {
            id: 'claim-fast',
            sourceId: 'rise-grantai',
            sourceUrl: 'https://rise.sk/portfolio/grantai',
            claim: 'Aktuálna AI novinka.',
            evidence: 'Verejný zdroj.',
            checkedAt: '2026-07-01T00:00:00.000Z',
            risk: 'fast-moving',
            expiresAt: '2026-07-08T00:00:00.000Z',
          },
        ],
        [{ id: 'rise-grantai', url: 'https://rise.sk/portfolio/grantai' }],
        new Date('2026-07-25T00:00:00.000Z'),
      ),
    ).toThrow(/expired/i);

    expect(() =>
      assertFreshClaimLedger(
        [
          {
            id: 'claim-bound',
            sourceId: 'rise-grantai',
            sourceUrl: 'https://rise.sk/other',
            claim: 'Overený fakt.',
            evidence: 'Verejný zdroj.',
            checkedAt: '2026-07-24T00:00:00.000Z',
            risk: 'stable',
            expiresAt: '2027-07-24T00:00:00.000Z',
          },
        ],
        [{ id: 'rise-grantai', url: 'https://rise.sk/portfolio/grantai' }],
        new Date('2026-07-25T00:00:00.000Z'),
      ),
    ).toThrow(/exact approved source/i);
  });

  test('rejects a campaign that repeats an opening, promise, or core', () => {
    const result = assessCampaignContinuity([
      {
        topic: 'MapaTrhu',
        title: 'Mapa pred tabuľkou',
        opening: 'Pri rozhodovaní nezačíname mapou.',
        promise: 'Ukážeme rozhodovací kontext.',
        core: 'Mapa dáta zasadí do priestoru.',
      },
      {
        topic: 'MapaTrhu',
        title: 'Mapa pred tabuľkou inak',
        opening: 'Pri rozhodovaní nezačíname mapou.',
        promise: 'Ukážeme rozhodovací kontext.',
        core: 'Rovnaký princíp v inom poradí.',
      },
    ]);

    expect(result.passed).toBe(false);
    expect(result.issues.join(' ')).toMatch(/opening|promise/i);
  });

  test('binds visual workflow evidence into the approval digest and proposes, never applies, a measurement experiment', () => {
    const draft = createFixtureDraft();
    const baseline = computeApprovalDigest(draft);
    const changed = structuredClone(draft) as typeof draft & {
      workflowContext?: unknown;
    };
    changed.workflowContext = {
      claimLedger: [],
      visualDirections: [{
        visualClass: 'product-screenshot',
        rationale: 'Reálny produktový dôkaz.',
        narrative: 'UI detail vysvetľuje rozhodnutie.',
        layout: 'split-detail',
        crop: 'center 4:5',
        safeZones: ['84 px'],
        assetIds: ['rise-home-product'],
        allowGenerativeVisuals: false,
      }],
      assetRights: [{ assetId: 'rise-home-product', status: 'confirmed' }],
      cropsRedactions: [{ assetId: 'rise-home-product', crop: 'center 4:5', redactions: [] }],
      generationProvenance: [],
    };

    expect(computeApprovalDigest(changed)).not.toBe(baseline);

    const rules = Object.freeze({ contentFrequency: 2, automaticRuleChanges: false });
    const proposal = proposeMeasurementExperiment(
      {
        platform: 'linkedin',
        format: 'pdf-carousel',
        postId: 'post-1',
        observedAt: '2026-07-25T00:00:00.000Z',
        periodStart: '2026-07-01T00:00:00.000Z',
        periodEnd: '2026-07-24T23:59:59.000Z',
        utm: { source: 'linkedin', medium: 'organic_social', campaign: 'rise_social_2026_07', content: 'post-1' },
        swipes: 23,
        saves: 12,
        shares: 4,
        clicks: 8,
        completion: 0.56,
        relevantComments: 2,
        profileVisits: 6,
        portfolioVisits: 5,
        contactVisits: 1,
        qualifiedConversations: 0,
      },
      rules,
    );

    expect(proposal).toMatchObject({ status: 'proposed', automaticRuleChange: false });
    expect(rules).toEqual({ contentFrequency: 2, automaticRuleChanges: false });
  });

  test('requires a fresh ledger for production topics, rejects claim drift and always runs final validation', async () => {
    const input = singleTopicInputs();
    const missingLedgerRunner: AgentRunner = { run: async () => JSON.stringify(input.draft) };
    await expect(
      new SocialPackOrchestrator(missingLedgerRunner).prepare({
        topicRequest: input.topicRequest,
        sourceDocuments: input.sourceDocuments,
        runNumber: 1,
        now: new Date('2026-07-25T00:00:00.000Z'),
      }),
    ).rejects.toThrow(/fresh claim ledger/i);

    const calls: string[] = [];
    const runner: AgentRunner = {
      run: async (_model, prompt) => {
        calls.push(prompt);
        return calls.length === 1 ? JSON.stringify(input.draft) : JSON.stringify(approvedReview);
      },
    };
    const output = await new SocialPackOrchestrator(runner).prepare({
      topicRequest: input.topicRequest,
      sourceDocuments: input.sourceDocuments,
      claimLedger: input.claimLedger,
      runNumber: 1,
      now: new Date('2026-07-25T00:00:00.000Z'),
    });
    expect(calls).toHaveLength(3);
    expect(calls[0]).toContain('Fresh claim ledger');
    expect(output.workflowContext?.claimLedger).toEqual(input.claimLedger);
    expect(output.workflowContext?.firstCritique).toEqual(approvedReview);
    expect(output.workflowContext?.finalValidation).toEqual(approvedReview);

    const drifted = structuredClone(input.draft);
    drifted.claims[0].evidence = 'Modelom zmenený excerpt.';
    const driftRunner: AgentRunner = { run: async () => JSON.stringify(drifted) };
    await expect(
      new SocialPackOrchestrator(driftRunner).prepare({
        topicRequest: input.topicRequest,
        sourceDocuments: input.sourceDocuments,
        claimLedger: input.claimLedger,
        runNumber: 1,
        now: new Date('2026-07-25T00:00:00.000Z'),
      }),
    ).rejects.toThrow(/claim ledger/i);
  });

  test('rejects media injected by author or revision unless it is bound to a selected approved asset', async () => {
    const input = singleTopicInputs();
    const injected = structuredClone(input.draft);
    injected.posts[0].slides[0].imagePath = '/private/client.png';
    const authorRunner: AgentRunner = { run: async () => JSON.stringify(injected) };
    await expect(
      new SocialPackOrchestrator(authorRunner).prepare({
        topicRequest: input.topicRequest, sourceDocuments: input.sourceDocuments, claimLedger: input.claimLedger,
        runNumber: 1, now: new Date('2026-07-25T00:00:00.000Z'),
      }),
    ).rejects.toThrow(/asset|media|image/i);

    const calls: string[] = [];
    const revised = structuredClone(input.draft);
    revised.posts[0].slides[0].imagePath = '/private/revised-client.png';
    const revisionRunner: AgentRunner = {
      run: async () => {
        calls.push('run');
        if (calls.length === 1) return JSON.stringify(input.draft);
        if (calls.length === 2) return JSON.stringify({
          ...approvedReview,
          approved: false,
          blocker: true,
          revisionInstructions: 'Upravte text.',
          scorecard: { ...approvedReview.scorecard, passed: false, voice: 3 },
        });
        return JSON.stringify(revised);
      },
    };
    await expect(
      new SocialPackOrchestrator(revisionRunner).prepare({
        topicRequest: input.topicRequest, sourceDocuments: input.sourceDocuments, claimLedger: input.claimLedger,
        runNumber: 1, now: new Date('2026-07-25T00:00:00.000Z'),
      }),
    ).rejects.toThrow(/asset|media|image/i);
    expect(calls).toHaveLength(3);
  });

  test('preflights unsafe selected visuals and validates measurement/intake semantics', async () => {
    const input = singleTopicInputs();
    const unsafe = AssetRecordSchema.parse({
      id: 'client-private', visualClass: 'product-screenshot', origin: 'client-approved',
      owner: 'Client', license: 'client-approved', project: 'Client', confidentiality: 'approval-required',
      allowedPlatforms: [], redactionStatus: 'pending', approved: false, rightsStatus: 'needs-confirmation',
    });
    const runner: AgentRunner = { run: async () => JSON.stringify(input.draft) };
    await expect(
      new SocialPackOrchestrator(runner).prepare({
        topicRequest: input.topicRequest,
        sourceDocuments: input.sourceDocuments,
        claimLedger: input.claimLedger,
        assetRecords: [unsafe],
        visualDirections: [{
          id: 'direction-client', visualClass: 'product-screenshot', rationale: 'test', narrative: 'test', layout: 'split-detail',
          assetIds: ['client-private'], crop: 'center', safeZones: ['84 px'], allowGenerativeVisuals: false,
        }],
        runNumber: 1,
      }),
    ).rejects.toThrow(/asset/i);

    const owned = AssetRecordSchema.parse({
      id: 'rise-owned', visualClass: 'branded-diagram', origin: 'rise-owned', owner: 'Rise.sk', license: 'owned',
      project: 'Rise.sk', confidentiality: 'public', allowedPlatforms: ['instagram', 'linkedin', 'facebook'],
      redactionStatus: 'not-required', approved: true, rightsStatus: 'confirmed', rightsReference: 'Rise ownership register',
    });
    await expect(
      new SocialPackOrchestrator(runner).prepare({
        topicRequest: { ...input.topicRequest, allowGenerativeVisuals: true },
        editorialBrief: {
          buyerQuestion: 'Aký vizuálny dôkaz pomôže?', risePerspective: 'Overený proces.', businessFit: 'Relevantné pre produkt.',
          desiredAction: 'Overiť prístup.', riskFlags: ['generative-image'], approvalState: 'approved',
        },
        sourceDocuments: input.sourceDocuments, claimLedger: input.claimLedger, assetRecords: [owned],
        visualDirections: [{ id: 'direction-ai', visualClass: 'branded-diagram', rationale: 'test', narrative: 'test', layout: 'diagram', assetIds: ['rise-owned'], crop: 'center', safeZones: ['84 px'], allowGenerativeVisuals: true }],
        generationRecipes: [{
          visualDirectionId: 'direction-ai', model: 'test', prompt: 'Human developer beside Rise logo and dashboard metrics.',
          negativePrompt: 'none', referenceAssetIds: ['rise-owned'], parameters: {}, disclosure: 'AI visual',
          generatedAt: '2026-07-25T00:00:00.000Z', generationApproved: true, generationApprovedAt: '2026-07-24T00:00:00.000Z',
          width: 1080, height: 1350, allowGenerativeVisuals: true, subject: 'abstract',
        }], runNumber: 1,
      }),
    ).rejects.toThrow(/ľudí|logo|textu|UI|metrík/i);

    expect(() => proposeMeasurementExperiment({
      platform: 'linkedin', format: 'text', postId: 'post-1', observedAt: '2026-07-25T00:00:00.000Z',
      periodStart: '2026-07-26T00:00:00.000Z', periodEnd: '2026-07-25T00:00:00.000Z',
      utm: { source: 'linkedin', medium: 'organic_social', campaign: 'c', content: 'p' },
      swipes: -1, saves: 0, shares: 0, clicks: 0, completion: 4.2, relevantComments: 0,
      profileVisits: 0, portfolioVisits: 0, contactVisits: 0, qualifiedConversations: 0,
    }, { contentFrequency: -5, automaticRuleChanges: false })).toThrow();

    expect(() => proposeMeasurementExperiment({
      platform: 'linkedin', format: 'text', postId: 'post-1', observedAt: '2026-07-24T23:59:59.000Z',
      periodStart: '2026-07-01T00:00:00.000Z', periodEnd: '2026-07-25T00:00:00.000Z',
      utm: { source: 'linkedin', medium: 'organic_social', campaign: 'c', content: 'p' },
      swipes: 0, saves: 0, shares: 0, clicks: 0, completion: 0, relevantComments: 0,
      profileVisits: 0, portfolioVisits: 0, contactVisits: 0, qualifiedConversations: 0,
    }, { contentFrequency: 2, automaticRuleChanges: false })).toThrow(/observed/i);

    expect(() => proposeMeasurementExperiment({
      platform: 'linkedin', format: 'text', postId: '   ', observedAt: '2026-07-26T00:00:00.000Z',
      periodStart: '2026-07-01T00:00:00.000Z', periodEnd: '2026-07-25T00:00:00.000Z',
      utm: { source: 'linkedin', medium: '   ', campaign: 'campaign', content: 'content' },
      swipes: 0, saves: 0, shares: 0, clicks: 0, completion: 0, relevantComments: 0,
      profileVisits: 0, portfolioVisits: 0, contactVisits: 0, qualifiedConversations: 0,
    }, { contentFrequency: 2, automaticRuleChanges: false })).toThrow();

    expect(createEditorialBrief({
      topic: 'Nová téma', audience: 'Majitelia', goal: 'conversation', mode: 'single', allowGenerativeVisuals: false,
    }).brief.desiredAction).toMatch(/konzultáciu|kontakt/i);
  });

  test('ships pressure-tested skills and a fully gated adaptive sequence', () => {
    for (const name of newSkills) {
      const content = readFileSync(join(root, '.agents', 'skills', name, 'SKILL.md'), 'utf8');
      expect(content).toMatch(new RegExp(`^---\\nname: ${name}\\n`, 'u'));
      expect(content).toContain('## Inputs');
      expect(content).toContain('## Workflow');
      expect(content).toContain('## Output contract');
      expect(content).toContain('## Stop conditions');
      expect(content).toContain('## Pressure test');
    }

    const stages = JSON.parse(readFileSync(join(root, '.agentic', 'stage-contracts.json'), 'utf8'));
    expect(Object.keys(stages)).toEqual([
      'topic-intake',
      'business-brief',
      'risk-gate',
      'research',
      'claim-ledger',
      'continuity',
      'visual-directions',
      'asset-rights',
      'draft',
      'platform-specialization',
      'render',
      'independent-critique',
      'revision',
      'independent-validation',
      'human-approval',
      'export-schedule-approval',
      'measurement',
    ]);
  });
});
