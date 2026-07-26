import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import { CarouselSlideSchema } from '@/domain/schemas';
import { createCarouselDocument } from '@/rendering/carouselDocument';
import {
  PUBLIC_BRAND_ASSET_MANIFEST,
  PUBLIC_BRAND_COPY,
  PUBLIC_VISUAL_PLAYBOOK,
} from '@/public/visualSystem';
import {
  CAROUSEL_TEMPLATES,
  type CarouselTemplate,
} from '@/visuals/carouselTemplates';
import { qaCarouselBeforeRender } from '@/visuals/visualQa';
import { createFixtureDraft } from './fixtures';

const BRAND_PUBLIC_ROOT = resolve(
  process.cwd(),
  'public-site',
  'public',
  'brand',
);

describe('Rise Instagram application carousel contract', () => {
  test('defines the seven-part app case-study narrative', () => {
    const template = (
      CAROUSEL_TEMPLATES as Record<string, CarouselTemplate | undefined>
    )['app-case-study'];

    expect(template?.slides.map(slide => slide.role)).toEqual([
      'cover',
      'problem',
      'scope',
      'flow',
      'ui-detail',
      'decision',
      'evidence',
    ]);
  });

  test('retains structured app slide direction in the public draft contract', () => {
    const parsed = CarouselSlideSchema.parse({
      id: 'app-slide-1',
      eyebrow: 'PRODUKT',
      title: 'Jeden systém pre celý vstup',
      body: 'Členstvo, platba a návšteva používajú jeden overiteľný stav.',
      alt: 'Obrazovka aplikácie s označeným stavom členstva.',
      claimIds: ['claim-smartgym'],
      role: 'ui-detail',
      assetFit: 'contain',
      crop: {
        aspectRatio: '4:5',
        focalPoint: { x: 50, y: 45 },
        preserve: 'Zachovať navigáciu a stav členstva.',
      },
      callouts: [
        { label: 'Aktívne členstvo', anchor: { x: 62, y: 35 } },
      ],
      surface: 'media',
    });

    expect(parsed).toMatchObject({
      role: 'ui-detail',
      assetFit: 'contain',
      surface: 'media',
      callouts: [{ label: 'Aktívne členstvo' }],
    });
  });

  test('blocks verbose slide copy and long content headlines before render', () => {
    const report = qaCarouselBeforeRender({
      template: 'product-anatomy',
      title: 'Jeden systém pre každú návštevu',
      dimensions: { width: 1080, height: 1350 },
      slides: Array.from({ length: 6 }, (_, index) => ({
        title:
          index === 1
            ? 'Takto aplikácia prepája každý dôležitý prevádzkový krok bezpečne'
            : `Krátky titulok ${index + 1}`,
        body:
          index === 2
            ? 'Jedna dve tri štyri päť šesť sedem osem deväť desať jedenásť dvanásť trinásť štrnásť pätnásť šestnásť sedemnásť osemnásť devätnásť dvadsať dvadsaťjeden dvadsaťdva dvadsaťtri dvadsaťštyri dvadsaťpäť.'
            : 'Jedna krátka a konkrétna myšlienka pre používateľa aplikácie.',
        alt: `Zmysluplný alternatívny text slidu ${index + 1}.`,
      })),
      assets: [],
    });

    expect(report.findings.map(finding => finding.code)).toEqual(
      expect.arrayContaining(['slide-title-words', 'slide-body-words']),
    );
  });

  test('renders the original Rise mark and embedded source fonts without the fake R glyph', () => {
    const document = createCarouselDocument(createFixtureDraft().posts[0]);

    expect(document).toContain('data-rise-logo="official"');
    expect(document).toContain('Rise_logo.svg');
    expect(document).toContain('@font-face');
    expect(document).toContain('Playfair Display');
    expect(document).not.toContain('<span class="rise-mark">R</span>');
    expect(document).not.toContain('font-family: Georgia');
    expect(document).not.toMatch(/\.visual-image\s*\{[^}]*transform/isu);
  });

  test('uses a distinct proof composition instead of repeating the flow diagram', () => {
    const post = structuredClone(createFixtureDraft().posts[0]);
    post.slides[0].visualLayout = 'proof';

    const document = createCarouselDocument(post);

    expect(document).toContain('class="proof-mark"');
  });

  test('publishes exact copied Rise logo and font files for deterministic rendering', () => {
    const expected = [
      'Rise_logo.svg',
      'Rise_logo_transparent.png',
      'Rise_logo_text_transparent.png',
      'Rise_logo_circle.png',
      'Inter-Regular.woff',
      'Inter-SemiBold.woff',
      'PlayfairDisplay-Regular.ttf',
      'PlayfairDisplay-SemiBold.ttf',
      'LICENSE-Inter.txt',
      'LICENSE-Playfair-Display.txt',
    ];

    for (const file of expected) {
      expect(existsSync(resolve(BRAND_PUBLIC_ROOT, file)), file).toBe(true);
    }

    expect(
      readFileSync(resolve(BRAND_PUBLIC_ROOT, 'Rise_logo.svg'), 'utf8'),
    ).toContain('goldGradient');
    for (const asset of PUBLIC_BRAND_ASSET_MANIFEST.assets) {
      const hash = createHash('sha256')
        .update(readFileSync(resolve(BRAND_PUBLIC_ROOT, asset.fileName)))
        .digest('hex');
      expect(hash, asset.id).toBe(asset.sha256);
    }
  });

  test('links ChatGPT to the carousel, brand asset and canonical copy contracts', () => {
    const contract = PUBLIC_VISUAL_PLAYBOOK as typeof PUBLIC_VISUAL_PLAYBOOK & {
      instagramCarouselPlaybookUrl?: string;
      brandAssetManifestUrl?: string;
      brandCopyUrl?: string;
    };

    expect(contract.instagramCarouselPlaybookUrl).toBe(
      'https://marosko123.github.io/rise-social/instagram-carousel-playbook.json',
    );
    expect(contract.brandAssetManifestUrl).toBe(
      'https://marosko123.github.io/rise-social/brand-assets.json',
    );
    expect(contract.brandCopyUrl).toBe(
      'https://marosko123.github.io/rise-social/brand-copy.json',
    );
    expect(PUBLIC_BRAND_COPY.projects).toHaveLength(11);
    expect(
      PUBLIC_BRAND_COPY.projects.every(project => project.facts.length >= 4),
    ).toBe(true);
  });
});
