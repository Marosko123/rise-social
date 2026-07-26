import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { computeApprovalDigest } from '@/domain/approval';
import { createExportBundle, type AssetRenderer } from '@/export/createExportBundle';
import { createCarouselDocument } from '@/rendering/carouselDocument';
import { resolvePostAssetsForRender } from '@/rendering/assetResolution';
import { PlaywrightAssetRenderer } from '@/rendering/playwrightAssetRenderer';
import { PostConceptSchema, type Platform } from '@/domain/schemas';

import { createFixtureRun } from './fixtures';

describe('carousel document', () => {
  test('renders safe 1080 by 1350 Rise slides from escaped content', () => {
    const run = createFixtureRun();
    const post = structuredClone(run.draft.posts[0]);
    post.slides[0].title = '<script>alert("no")</script>';

    const html = createCarouselDocument(post);

    expect(html).toContain('width: 1080px');
    expect(html).toContain('height: 1350px');
    expect(html).toContain('padding: 0 84px');
    expect(html).toContain('#DAB549');
    expect(html).toContain('#080807');
    expect(html).toContain('#0C0C0C');
    expect(html).toContain('#141414');
    expect(html).toContain('#2B2924');
    expect(html).toContain('#F8F4EC');
    expect(html).toContain('data:font/woff;base64,');
    expect(html).toContain('data:font/ttf;base64,');
    expect(html).toContain('data-rise-logo="official"');
    expect(html).toContain('data-source="Rise_logo.svg"');
    expect(html).not.toContain('file://');
    expect(html).toContain('overflow: hidden');
    expect(html).toContain('&lt;script&gt;alert(&quot;no&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('class="rise-mark"');
    expect(html).not.toContain('class="orbit');
    expect(html).not.toContain('class="signal"');
    expect(html.match(/data-slide=/g)).toHaveLength(4);
  });

  test('embeds exact approved local image bytes instead of a blocked file URL', () => {
    const post = structuredClone(createFixtureRun().draft.posts[0]);
    post.slides[0].imagePath = join(
      process.cwd(),
      'public-site',
      'public',
      'brand',
      'Rise_logo_transparent.png',
    );

    const html = createCarouselDocument(post);

    expect(html).toContain('data:image/png;base64,');
    expect(html).not.toContain('file://');
  });

  test('renders the deterministic demo with its branded fallback and no unmanaged image path', async () => {
    const post = createFixtureRun().draft.posts[0];
    expect(post.slides.every(slide => !slide.imagePath)).toBe(true);
    const destination = mkdtempSync(join(tmpdir(), 'rise-social-demo-render-'));
    const rendered = await new PlaywrightAssetRenderer().render(post, destination, []);

    expect(rendered.slides).toHaveLength(post.slides.length);
    expect(readFileSync(rendered.pdf).byteLength).toBeGreaterThan(0);
  }, 30_000);

  test('rejects a cover that wraps past two rendered lines', async () => {
    const post = structuredClone(createFixtureRun().draft.posts[0]);
    post.slides[0].title = 'Modernizácia starého personálneho systému bez zbytočného rizika';
    const destination = mkdtempSync(join(tmpdir(), 'rise-social-cover-lines-'));

    await expect(new PlaywrightAssetRenderer().render(post, destination, [])).rejects.toThrow(/cover-line-count/);
  }, 30_000);

  test('allows a multi-line content headline when it remains inside the safe zone', async () => {
    const post = structuredClone(createFixtureRun().draft.posts[0]);
    post.slides[1].title = 'Modernizácia starého personálneho systému bez zbytočného rizika';
    const destination = mkdtempSync(join(tmpdir(), 'rise-social-content-lines-'));

    await expect(new PlaywrightAssetRenderer().render(post, destination, [])).resolves.toMatchObject({ postId: post.id });
  }, 30_000);

  test('renders a seven-slide app case study with two distinct approved evidence assets', async () => {
    const publicAssetRoot = join(
      process.cwd(),
      'public-site',
      'public',
      'brand',
    );
    const evidence = [
      {
        id: 'rise-app-whole',
        path: '/Rise_logo_transparent.png',
        visualClass: 'product-screenshot' as const,
      },
      {
        id: 'rise-app-detail',
        path: '/Rise_logo_text_transparent.png',
        visualClass: 'new-documentation' as const,
      },
    ].map(item => ({
      ...item,
      origin: 'rise-owned' as const,
      owner: 'Rise.sk',
      license: 'owned' as const,
      project: 'Rise.sk',
      confidentiality: 'public' as const,
      allowedPlatforms: ['instagram', 'linkedin', 'facebook'] as Platform[],
      redactionStatus: 'not-required' as const,
      contentSha256: createHash('sha256')
        .update(readFileSync(join(publicAssetRoot, item.path)))
        .digest('hex'),
      approved: true,
      requiresVisualApproval: false,
      rightsStatus: 'confirmed' as const,
      rightsReference: 'Test fixture uses exact Rise-owned brand bytes.',
    }));
    const base = createFixtureRun().draft.posts[0];
    const roles = [
      ['cover', 'app-hero', 'Web rastie s firmou', 'Živý firemný web spája služby, projekty, obsah a kontakt.'],
      ['problem', 'calm-text', 'Jeden jasný vstup', 'Informácie o službách a projektoch potrebovali jeden zrozumiteľný vstup.'],
      ['scope', 'split-detail', 'Od návrhu po rozvoj', 'Navrhli sme architektúru, vizuálny systém a priebežný rozvoj webu.'],
      ['flow', 'app-flow', 'Od potreby ku kontaktu', 'Návštevník prejde od potreby cez dôkaz k ďalšiemu kroku.'],
      ['ui-detail', 'ui-focus', 'Čitateľná obsahová hierarchia', 'Detail ukazuje jasnú hierarchiu obsahu a cestu ku kontaktu.'],
      ['decision', 'diagram', 'Šesť jazykov, jeden systém', 'Dôležité informácie zostávajú čitateľné naprieč šiestimi jazykmi webu.'],
      ['evidence', 'proof', 'Živý produkt od 2025', 'Verejná case study opisuje živý produkt rozvíjaný od roku 2025.'],
    ] as const;
    const post = PostConceptSchema.parse({
      ...base,
      project: 'Rise.sk',
      carouselTemplate: 'app-case-study',
      slides: roles.map(([role, visualLayout, title, body], index) => ({
        id: `rise-app-${index + 1}`,
        eyebrow: index === 0 ? 'RISE.SK' : String(index + 1).padStart(2, '0'),
        title,
        body,
        alt: `Karta ${index + 1} vysvetľuje časť verejnej case study Rise.sk.`,
        claimIds: ['claim-modernization'],
        role,
        visualLayout,
        surface: index === 4 ? 'media' : 'canvas',
        ...(index === 0 || index === 4
          ? {
              assetId: evidence[index === 0 ? 0 : 1].id,
              imagePath: evidence[index === 0 ? 0 : 1].path,
              assetFit: 'contain',
              crop: {
                aspectRatio: '4:5',
                focalPoint: { x: 50, y: 50 },
                preserve: 'Zachovať celý originálny Rise asset.',
              },
              ...(index === 4
                ? {
                    callouts: [
                      {
                        label: 'Jasná hierarchia',
                        anchor: { x: 68, y: 35 },
                      },
                    ],
                  }
                : {}),
            }
          : {}),
      })),
    });
    const destination = mkdtempSync(
      join(tmpdir(), 'rise-social-app-case-study-'),
    );

    const rendered = await new PlaywrightAssetRenderer({
      publicAssetRoot,
    }).render(post, destination, evidence);

    expect(rendered.slides).toHaveLength(7);
    expect(
      rendered.slides.every(path => readFileSync(path).byteLength > 0),
    ).toBe(true);
  }, 30_000);

  test('never resolves arbitrary local or remote image paths without a matching approved asset record', () => {
    const post = structuredClone(createFixtureRun().draft.posts[0]);
    post.project = 'GrantAI';
    post.slides[0].imagePath = '/private/client-screen.png';

    expect(() => resolvePostAssetsForRender(post, [], '/tmp/rise-public')).toThrow(/asset id|unknown|matching/i);

    post.slides[0].assetId = 'grantai-ui';
    const rejectedAsset = {
      id: 'grantai-ui',
      visualClass: 'product-screenshot' as const,
      origin: 'client-approved' as const,
      owner: 'GrantAI client',
      license: 'client-approved' as const,
      project: 'GrantAI',
      confidentiality: 'public' as const,
      allowedPlatforms: ['instagram', 'linkedin', 'facebook'] as Platform[],
      requiresRedaction: false,
      redactionStatus: 'not-required' as const,
      path: '/portfolio/showcase/grant-ai/cover.webp',
      sourceUrl: 'https://rise.sk/portfolio/grant-ai',
      rightsNote: 'Čaká na evidenciu povolenia klienta.',
      approved: false,
      requiresVisualApproval: true,
      rightsStatus: 'needs-confirmation' as const,
    };
    post.slides[0].imagePath = 'https://untrusted.example/image.png';
    expect(() => resolvePostAssetsForRender(post, [rejectedAsset], '/tmp/rise-public')).toThrow(/matching|approval|asset/i);
  });

  test('binds selected source image bytes to the approved asset digest', () => {
    const root = mkdtempSync(join(tmpdir(), 'rise-social-source-asset-'));
    const imagePath = '/portfolio/source.webp';
    const absolute = join(root, 'portfolio', 'source.webp');
    execFileSync('mkdir', ['-p', join(root, 'portfolio')]);
    writeFileSync(absolute, 'approved-image');
    const contentSha256 = createHash('sha256')
      .update(readFileSync(absolute))
      .digest('hex');
    const post = structuredClone(createFixtureRun().draft.posts[0]);
    post.project = 'Rise.sk';
    post.slides[0].assetId = 'rise-source';
    post.slides[0].imagePath = imagePath;
    const asset = {
      id: 'rise-source',
      visualClass: 'product-screenshot' as const,
      origin: 'rise-owned' as const,
      owner: 'Rise.sk',
      license: 'owned' as const,
      project: 'Rise.sk',
      confidentiality: 'public' as const,
      allowedPlatforms: ['instagram', 'linkedin', 'facebook'] as Platform[],
      redactionStatus: 'not-required' as const,
      path: imagePath,
      contentSha256,
      approved: true,
      requiresVisualApproval: false,
      rightsStatus: 'confirmed' as const,
      rightsReference: 'Rise ownership register',
    };
    writeFileSync(absolute, 'changed-after-approval');

    expect(() =>
      resolvePostAssetsForRender(post, [asset], root),
    ).toThrow(/digest|changed|hash/i);
  });
});

describe('manual export', () => {
  test('creates platform folders, evidence, captions, media, and a ZIP for an approved run', async () => {
    const outputRoot = mkdtempSync(join(tmpdir(), 'rise-social-export-'));
    const run = createFixtureRun();
    run.draft.posts[0].platforms.linkedin.link = 'https://rise.sk/sluzby?from=studio';
    run.approval!.digest = computeApprovalDigest(run.draft);
    const renderer: AssetRenderer = {
      async render(post, destination, assets) {
        expect(assets).toEqual(run.draft.assetRecords);
        const slides = post.slides.map((slide, index) => {
          const path = join(destination, `slide-${index + 1}.png`);
          writeFileSync(path, `png:${slide.id}`);
          return path;
        });
        const pdf = join(destination, 'carousel.pdf');
        writeFileSync(pdf, `pdf:${post.id}`);
        return { postId: post.id, slides, pdf };
      },
    };

    const result = await createExportBundle(run, outputRoot, renderer);
    const listing = execFileSync('unzip', ['-Z1', result.zipPath], { encoding: 'utf8' });

    expect(result.digest).toBe(computeApprovalDigest(run.draft));
    expect(listing).toContain('01-decision-education/instagram/caption.txt');
    expect(listing).toContain('01-decision-education/instagram/slide-01.png');
    expect(listing).toContain('01-decision-education/linkedin/carousel.pdf');
    expect(listing).toContain('01-decision-education/facebook/slide-01.png');
    expect(listing).toContain('sources.json');
    expect(listing).toContain('publishing-links.json');
    expect(listing).toContain('01-decision-education/linkedin/tracked-link.txt');
    expect(readFileSync(join(result.directory, '01-decision-education/instagram/caption.txt'), 'utf8')).toContain(
      'Verzia pre instagram',
    );
    expect(
      readFileSync(join(result.directory, '01-decision-education/linkedin/tracked-link.txt'), 'utf8'),
    ).toContain('utm_source=linkedin');
  });

  test('binds selected asset records to the approval digest and export renderer', async () => {
    const outputRoot = mkdtempSync(join(tmpdir(), 'rise-social-export-'));
    const run = createFixtureRun();
    run.draft.assetRecords = [
      {
        id: 'grantai-ui',
        visualClass: 'product-screenshot',
        origin: 'client-approved',
        owner: 'GrantAI client',
        license: 'client-approved',
        project: 'GrantAI',
        confidentiality: 'public',
        allowedPlatforms: ['instagram', 'linkedin', 'facebook'] as Platform[],
        requiresRedaction: false,
        redactionStatus: 'not-required',
        sourceUrl: 'https://rise.sk/portfolio/grant-ai',
        path: '/portfolio/showcase/grant-ai/cover.webp',
        rightsNote: 'Client approval reference: public case-study review.',
        approved: true,
        requiresVisualApproval: false,
        rightsStatus: 'needs-confirmation',
      },
    ];
    run.approval!.digest = computeApprovalDigest(run.draft);
    const approvedDigest = run.approval!.digest;
    run.draft.assetRecords[0].rightsNote = 'Changed after approval.';
    expect(computeApprovalDigest(run.draft)).not.toBe(approvedDigest);

    const renderer: AssetRenderer = {
      async render(post, destination, assets) {
        expect(assets).toHaveLength(1);
        const path = join(destination, 'slide.png');
        writeFileSync(path, 'png');
        const pdf = join(destination, 'carousel.pdf');
        writeFileSync(pdf, 'pdf');
        return { postId: post.id, slides: [path], pdf };
      },
    };
    await expect(createExportBundle(run, outputRoot, renderer)).rejects.toThrow(/stale/i);
  });

  test('rejects a missing or stale approval before rendering', async () => {
    const outputRoot = mkdtempSync(join(tmpdir(), 'rise-social-export-'));
    const run = createFixtureRun(false);
    let rendererCalled = false;
    const renderer: AssetRenderer = {
      async render() {
        rendererCalled = true;
        throw new Error('must not render');
      },
    };

    await expect(createExportBundle(run, outputRoot, renderer)).rejects.toThrow(/approved/i);
    expect(rendererCalled).toBe(false);

    const stale = createFixtureRun();
    stale.draft.posts[0].title = 'Changed after approval';
    await expect(createExportBundle(stale, outputRoot, renderer)).rejects.toThrow(/stale/i);
    expect(rendererCalled).toBe(false);
  });
});
