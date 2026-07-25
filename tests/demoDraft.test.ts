import { describe, expect, test } from 'vitest';

import { createDemoDraft } from '@/demo/createDemoDraft';
import { validateDraftPack } from '@/domain/validation';
import { qaPostBeforeRender } from '@/visuals/visualQa';
import { PlaywrightAssetRenderer } from '@/rendering/playwrightAssetRenderer';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('demo draft', () => {
  test('provides a source-backed authentic three-post Rise preview without unmanaged media', async () => {
    const draft = createDemoDraft(new Date('2026-07-24T08:00:00.000Z'));

    expect(draft.posts.map(post => post.theme)).toEqual([
      'decision-education',
      'product-proof',
      'people-process',
    ]);
    expect(draft.sources.map(source => source.url)).toEqual([
      'https://rise.sk/portfolio/ai-erp',
      'https://rise.sk/portfolio/grant-ai',
      'https://rise.sk/o-nas',
    ]);
    expect(draft.posts.every(post => post.slides.every(slide => !slide.imagePath))).toBe(true);
    expect(draft.posts.map(post => qaPostBeforeRender(post, draft.assetRecords).passed)).toEqual([true, true, true]);
    expect(validateDraftPack(draft)).toEqual([]);

    const renderer = new PlaywrightAssetRenderer();
    for (const post of draft.posts) {
      const destination = mkdtempSync(join(tmpdir(), `rise-social-demo-draft-${post.id}-`));
      const rendered = await renderer.render(post, destination, draft.assetRecords);
      expect(rendered.slides).toHaveLength(post.slides.length);
      expect(readFileSync(rendered.pdf).byteLength).toBeGreaterThan(0);
    }
  }, 30_000);
});
