import { describe, expect, test } from 'vitest';

import {
  PUBLIC_CHATGPT_CONTEXT,
  PUBLIC_STARTER_PACK,
  PUBLIC_VISUAL_ASSET_MANIFEST,
  PUBLIC_VISUAL_PLAYBOOK,
  STARTER_PACK_DRAFTS,
  buildPublicStarterPack,
  renderPublicChatGptContextMarkdown,
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

  test('locks the company identity before any image instruction', () => {
    expect(PUBLIC_CHATGPT_CONTEXT.schemaVersion).toBe('2.0');
    expect(PUBLIC_CHATGPT_CONTEXT.identity.category).toBe(
      'software-and-product-company',
    );
    expect(PUBLIC_CHATGPT_CONTEXT.identity.statement).toContain(
      'softvérová a produktová firma',
    );
    expect(PUBLIC_CHATGPT_CONTEXT.notA).toEqual(
      expect.arrayContaining([
        'stavebná firma',
        'developer nehnuteľností',
        'realitná kancelária',
      ]),
    );
    expect(PUBLIC_CHATGPT_CONTEXT.products.map(product => product.name)).toEqual([
      'Rise.sk',
      'MapaTrhu',
      'GrantAI',
      'MojaFirma',
    ]);
    expect(PUBLIC_CHATGPT_CONTEXT.products[1]?.definition).toContain(
      'dátový softvérový produkt',
    );
    expect(PUBLIC_CHATGPT_CONTEXT.generationPolicy.firstFourWeeks).toBe(
      'disabled-for-product-posts',
    );
    expect(PUBLIC_CHATGPT_CONTEXT.canonicalUrls.starterPack).toBe(
      'https://marosko123.github.io/rise-social/starter-pack.json',
    );

    const markdown = renderPublicChatGptContextMarkdown();
    expect(markdown.indexOf('softvérová a produktová firma')).toBeLessThan(
      markdown.indexOf('## Brand contract'),
    );
    expect(markdown).toContain('NIE JE stavebná firma');
    expect(markdown).toContain('fake UI');
    expect(markdown).toContain('starter-pack.json');
  });

  test('derives social usage from confirmed rights for four Rise-owned products', () => {
    const approvedOwnedAssets = new Set([
      'rise-home',
      'mapatrhu-map',
      'grantai-ui',
      'mojafirma-document-flow',
    ]);

    for (const asset of PUBLIC_VISUAL_ASSET_MANIFEST.assets) {
      if (approvedOwnedAssets.has(asset.id)) {
        expect(asset.usageStatus).toBe('approved');
        expect(asset.allowedPlatforms).toEqual([
          'instagram',
          'linkedin',
          'facebook',
        ]);
      } else {
        expect(asset.usageStatus).not.toBe('approved');
        expect(asset.allowedPlatforms).toEqual([]);
      }
    }

    expect(
      PUBLIC_VISUAL_ASSET_MANIFEST.assets.find(
        asset => asset.id === 'grantai-ai-edited',
      )?.usageStatus,
    ).toBe('blocked');
  });

  test('keeps all starter media private until human approval is valid', () => {
    expect(STARTER_PACK_DRAFTS.map(pack => pack.id)).toEqual([
      'software-one-accountable-team',
      'mapatrhu-context-before-decision',
      'rise-product-content-contact',
    ]);
    expect(STARTER_PACK_DRAFTS[1]?.assetIds).toEqual(['mapatrhu-map']);
    expect(STARTER_PACK_DRAFTS[1]?.visualRules).toContain(
      'bez domov a realitného stocku',
    );

    expect(PUBLIC_STARTER_PACK.status).toBe('awaiting-human-approval');
    expect(PUBLIC_STARTER_PACK.packs).toEqual([]);
    expect(JSON.stringify(PUBLIC_STARTER_PACK)).not.toContain('.png');
    expect(JSON.stringify(PUBLIC_STARTER_PACK)).not.toContain('.pdf');
  });

  test('serializes starter media only when approval still matches its content digest', () => {
    const digest = 'a'.repeat(64);
    const approved = {
      id: 'approved-pack',
      title: 'Approved pack',
      postUrl: 'https://rise.sk/',
      assetIds: ['rise-home'],
      sources: ['https://rise.sk/portfolio/rise-sk'],
      altText: 'Reálny homepage Rise.sk.',
      approvalStatus: 'approved' as const,
      approvalDigest: digest,
      currentDigest: digest,
      approvedAt: '2026-07-26T08:00:00.000Z',
      media: [
        {
          type: 'image/png' as const,
          url: 'https://example.test/slide-01.png',
          width: 1080,
          height: 1350,
        },
      ],
    };
    const stale = {
      ...approved,
      id: 'stale-pack',
      currentDigest: 'b'.repeat(64),
    };
    const draft = {
      ...approved,
      id: 'draft-pack',
      approvalStatus: 'draft' as const,
    };

    const result = buildPublicStarterPack([approved, stale, draft]);

    expect(result.status).toBe('approved');
    expect(result.packs.map(pack => pack.id)).toEqual(['approved-pack']);
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
    expect(PUBLIC_VISUAL_PLAYBOOK.chatGptContextUrl).toBe(
      'https://marosko123.github.io/rise-social/chatgpt-context.json',
    );
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
