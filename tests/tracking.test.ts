import { describe, expect, test } from 'vitest';

import { trackedPlatformLink } from '@/domain/tracking';

describe('platform campaign tracking', () => {
  test('adds deterministic UTM fields while preserving an existing query and fragment', () => {
    expect(
      trackedPlatformLink(
        'https://rise.sk/portfolio/grant-ai?language=sk#demo',
        'linkedin',
        'run-20260724',
        'grantai-product-flow',
        new Date('2026-07-24T10:00:00.000Z'),
      ),
    ).toBe(
      'https://rise.sk/portfolio/grant-ai?language=sk&utm_source=linkedin&utm_medium=organic_social&utm_campaign=rise_social_2026_07&utm_content=run-20260724_grantai-product-flow#demo',
    );
  });
});
