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
import { RISE_VISUAL_GENERATION_PLAYBOOK_V1 } from '../brand/visual-generation-playbook.v1';
import { createFixtureDraft } from './fixtures';
import type { Platform } from '@/domain/schemas';

const risePublicRoot = process.env.RISE_SK_PUBLIC_ROOT
  ? resolve(process.env.RISE_SK_PUBLIC_ROOT)
  : resolve(process.cwd(), '..', 'rise.sk', 'rise_webpage', 'public');

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

  test.runIf(existsSync(risePublicRoot))('has an existing public-tree file for every configured catalogue path', () => {
    for (const asset of RISE_ASSET_CATALOG.assets) {
      expect(existsSync(resolveCatalogAssetPath(asset, risePublicRoot))).toBe(true);
    }
  });
});

describe('carousel templates and visual QA', () => {
  test('grounds every generated direction in the Rise brand, public evidence and official guidance', () => {
    expect(RISE_VISUAL_GENERATION_PLAYBOOK_V1.sources.map(source => source.id)).toEqual(
      expect.arrayContaining([
        'rise-home',
        'rise-portfolio',
        'openai-image-prompting',
        'openai-image-generation',
        'w3c-contrast',
        'instagram-image-resolution',
        'linkedin-image-specifications',
        'facebook-page-image-dimensions',
      ]),
    );
    expect(RISE_VISUAL_GENERATION_PLAYBOOK_V1.referenceOrder.slice(0, 3)).toEqual([
      'relevant-rise-project-page',
      'approved-rise-asset',
      'rise-home',
    ]);
    expect(RISE_VISUAL_GENERATION_PLAYBOOK_V1.brandLock.palette).toMatchObject({
      canvas: '#080807',
      surface: '#0C0C0C',
      gold: '#DAB549',
      strongText: '#F8F4EC',
    });
    expect(RISE_VISUAL_GENERATION_PLAYBOOK_V1.promptContract).toEqual(
      expect.arrayContaining([
        'purpose',
        'source-references',
        'subject',
        'composition',
        'materials',
        'lighting',
        'brand-lock',
        'preserve',
        'exclude',
        'output',
      ]),
    );
    expect(RISE_VISUAL_GENERATION_PLAYBOOK_V1.platformFormats).toMatchObject({
      instagramCarousel: {
        width: 1080,
        height: 1350,
        safeMargin: 84,
      },
      verticalVideo: {
        width: 1080,
        height: 1920,
      },
      linkedinDocument: {
        minPages: 4,
        maxPages: 8,
      },
      linkedinCover: {
        width: 4200,
        height: 700,
      },
      facebookCover: {
        width: 851,
        height: 315,
      },
    });
    expect(
      RISE_VISUAL_GENERATION_PLAYBOOK_V1.seriesRecipes.map(
        recipe => recipe.id,
      ),
    ).toEqual([
      'inside-the-build',
      'decision-note',
      'growth-system',
      'signal-vs-noise',
      'people-behind-the-product',
    ]);
    expect(
      RISE_VISUAL_GENERATION_PLAYBOOK_V1.sources.every(
        source => source.checkedAt && source.expiresAt,
      ),
    ).toBe(true);
  });

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
        prompt:
          'Abstract editorial layers in an asymmetrical composition with matte mineral material, soft directional light and 65% negative space. Canvas #080807 with a small #DAB549 accent, no text.',
        negativePrompt: 'people, logo, text, UI, dashboard, chart, metric',
        disclosure: 'Abstraktná AI ilustrácia, schválená pred tvorbou.',
        referenceAssetIds: [],
        playbookVersion: 'rise-visual-generation-v1',
        sourceUrls: [
          'https://rise.sk/',
          'https://rise.sk/portfolio',
          'https://rise.sk/portfolio/rise-sk',
          'https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide',
          'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum',
        ],
        project: 'Rise.sk',
        projectSourceUrl: 'https://rise.sk/portfolio/rise-sk',
        parameters: { quality: 'high' },
        width: 1080,
        height: 1350,
        subject: 'abstract',
        platform: 'instagram',
        crop: '4:5 master with 84 px safe margin',
        altText:
          'Tri matné vrstvy sa spájajú do jednej pokojnej rozhodovacej cesty.',
      }).passed,
    ).toBe(true);
  });

  test('blocks generation without a negative prompt and output metadata', () => {
    const base = {
      visualDirectionId: 'direction-1',
      model: 'image-model',
      allowGenerativeVisuals: true as const,
      generationApproved: true as const,
      generationApprovedAt: '2026-07-25T07:59:00.000Z',
      generatedAt: '2026-07-25T08:00:00.000Z',
      prompt:
        'Abstract editorial layers in an asymmetrical composition with matte mineral material, soft directional light and 65% negative space. Canvas #080807 with a small #DAB549 accent.',
      disclosure: 'Abstraktná AI ilustrácia.',
      referenceAssetIds: [],
      playbookVersion: 'rise-visual-generation-v1' as const,
      sourceUrls: [
        'https://rise.sk/',
        'https://rise.sk/portfolio',
        'https://rise.sk/portfolio/rise-sk',
        'https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide',
        'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum',
      ],
      project: 'Rise.sk',
      projectSourceUrl: 'https://rise.sk/portfolio/rise-sk',
      parameters: { quality: 'high' },
      width: 1080,
      height: 1350,
      subject: 'abstract' as const,
    };

    const report = assessGenerationRecipe(base);

    expect(report.passed).toBe(false);
    expect(report.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining(['generation-negative', 'generation-output']),
    );
  });

  test('requires a declared role and preserve rule for every reference asset', () => {
    const report = assessGenerationRecipe({
      visualDirectionId: 'direction-1',
      model: 'image-model',
      allowGenerativeVisuals: true,
      generationApproved: true,
      generationApprovedAt: '2026-07-25T07:59:00.000Z',
      generatedAt: '2026-07-25T08:00:00.000Z',
      prompt:
        'Abstract editorial layers in an asymmetrical composition with matte mineral material, soft directional light and 65% negative space. Canvas #080807 with a small #DAB549 accent.',
      negativePrompt: 'people, logo, text, UI, dashboard, chart, metric',
      disclosure: 'Abstraktná AI ilustrácia.',
      referenceAssetIds: ['rise-home'],
      referenceRoles: [],
      playbookVersion: 'rise-visual-generation-v1',
      sourceUrls: [
        'https://rise.sk/',
        'https://rise.sk/portfolio',
        'https://rise.sk/portfolio/rise-sk',
        'https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide',
        'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum',
      ],
      project: 'Rise.sk',
      projectSourceUrl: 'https://rise.sk/portfolio/rise-sk',
      parameters: { quality: 'high' },
      width: 1080,
      height: 1350,
      subject: 'abstract',
      platform: 'instagram',
      crop: '4:5 master with 84 px safe margin',
      altText: 'Pokojná abstraktná dátová vrstva.',
    });

    expect(report.passed).toBe(false);
    expect(report.findings.map(finding => finding.code)).toContain(
      'generation-reference',
    );
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
    expect(assessGenerationRecipe({ ...base, prompt: 'Abstraktná vrstva materiálu.', generationApprovedAt: '2026-07-25T07:59:00.000Z' }).passed).toBe(false);
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
