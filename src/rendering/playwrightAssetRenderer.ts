import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from 'playwright-core';

import type { AssetRecord, PostConcept } from '@/domain/schemas';
import type { AssetRenderer, RenderedPostAssets } from '@/export/createExportBundle';

import { createCarouselDocument } from './carouselDocument';
import { resolvePostAssetsForRender } from './assetResolution';
import { evaluateDomVisualQa } from './domVisualQa';
import { qaPostBeforeRender, qaRenderedSlides } from '@/visuals/visualQa';

export function fileSha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export class PlaywrightAssetRenderer implements AssetRenderer {
  constructor(private readonly options: { publicAssetRoot?: string } = {}) {}

  async render(
    post: PostConcept,
    destination: string,
    assets: readonly AssetRecord[] = [],
  ): Promise<RenderedPostAssets> {
    const preRenderQa = qaPostBeforeRender(post, assets);
    if (!preRenderQa.passed) {
      throw new Error(`Pre-render visual QA failed: ${preRenderQa.findings.map(finding => finding.code).join(', ')}`);
    }
    const postForRender = resolvePostAssetsForRender(post, assets, this.options.publicAssetRoot);
    await mkdir(destination, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
      await page.setContent(createCarouselDocument(postForRender), { waitUntil: 'load' });
      const domFindings = await evaluateDomVisualQa(page);
      if (domFindings.length > 0) {
        throw new Error(`DOM visual QA failed: ${domFindings.join(', ')}`);
      }
      const slides: string[] = [];
      for (let index = 0; index < post.slides.length; index += 1) {
        const path = join(destination, `slide-${String(index + 1).padStart(2, '0')}.png`);
        await page.locator(`[data-slide="${index + 1}"]`).screenshot({
          path,
          animations: 'disabled',
        });
        slides.push(path);
      }
      const pdf = join(destination, 'carousel.pdf');
      await page.pdf({
        path: pdf,
        width: '1080px',
        height: '1350px',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
      const visualQa = await qaRenderedSlides(slides, post.slides.length);
      if (!visualQa.passed) {
        throw new Error(`Post-render visual QA failed: ${visualQa.findings.map(finding => finding.code).join(', ')}`);
      }
      return { postId: post.id, slides, pdf };
    } finally {
      await browser.close();
    }
  }
}
