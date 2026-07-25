import { describe, expect, test } from 'vitest';

import {
  PLATFORM_EDITORIAL_PROFILES,
  platformPromptBlock,
} from '@/editorial/platformGuidance';
import { validateDraftPack } from '@/domain/validation';

import { createFixtureDraft } from './fixtures';

describe('platform-specific editorial guidance', () => {
  test('gives each platform a distinct purpose, structure, link policy, and visual contract', () => {
    const linkedin = PLATFORM_EDITORIAL_PROFILES.linkedin;
    const instagram = PLATFORM_EDITORIAL_PROFILES.instagram;
    const facebook = PLATFORM_EDITORIAL_PROFILES.facebook;

    expect(linkedin.purpose).not.toBe(instagram.purpose);
    expect(instagram.structure).not.toEqual(facebook.structure);
    expect(linkedin.linkPolicy).toMatch(/priamy HTTPS odkaz/i);
    expect(instagram.linkPolicy).toMatch(/odkaz v profile/i);
    expect(facebook.visualFormat).toMatch(/zoradené obrázky/i);
    expect(linkedin.visualFormat).toMatch(/PDF/i);
    expect(instagram.visualFormat).toContain('1080×1350');
  });

  test('renders explicit, non-interchangeable instructions into the author prompt', () => {
    const prompt = platformPromptBlock();

    expect(prompt).toContain('LINKEDIN');
    expect(prompt).toContain('INSTAGRAM');
    expect(prompt).toContain('FACEBOOK');
    expect(prompt).toContain('vlastnú perspektívu');
    expect(prompt).toContain('odkaz v profile');
    expect(prompt).toContain('kratší konverzačný');
  });

  test('rejects an Instagram caption with a raw URL and an overlong Facebook caption', () => {
    const draft = createFixtureDraft();
    draft.posts[0].platforms.instagram.caption =
      'Konkrétny postup nájdete na https://rise.sk. #softver #produkt';
    draft.posts[0].platforms.facebook.caption = `${'Konkrétna veta. '.repeat(70)} #rise`;

    const issues = validateDraftPack(draft);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'platform-link-placement',
        path: 'posts.0.platforms.instagram.caption',
      }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'platform-caption-length',
        path: 'posts.0.platforms.facebook.caption',
      }),
    );
  });
});
