import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  PROFILE_PACK_FILES,
  RISE_LOGO_SOURCE,
  RISE_PROFILE_MANIFEST,
  createProfilePack,
  measureLinkedInCover,
  renderCoverSvg,
  renderOwnedLogoPng,
  readPngDimensions,
} from '@/profile/profilePack';

describe('Rise profile pack', () => {
  test('keeps the approved identity and platform-specific UTM links in one typed manifest', () => {
    expect(RISE_PROFILE_MANIFEST.name).toBe('Rise.sk');
    expect(RISE_PROFILE_MANIFEST.promise).toBe('Softvér, ktorý prináša výsledky.');
    expect(RISE_PROFILE_MANIFEST.secondarySentence).toBe(
      'Softvér, dáta a AI. Jeden tím od návrhu po prevádzku.',
    );
    expect(RISE_PROFILE_MANIFEST.platforms.linkedin.about).toContain('Rise.sk je softvérová firma z Bratislavy.');
    expect(RISE_PROFILE_MANIFEST.platforms.instagram.bio).toContain('Softvér, dáta a AI, ktoré fungujú v praxi.');
    expect(RISE_PROFILE_MANIFEST.platforms.facebook.intro).toBe(
      'Staviame softvér, dátové systémy a AI automatizácie. Jeden tím od návrhu po prevádzku.',
    );
    expect(RISE_PROFILE_MANIFEST.platforms.linkedin.specialties).toEqual([
      'Custom software',
      'AI, automation and data',
      'Product strategy and UX/UI',
      'Software modernization',
      'Technology consulting and audits',
      'Digital marketing',
    ]);
    expect(RISE_PROFILE_MANIFEST.platforms.instagram.highlights).toEqual([
      'Projekty',
      'Ako robíme',
      'AI a dáta',
      'Tím',
      'Články',
      'Kontakt',
    ]);

    const links = Object.entries(RISE_PROFILE_MANIFEST.platforms).flatMap(([platform, profile]) =>
      Object.entries(profile.links).map(([destination, url]) => ({ platform, destination, url: new URL(url) })),
    );
    expect(links).toHaveLength(9);
    expect(new Set(links.map(link => link.url.searchParams.get('utm_campaign'))).size).toBe(9);
    expect(new Set(links.map(link => link.url.searchParams.get('utm_content'))).size).toBe(9);
    expect(RISE_PROFILE_MANIFEST.handleFallbackOrder).toEqual(['@rise.sk', '@risesk', '@risesksoftware']);
    expect(RISE_LOGO_SOURCE.sha256).toBe('66f0d9e833b9f5b979db369a5b35f6bb547ad05564ec362013295eef1db67037');
    expect(RISE_LOGO_SOURCE.path).toBe('brand/rise-logo.svg');
    expect(RISE_LOGO_SOURCE.sourcePublicPath).not.toMatch(
      new RegExp('^(?:/(?:Users|home)/|[A-Za-z]:\\\\Users\\\\)'),
    );
  });

  test('uses the approved headline in the responsive SVG cover source and labels every standalone grid tile', () => {
    expect(renderCoverSvg('linkedin')).toContain('Softvér, ktorý prináša výsledky.');
    expect(renderCoverSvg('facebook')).toContain('Softvér, ktorý prináša výsledky.');
    expect(RISE_PROFILE_MANIFEST.assetMetadata['linkedin-cover.png'].safeZoneNote).toMatch(/stred/i);
    expect(RISE_PROFILE_MANIFEST.assetMetadata['facebook-cover.png'].safeZoneNote).toMatch(/vpravo/i);
    expect(RISE_PROFILE_MANIFEST.gridPreview.tiles).toHaveLength(9);
    expect(RISE_PROFILE_MANIFEST.gridPreview.tiles.every(tile => tile.label.length > 8)).toBe(true);
    expect(RISE_PROFILE_MANIFEST.gridPreview.tiles.map(tile => tile.kind)).toEqual([
      'product-proof', 'diagram', 'photo-slot',
      'product-proof', 'diagram', 'photo-slot',
      'product-proof', 'diagram', 'photo-slot',
    ]);
  });

  test('measures LinkedIn headline and supporting copy inside the declared safe zone using loaded local fonts', async () => {
    const measurement = await measureLinkedInCover();

    expect(measurement.fontsLoaded).toBe(true);
    expect(measurement.headline.fontFamily).toMatch(/^"Playfair Display"/);
    expect(measurement.supportingCopy.fontFamily).toMatch(/Inter/);
    for (const bounds of [measurement.headline.bounds, measurement.supportingCopy.bounds]) {
      expect(bounds.left).toBeGreaterThanOrEqual(1050);
      expect(bounds.right).toBeLessThanOrEqual(3150);
    }
  }, 30_000);

  test('creates deterministic local PNG previews, manifest and manual-only checklist', async () => {
    const output = mkdtempSync(join(tmpdir(), 'rise-profile-pack-'));
    const first = await createProfilePack(output);
    const second = await createProfilePack(output);

    expect(second.manifestHash).toBe(first.manifestHash);
    expect(first.externalMutations).toEqual([]);
    expect(first.files.map(file => file.name).sort()).toEqual([...PROFILE_PACK_FILES].sort());
    expect(readPngDimensions(join(output, 'linkedin-cover.png'))).toEqual({ width: 4200, height: 700 });
    expect(readPngDimensions(join(output, 'facebook-cover.png'))).toEqual({ width: 851, height: 315 });
    expect(readPngDimensions(join(output, 'profile-master.png'))).toEqual({ width: 320, height: 320 });
    expect(readPngDimensions(join(output, 'profile-32px.png'))).toEqual({ width: 32, height: 32 });
    expect(readPngDimensions(join(output, 'instagram-grid-preview.png'))).toEqual({ width: 1080, height: 1080 });
    expect(readFileSync(join(output, 'profile-master.png'))).toEqual(await renderOwnedLogoPng(320));
    expect(readFileSync(join(output, 'profile-32px.png'))).toEqual(await renderOwnedLogoPng(32));
    for (const asset of Object.keys(RISE_PROFILE_MANIFEST.assetMetadata)) {
      expect(statSync(join(output, asset)).size).toBeGreaterThan(50);
      expect(RISE_PROFILE_MANIFEST.assetMetadata[asset as keyof typeof RISE_PROFILE_MANIFEST.assetMetadata].safeZoneNote).not.toHaveLength(0);
    }

    const manifest = JSON.parse(readFileSync(join(output, 'profile-manifest.json'), 'utf8')) as typeof RISE_PROFILE_MANIFEST;
    expect(JSON.stringify(manifest)).not.toContain(['/Users', ''].join('/'));
    expect(manifest.assetMetadata['linkedin-cover.png'].safeZoneNote).toMatch(/stred/i);
    expect(readFileSync(join(output, 'profile-checklist.md'), 'utf8')).toMatch(/manuálne/i);
    const checklist = readFileSync(join(output, 'profile-checklist.md'), 'utf8');
    expect(checklist).toContain(LINKEDIN_ABOUT_FRAGMENT);
    expect(checklist).toContain('https://rise.sk/portfolio?utm_source=linkedin');
    expect(checklist).toContain('Čo staviame');
  }, 30_000);

  test('rejects every output location inside the approved-content archive', async () => {
    const approved = join(process.cwd(), 'content', 'approved');
    await expect(createProfilePack(approved)).rejects.toThrow(/approved-content archive/i);
    await expect(createProfilePack(join(approved, 'profile-pack'))).rejects.toThrow(/approved-content archive/i);
    await expect(createProfilePack('content/approved')).rejects.toThrow(/approved-content archive/i);
  });
});

const LINKEDIN_ABOUT_FRAGMENT = 'Rise.sk je softvérová firma z Bratislavy.';
