import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  RISE_ASSET_CATALOG,
  resolveCatalogAssetPath,
  selectOwnedAsset,
} from '@/visuals/assetCatalog';
import {
  CAROUSEL_TEMPLATES,
  resolveCarouselTemplate,
} from '@/visuals/carouselTemplates';
import {
  assessGenerationRecipe,
  qaCarouselBeforeRender,
  qaPostBeforeRender,
  qaRenderedSlides,
} from '@/visuals/visualQa';
import { createFixtureDraft } from './fixtures';
import type { Platform } from '@/domain/schemas';

describe('Rise visual asset catalogue', () => {
  test('covers all eleven public portfolio projects with complete public provenance', () => {
    const projects = new Set(RISE_ASSET_CATALOG.assets.map(asset => asset.project));

    expect(projects.size).toBe(11);
    for (const asset of RISE_ASSET_CATALOG.assets) {
      expect(asset.sourceUrl).toMatch(/^https:\/\/rise\.sk\/portfolio\//);
      expect(asset.owner.length).toBeGreaterThan(2);
      expect(asset.rightsEvidence.length).toBeGreaterThan(12);
      expect(asset.qualityNote.length).toBeGreaterThan(12);
      expect(asset.rightsStatus).toBe(asset.origin === 'rise-owned' ? 'confirmed' : 'needs-confirmation');
      expect(asset.allowedPlatforms).toEqual(asset.origin === 'rise-owned' ? ['instagram', 'linkedin', 'facebook'] : []);
      expect(asset.path).toMatch(/^\/portfolio\//);
    }
  });

  test('keeps AI-edited source provenance and sends it to visual approval', () => {
    const aiEdited = RISE_ASSET_CATALOG.assets.find(asset => asset.path?.includes('/ai-edited/'));

    expect(aiEdited).toMatchObject({ aiEdited: true, requiresVisualApproval: true, approved: false });
    expect(aiEdited?.origin).toBe('client-approved');
  });

  test('prefers owned product proof and blocks unlicensed or unsuitable alternatives', () => {
    const assets = [
      ...RISE_ASSET_CATALOG.assets.filter(asset => asset.project === 'GrantAI'),
      {
        ...RISE_ASSET_CATALOG.assets[0],
        id: 'unlicensed-external',
        origin: 'public-licensed' as const,
        license: 'stock-licensed' as const,
        rightsNote: '',
        visualClass: 'generated-illustration' as const,
        project: 'GrantAI',
        approved: true,
      },
    ];

    expect(selectOwnedAsset(assets, { project: 'GrantAI', platform: 'linkedin' })).toBeUndefined();
    expect(
      selectOwnedAsset([assets.at(-1)!], { project: 'GrantAI', platform: 'linkedin' }),
    ).toBeUndefined();
  });

  test('keeps a licensed external screenshot behind new owned documentation', () => {
    const base = RISE_ASSET_CATALOG.assets[0];
    const external = {
      ...base,
      id: 'licensed-external',
      project: 'GrantAI',
      origin: 'public-licensed' as const,
      license: 'stock-licensed' as const,
      rightsNote: 'Licencia uložená pri assete.',
      visualClass: 'product-screenshot' as const,
    };
    const newDocumentation = {
      ...base,
      id: 'new-documentation',
      project: 'GrantAI',
      visualClass: 'new-documentation' as const,
      origin: 'rise-owned' as const,
      owner: 'Rise.sk',
      license: 'owned' as const,
      approved: true,
      requiresVisualApproval: false,
      allowedPlatforms: ['instagram', 'linkedin', 'facebook'] as Platform[],
      rightsEvidence: 'Rise-created documentation asset.',
    };

    expect(selectOwnedAsset([external, newDocumentation], { project: 'GrantAI', platform: 'instagram' })?.id).toBe(
      'new-documentation',
    );
  });

  test('keeps approval-required material discoverable but never renderable', () => {
    const payroll = RISE_ASSET_CATALOG.assets.find(asset => asset.id === 'payroll-architecture')!;

    expect(selectOwnedAsset([payroll], { project: payroll.project, platform: 'linkedin' })).toBeUndefined();
    expect(
      selectOwnedAsset([payroll], {
        project: payroll.project,
        platform: 'linkedin',
        includeApprovalRequired: true,
      }),
    ).toBeUndefined();
  });

  test('resolves only catalogue-relative local paths at the explicit public-root boundary', () => {
    const asset = RISE_ASSET_CATALOG.assets[0];
    expect(resolveCatalogAssetPath(asset, '/tmp/rise-public')).toBe('/tmp/rise-public/portfolio/showcase/trh-nehnutelnosti/cover.webp');
    expect(() => resolveCatalogAssetPath({ ...asset, path: '/../../private.png' }, '/tmp/rise-public')).toThrow(
      /outside/i,
    );
  });

  test('has an existing public-tree file for every configured catalogue path', () => {
    const publicRoot = resolve(process.cwd(), '..', 'rise.sk', 'rise_webpage', 'public');
    for (const asset of RISE_ASSET_CATALOG.assets) {
      expect(existsSync(resolveCatalogAssetPath(asset, publicRoot))).toBe(true);
    }
  });
});

describe('carousel templates and visual QA', () => {
  test('provides the four approved narrative templates and a safe legacy default', () => {
    expect(CAROUSEL_TEMPLATES['product-anatomy'].slides).toHaveLength(6);
    expect(CAROUSEL_TEMPLATES['decision-note'].slides).toHaveLength(7);
    expect(CAROUSEL_TEMPLATES['before-after'].slides).toHaveLength(6);
    expect(CAROUSEL_TEMPLATES['signal-noise'].slides).toHaveLength(6);
    expect(resolveCarouselTemplate(undefined, 'product-proof').id).toBe('product-anatomy');
  });

  test('hard-blocks unsafe carousel metadata before rendering', () => {
    const report = qaCarouselBeforeRender({
      template: 'product-anatomy',
      title: 'Toto je príliš dlhý titulok pre prvú kartu carouselu Rise dnes',
      dimensions: { width: 1080, height: 1350 },
      slides: Array.from({ length: 6 }, (_, index) => ({
        title: `Slide ${index + 1}`,
        body: 'slovo '.repeat(46),
        alt: index === 0 ? '' : 'Zmysluplný alternatívny text.',
        layout: 'image-detail',
      })),
      assets: [],
    });

    expect(report.passed).toBe(false);
    expect(report.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining(['cover-title-words', 'slide-body-words', 'missing-alt', 'repeated-layout']),
    );
  });

  test('keeps a legacy four-slide concept renderable but gates an explicit mismatched template', () => {
    const legacy = createFixtureDraft().posts[0];
    expect(qaPostBeforeRender(legacy).passed).toBe(true);

    const explicit = structuredClone(legacy);
    explicit.carouselTemplate = 'product-anatomy';
    expect(qaPostBeforeRender(explicit).findings.map(finding => finding.code)).toContain(
      'template-slide-count',
    );
  });

  test('requires an explicit human checkpoint and abstract-only recipe for generative support', () => {
    expect(
      assessGenerationRecipe({
        visualDirectionId: 'direction-1',
        model: 'image-model',
        allowGenerativeVisuals: true,
        generationApproved: true,
        generationApprovedAt: '2026-07-25T07:59:00.000Z',
        generatedAt: '2026-07-25T08:00:00.000Z',
        prompt: 'Editorial portrait of a smiling software developer beside a Rise logo.',
        negativePrompt: 'none',
        disclosure: 'AI visual',
        referenceAssetIds: [],
        parameters: {},
        width: 1080,
        height: 1350,
        subject: 'editorial-material',
      }),
    ).toMatchObject({ passed: false });

    expect(
      assessGenerationRecipe({
        visualDirectionId: 'direction-1',
        model: 'image-model',
        allowGenerativeVisuals: true,
        generationApproved: true,
        generationApprovedAt: '2026-07-25T07:59:00.000Z',
        generatedAt: '2026-07-25T08:00:00.000Z',
        prompt: 'Abstract editorial layers of warm mineral material and data paths, no text.',
        negativePrompt: 'people, logo, text, UI, dashboard, chart, metric',
        disclosure: 'Abstraktná AI ilustrácia, schválená pred tvorbou.',
        referenceAssetIds: [],
        parameters: {},
        width: 1080,
        height: 1350,
        subject: 'abstract',
      }).passed,
    ).toBe(true);
  });

  test('blocks Slovak prohibited subjects and approval that follows generation output', () => {
    const base = {
      visualDirectionId: 'direction-1',
      model: 'image-model',
      allowGenerativeVisuals: true,
      generationApproved: true,
      generatedAt: '2026-07-25T08:00:00.000Z',
      prompt: 'Fotorealistická tvár človeka pri obrazovke rozhrania s číselným grafom.',
      negativePrompt: 'nič',
      disclosure: 'AI vizuál',
      referenceAssetIds: [],
      parameters: {},
      width: 1080,
      height: 1350,
      subject: 'editorial-material' as const,
    };
    expect(assessGenerationRecipe({ ...base, generationApprovedAt: '2026-07-25T08:01:00.000Z' }).passed).toBe(false);
    expect(assessGenerationRecipe({ ...base, generationApprovedAt: 'not-a-date' }).passed).toBe(false);
    expect(assessGenerationRecipe({ ...base, prompt: 'Abstraktná vrstva materiálu.', generationApprovedAt: '2026-07-25T07:59:00.000Z' }).passed).toBe(true);
  });

  test('requires explicit rights confirmation and coherent redaction state for final selection', () => {
    const candidate = {
      ...RISE_ASSET_CATALOG.assets.find(asset => asset.id === 'rise-home')!,
      origin: 'client-approved' as const,
      owner: 'Client',
      license: 'client-approved' as const,
      approved: true,
      requiresVisualApproval: false,
      allowedPlatforms: ['instagram', 'linkedin', 'facebook'] as Platform[],
      rightsStatus: 'needs-confirmation' as const,
      rightsEvidence: 'Text nestačí bez potvrdenia.',
      redactionStatus: 'not-required' as const,
    };
    expect(selectOwnedAsset([candidate], { project: candidate.project, platform: 'linkedin' })).toBeUndefined();

    const completed = {
      ...candidate,
      rightsStatus: 'confirmed' as const,
      rightsConfirmedAt: '2026-07-25T07:00:00.000Z',
      rightsConfirmedBy: 'Client approver',
      redactionStatus: 'completed' as const,
      redactionCompletedAt: '2026-07-25T07:01:00.000Z',
    };
    expect(selectOwnedAsset([completed], { project: completed.project, platform: 'linkedin' })?.id).toBe(completed.id);
    expect(
      selectOwnedAsset([{ ...completed, redactionStatus: 'pending' as const }], {
        project: completed.project,
        platform: 'linkedin',
      }),
    ).toBeUndefined();
  });

  test('reports empty and malformed rendered PNGs with a human artefact checkpoint', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'rise-visual-qa-'));
    const empty = join(directory, 'empty.png');
    const malformed = join(directory, 'malformed.png');
    writeFileSync(empty, '');
    writeFileSync(malformed, 'not a png');

    const report = await qaRenderedSlides([empty, malformed]);

    expect(report.passed).toBe(false);
    expect(report.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining(['empty-file', 'invalid-png']),
    );
    expect(report.humanReview).toContain('Skontrolovať artefakty UI, logá, predmety a zmenu klientského UI.');
  });
});
