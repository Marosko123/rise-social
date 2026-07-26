import { describe, expect, test } from 'vitest';

import {
  PUBLIC_VISUAL_ASSET_MANIFEST,
  PUBLIC_VISUAL_PLAYBOOK,
  renderPublicVisualPlaybookMarkdown,
} from '@/public/visualSystem';

describe('ChatGPT-ready public Rise visual system', () => {
  test('covers every public project with a safe visual strategy', () => {
    expect(PUBLIC_VISUAL_ASSET_MANIFEST.projects).toHaveLength(11);
    expect(PUBLIC_VISUAL_ASSET_MANIFEST.assets).toHaveLength(12);

    for (const project of PUBLIC_VISUAL_ASSET_MANIFEST.projects) {
      expect(project.caseStudyUrl).toMatch(
        /^https:\/\/rise\.sk\/portfolio\//,
      );
      expect(project.safeVisualStrategy.length).toBeGreaterThan(40);
      expect(project.assetIds.length).toBeGreaterThan(0);
    }
  });

  test('publishes useful asset metadata without internal rights evidence', () => {
    const serialized = JSON.stringify(PUBLIC_VISUAL_ASSET_MANIFEST);

    expect(serialized).not.toContain('rightsEvidence');
    expect(serialized).not.toContain('rightsReference');
    expect(serialized).not.toContain('internal ownership register');

    for (const asset of PUBLIC_VISUAL_ASSET_MANIFEST.assets) {
      expect(asset.previewUrl).toMatch(/^https:\/\/rise\.sk\/portfolio\//);
      expect(asset.caseStudyUrl).toMatch(
        /^https:\/\/rise\.sk\/portfolio\//,
      );
      expect(['approved', 'reference-only', 'blocked']).toContain(
        asset.usageStatus,
      );
      expect(asset.quality.length).toBeGreaterThan(20);
      expect(asset.crop.length).toBeGreaterThan(20);
      expect(asset.rightsCheckedAt).toBe('2026-07-25');
      if (asset.usageStatus !== 'approved') {
        expect(asset.allowedPlatforms).toEqual([]);
      }
    }
  });

  test('exposes a complete machine contract and compact LLM document', () => {
    expect(PUBLIC_VISUAL_PLAYBOOK.canonicalUrl).toBe(
      'https://marosko123.github.io/rise-social/visual-playbook.json',
    );
    expect(PUBLIC_VISUAL_PLAYBOOK).toMatchObject({
      instagramCarouselPlaybookUrl:
        'https://marosko123.github.io/rise-social/instagram-carousel-playbook.json',
      brandAssetManifestUrl:
        'https://marosko123.github.io/rise-social/brand-assets.json',
      brandCopyUrl:
        'https://marosko123.github.io/rise-social/brand-copy.json',
    });
    expect(PUBLIC_VISUAL_PLAYBOOK.playbook.chatGptWorkflow.steps).toEqual([
      'brand-context',
      'asset-librarian',
      'visual-director',
      'generative-visual',
      'visual-qa',
    ]);

    const markdown = renderPublicVisualPlaybookMarkdown();
    expect(markdown).toContain('# Rise Visual System');
    expect(markdown).toContain('https://rise.sk/portfolio');
    expect(markdown).toContain('visual-assets.json');
    expect(markdown).toContain('People Behind the Product');
    expect(markdown).toContain('negative prompt');
  });
});
