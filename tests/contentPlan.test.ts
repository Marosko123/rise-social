import { describe, expect, test } from 'vitest';

import {
  ContentPlanSchema,
  ProjectDisclosureProfileSchema,
  TrendEvidenceSchema,
  VisualBriefSchema,
  isTrendEvidenceFresh,
} from '@/contentPlan/schemas';
import {
  RISE_CONTENT_PLAN,
  getCanonicalPublicProjectCount,
} from '@/contentPlan/plan';
import { validateContentPlan } from '@/contentPlan/validation';
import { RISE_PUBLIC_ASSET_CATALOG_V1 } from '../brand/assets.v1';

describe('content plan contracts', () => {
  test('contains the approved twelve-week and twenty-four-slot rollout', () => {
    expect(RISE_CONTENT_PLAN.weeks).toHaveLength(12);
    expect(RISE_CONTENT_PLAN.entries).toHaveLength(24);
    expect(RISE_CONTENT_PLAN.projects).toHaveLength(11);
    expect(getCanonicalPublicProjectCount(RISE_CONTENT_PLAN)).toBe(11);
    expect(RISE_CONTENT_PLAN.entries[0]?.publishOn).toBe('2026-07-28');
    expect(RISE_CONTENT_PLAN.entries.at(-1)?.publishOn).toBe('2026-10-15');
    expect(new Set(RISE_CONTENT_PLAN.entries.map(entry => entry.publishOn)).size).toBe(24);
    expect(RISE_CONTENT_PLAN.entries.filter(entry => entry.rolloutPhase === 'pilot')).toHaveLength(8);
    expect(RISE_CONTENT_PLAN.entries.filter(entry => entry.rolloutPhase === 'rollout')).toHaveLength(16);
    expect(
      RISE_CONTENT_PLAN.weeks.every(
        week => RISE_CONTENT_PLAN.entries.filter(entry => entry.week === week.number).length === 2,
      ),
    ).toBe(true);
  });

  test('implements all five pillars at the closest whole-slot version of the approved mix', () => {
    expect(RISE_CONTENT_PLAN.pillars.map(pillar => pillar.id)).toEqual([
      'product-proof',
      'decision-education',
      'growth-system',
      'people-process',
      'signal-noise',
    ]);

    const counts = Object.fromEntries(
      RISE_CONTENT_PLAN.pillars.map(pillar => [
        pillar.id,
        RISE_CONTENT_PLAN.entries.filter(entry => entry.pillar === pillar.id).length,
      ]),
    );
    expect(counts).toEqual({
      'product-proof': 8,
      'decision-education': 6,
      'growth-system': 4,
      'people-process': 4,
      'signal-noise': 2,
    });
    for (const pillar of RISE_CONTENT_PLAN.pillars) {
      const actual = (counts[pillar.id] / RISE_CONTENT_PLAN.entries.length) * 100;
      expect(Math.abs(actual - pillar.targetPercent)).toBeLessThanOrEqual(2);
    }
  });

  test('enforces the approved first-eight pilot composition independently', () => {
    const pilot = RISE_CONTENT_PLAN.entries.filter(
      entry => entry.rolloutPhase === 'pilot',
    );
    const count = (pillar: (typeof pilot)[number]['pillar']) =>
      pilot.filter(entry => entry.pillar === pillar).length;

    expect(pilot).toHaveLength(8);
    expect(count('product-proof')).toBeGreaterThanOrEqual(4);
    expect(count('decision-education')).toBeGreaterThanOrEqual(2);
    expect(count('people-process')).toBeGreaterThanOrEqual(1);
    expect(count('growth-system')).toBeGreaterThanOrEqual(1);
  });

  test('binds every named project to its explicitly approved public claim', () => {
    const claimById = new Map(
      RISE_CONTENT_PLAN.claims.map(claim => [claim.id, claim]),
    );
    const projectById = new Map(
      RISE_CONTENT_PLAN.projects.map(project => [project.id, project]),
    );

    for (const entry of RISE_CONTENT_PLAN.entries) {
      if (entry.projectClaimMode === 'registry-synthesis') {
        expect(entry.claimIds).toContain('claim-portfolio');
        continue;
      }
      for (const projectId of entry.projectIds) {
        const project = projectById.get(projectId);
        expect(project).toBeDefined();
        expect(
          entry.claimIds.some(claimId => {
            const claim = claimById.get(claimId);
            return (
              project?.allowedClaimIds.includes(claimId) &&
              claim?.sourceUrl === project.publicUrl
            );
          }),
        ).toBe(true);
      }
    }
  });

  test('rejects an unrelated generic claim for a named project', () => {
    const adversarial = structuredClone(RISE_CONTENT_PLAN);
    const entry = adversarial.entries.find(item => item.id === 'w09-trnava-data');
    if (!entry) throw new Error('Missing Trnava test entry.');
    entry.claimIds = ['claim-accountability'];

    expect(() => ContentPlanSchema.parse(adversarial)).toThrow(
      /approved public claim|project claim/i,
    );
  });

  test('reserves registry synthesis for the designated week-twelve entry', () => {
    const adversarial = structuredClone(RISE_CONTENT_PLAN);
    const entry = adversarial.entries.find(item => item.id === 'w09-trnava-data');
    if (!entry) throw new Error('Missing Trnava test entry.');
    entry.projectIds = adversarial.projects.map(project => project.id);
    entry.claimIds = ['claim-portfolio'];
    entry.projectClaimMode = 'registry-synthesis';

    expect(() => ContentPlanSchema.parse(adversarial)).toThrow(
      /designated week-12 synthesis|registry synthesis/i,
    );
  });

  test('rejects unknown or falsely-owned catalog assets at the plan boundary', () => {
    const unknownAsset = structuredClone(RISE_CONTENT_PLAN);
    unknownAsset.entries[0].assetSelection.assetIds = ['unknown-asset'];
    expect(() => ContentPlanSchema.parse(unknownAsset)).toThrow(
      /unknown catalog asset/i,
    );

    const falselyOwned = structuredClone(RISE_CONTENT_PLAN);
    const mapEntry = falselyOwned.entries.find(
      entry => entry.id === 'w02-mapatrhu-context',
    );
    if (!mapEntry) throw new Error('Missing MapaTrhu test entry.');
    mapEntry.assetSelection.status = 'owned-preview';
    expect(() => ContentPlanSchema.parse(falselyOwned)).toThrow(
      /owned preview|rights|permitted platform/i,
    );

    const incompatibleProject = structuredClone(RISE_CONTENT_PLAN);
    const incompatibleEntry = incompatibleProject.entries.find(
      entry => entry.id === 'w02-mapatrhu-context',
    );
    if (!incompatibleEntry) throw new Error('Missing MapaTrhu test entry.');
    incompatibleEntry.assetSelection.assetIds = ['slates-architecture'];
    expect(() => ContentPlanSchema.parse(incompatibleProject)).toThrow(
      /not compatible with the entry projects|selected visual kind/i,
    );

    const protectedAsset = structuredClone(RISE_CONTENT_PLAN);
    const payrollEntry = protectedAsset.entries.find(
      entry => entry.id === 'w10-payroll-flow',
    );
    if (!payrollEntry) throw new Error('Missing payroll test entry.');
    payrollEntry.assetSelection.status = 'owned-preview';
    expect(() => ContentPlanSchema.parse(protectedAsset)).toThrow(
      /owned preview|confidentiality|redaction|permitted platform/i,
    );
  });

  test('keeps a human video capture-gated without an approved recording', () => {
    const adversarial = structuredClone(RISE_CONTENT_PLAN);
    const humanEntry = adversarial.entries.find(
      entry => entry.id === 'w01-accountability-video',
    );
    if (!humanEntry) throw new Error('Missing human-video test entry.');
    humanEntry.assetSelection.status = 'original-diagram';

    expect(() => ContentPlanSchema.parse(adversarial)).toThrow(
      /human|team|capture-required/i,
    );
  });

  test('requires the exact five pillar, series, channel and KPI sets', () => {
    expect(RISE_CONTENT_PLAN.series.map(series => series.id)).toEqual([
      'inside-build',
      'decision-notes',
      'growth-system',
      'people-behind-product',
      'signal-vs-noise',
    ]);

    const duplicatePillar = structuredClone(RISE_CONTENT_PLAN);
    duplicatePillar.pillars[4] = structuredClone(duplicatePillar.pillars[0]);
    expect(() => ContentPlanSchema.parse(duplicatePillar)).toThrow(/pillar/i);

    const duplicateSeries = structuredClone(RISE_CONTENT_PLAN);
    duplicateSeries.series[4] = structuredClone(duplicateSeries.series[0]);
    expect(() => ContentPlanSchema.parse(duplicateSeries)).toThrow(/series/i);

    const unusedSeries = structuredClone(RISE_CONTENT_PLAN);
    for (const entry of unusedSeries.entries) {
      if (entry.series === 'signal-vs-noise') entry.series = 'decision-notes';
    }
    expect(() => ContentPlanSchema.parse(unusedSeries)).toThrow(/series/i);

    const duplicateChannel = structuredClone(RISE_CONTENT_PLAN);
    duplicateChannel.channelRoles[2] = structuredClone(
      duplicateChannel.channelRoles[0],
    );
    expect(() => ContentPlanSchema.parse(duplicateChannel)).toThrow(/channel/i);

    const duplicateKpi = structuredClone(RISE_CONTENT_PLAN);
    duplicateKpi.kpis[3] = structuredClone(duplicateKpi.kpis[0]);
    expect(() => ContentPlanSchema.parse(duplicateKpi)).toThrow(/KPI/i);
  });

  test('links applicable directions to catalog assets or an explicit capture/diagram gate', () => {
    const assetIds = new Set<string>(
      RISE_PUBLIC_ASSET_CATALOG_V1.assets.map(asset => asset[0]),
    );
    for (const entry of RISE_CONTENT_PLAN.entries) {
      expect(entry.assetSelection.note).not.toHaveLength(0);
      if (entry.assetSelection.status === 'capture-required') {
        expect(entry.assetSelection.assetIds).toHaveLength(0);
      } else if (entry.assetSelection.assetIds.length > 0) {
        expect(
          entry.assetSelection.assetIds.every(assetId => assetIds.has(assetId)),
        ).toBe(true);
      } else {
        expect(entry.assetSelection.status).toBe('original-diagram');
      }
    }
  });

  test('keeps the approved topic order and complete business and visual briefs', () => {
    expect(RISE_CONTENT_PLAN.entries.map(entry => entry.title)).toEqual([
      'Softvér, za ktorý ručí jeden tím',
      'Čo pre nás znamená zodpovednosť',
      'MapaTrhu: najprv kontext, potom rozhodnutie',
      'Kedy mapa vysvetlí viac než tabuľka',
      'Rise.sk prepája produkt, obsah a kontakt',
      'Web, obsah, SEO a meranie ako jeden systém',
      'GrantAI: skóre triedi, oprávnenosť rozhoduje',
      'AI návrh nie je finálne rozhodnutie',
      'MojaFirma: od dokumentu k overiteľnému záznamu',
      'Čo by firma nemala automatizovať ako prvé',
      'SmartGym: aplikácia, skener a web nad jedným stavom',
      'Prečo systémy potrebujú spoločný zdroj pravdy',
      'Rastlinkovo: optimalizácia živého e-shopu',
      'Zlepšujte cestu, nie iba jednu obrazovku',
      'Slates: modernizácia existujúcej platformy',
      'Modernizovať alebo prepisovať?',
      'Trnava: od dátového súboru k rozhodnutiu',
      'Interná analytika potrebuje kontext aj ochranu dát',
      'Personálno-mzdový systém: spoľahlivý pracovný tok',
      'Testovanie, odovzdanie a prevádzková istota',
      'Citlivé projekty bez porušenia dôvernosti',
      'Ako ukázať spôsob práce a neodhaliť klienta',
      'Čo spája verejné projekty Rise',
      'Čo sme sa za 90 dní naučili',
    ]);
    for (const entry of RISE_CONTENT_PLAN.entries) {
      expect(entry.businessGoal).not.toHaveLength(0);
      expect(entry.buyerQuestion).not.toHaveLength(0);
      expect(entry.risePerspective).not.toHaveLength(0);
      expect(entry.series).not.toHaveLength(0);
      expect(entry.platforms.instagram.format).not.toHaveLength(0);
      expect(entry.visualTemplate).not.toHaveLength(0);
      expect(entry.selectedAssetClass).not.toHaveLength(0);
      expect(entry.specificVisualBrief.length).toBeGreaterThan(40);
      expect(entry.approvalNote).not.toHaveLength(0);
      expect(entry.cta).not.toHaveLength(0);
    }
  });

  test('includes profile foundation, cadence, KPI and explicit 90-day decision rules', () => {
    expect(RISE_CONTENT_PLAN.profileFoundation).toHaveLength(6);
    expect(RISE_CONTENT_PLAN.channelRoles.map(channel => channel.platform)).toEqual([
      'linkedin',
      'instagram',
      'facebook',
    ]);
    expect(RISE_CONTENT_PLAN.cadence.masterPostsPerWeek).toBe(2);
    expect(RISE_CONTENT_PLAN.kpis.map(kpi => kpi.category)).toEqual([
      'quality',
      'attention',
      'interest',
      'business',
    ]);
    expect(RISE_CONTENT_PLAN.decisionRules).toHaveLength(3);
    expect(validateContentPlan(RISE_CONTENT_PLAN)).toEqual([]);
  });

  test('requires AI-edited visuals to stop for explicit visual approval', () => {
    expect(() =>
      VisualBriefSchema.parse({
        kind: 'public-composite',
        sourceType: 'rise-public-asset',
        sourceAsset: '/portfolio/projects/example/ai-edited/cover.webp',
        altText: 'Verejná produktová kompozícia.',
        redactions: [],
        aiEdited: true,
        requiresVisualApproval: false,
      }),
    ).toThrow(/approval/i);
  });

  test('prevents confidential projects from allowing real client UI', () => {
    expect(() =>
      ProjectDisclosureProfileSchema.parse({
        id: 'private-system',
        name: 'Dôverný systém',
        level: 'confidential-anonymized',
        publicUrl: 'https://rise.sk/portfolio/private-system',
        allowedClaims: ['Verejne opísaný anonymizovaný pracovný tok.'],
        allowedVisuals: ['real-ui'],
        prohibited: ['Klientsky systém a identita.'],
        requiresBriefApproval: true,
        requiresVisualApproval: true,
      }),
    ).toThrow(/real UI/i);
  });

  test('expires fast-moving trend evidence after its review window', () => {
    const evidence = TrendEvidenceSchema.parse({
      id: 'ai-update',
      title: 'Aktuálna AI zmena',
      url: 'https://example.com/official-update',
      publisher: 'Primary publisher',
      sourceKind: 'primary',
      publishedAt: '2026-07-22T00:00:00.000Z',
      checkedAt: '2026-07-24T00:00:00.000Z',
      expiresAt: '2026-08-06T23:59:59.000Z',
      scope: 'Platí iba pre konkrétnu publikovanú aktualizáciu.',
    });

    expect(isTrendEvidenceFresh(evidence, new Date('2026-08-06T12:00:00.000Z'))).toBe(true);
    expect(isTrendEvidenceFresh(evidence, new Date('2026-08-07T00:00:00.000Z'))).toBe(false);
  });
});
