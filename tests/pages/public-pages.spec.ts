import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PAGES_ORIGIN = 'http://127.0.0.1:4183';
const PUBLIC_ORIGIN = 'https://marosko123.github.io';
const BASE_PATH = '/rise-social';

test.describe('GitHub Pages public presentation', () => {
  test('serves the canonical content plan at root and /content-plan/', async ({
    page,
  }) => {
    const failedResponses: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        failedResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    for (const path of [`${BASE_PATH}/`, `${BASE_PATH}/content-plan/`]) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: '90-dňový content plán' }),
      ).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        path === `${BASE_PATH}/`
          ? `${PUBLIC_ORIGIN}${BASE_PATH}/`
          : `${PUBLIC_ORIGIN}${BASE_PATH}/content-plan/`,
      );
    }

    expect(failedResponses).toEqual([]);
  });

  test('keeps the review demonstrably read-only on desktop and mobile', async ({
    page,
  }) => {
    const failedResponses: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        failedResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    const response = await page.goto(`${BASE_PATH}/review/`);
    const html = await response?.text();
    expect(html).not.toContain('internal ownership register');
    expect(html).not.toContain('rightsEvidence');
    expect(html).not.toContain('workflowContext');
    await expect(
      page.getByRole('status', { name: 'Verejná read-only ukážka' }),
    ).toContainText('nič nie je publikované');
    await expect(
      page.getByLabel('Náhľad Instagram gridu').locator('.grid-tile'),
    ).toHaveCount(9);
    const linkedInPages = page
      .getByLabel('Náhľad strán LinkedIn PDF')
      .locator(':scope > div');
    const linkedInPageCount = await linkedInPages.count();
    expect(linkedInPageCount).toBeGreaterThanOrEqual(4);
    expect(linkedInPageCount).toBeLessThanOrEqual(8);
    await expect(page.locator('.facebook-crop-frame')).toBeVisible();
    await expect(page.getByRole('button', { name: /Schváliť/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /exportovať/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /naplánovať/i })).toHaveCount(0);
    await expect(page.getByLabel('Kvalifikované rozhovory')).toHaveCount(0);

    const desktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desktopOverflow).toBe(0);
    const gridLabels = await page
      .getByLabel('Náhľad Instagram gridu')
      .locator('.grid-tile')
      .allTextContents();
    expect(new Set(gridLabels.map(label => label.trim())).size).toBe(9);
    await expect(page.locator('body')).toHaveCSS(
      'font-family',
      /Inter/,
    );
    await expect(page.getByRole('heading', { name: '3-príspevkový balík' })).toHaveCSS(
      'font-family',
      /Playfair Display/,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(mobileOverflow).toBe(0);
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus-visible')).toBeVisible();
    const reducedMotionStyles = await page.locator('.platform-switch button').first().evaluate(
      element => {
        const styles = getComputedStyle(element);
        return {
          animationDuration: styles.animationDuration,
          transitionDuration: styles.transitionDuration,
        };
      },
    );
    expect(reducedMotionStyles).toEqual({
      animationDuration: '0s',
      transitionDuration: '0s',
    });

    expect(failedResponses).toEqual([]);
  });

  test('contains no local API or mutation implementation in any exported file', () => {
    const outputRoot = resolve(process.cwd(), 'public-site', 'out');
    const paths: string[] = [];
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory)) {
        const absolute = join(directory, entry);
        if (statSync(absolute).isDirectory()) visit(absolute);
        else paths.push(absolute);
      }
    };
    visit(outputRoot);

    const forbiddenMarkers = [
      '/api/runs/',
      'Schváliť a exportovať',
      'Schváliť Buffer koncepty',
      'Schváliť a naplánovať',
      'Uložiť výsledok',
      'Uložiť čas',
      'Požiadať o úpravy',
    ];
    const violations = paths.flatMap(path => {
      const content = readFileSync(path).toString('utf8');
      return forbiddenMarkers
        .filter(marker => content.includes(marker))
        .map(marker => `${path}: ${marker}`);
    });

    expect(violations).toEqual([]);
  });

  test('serves crawler and ChatGPT discovery files with absolute Pages links', async ({
    request,
  }) => {
    for (const path of ['robots.txt', 'sitemap.xml', 'llms.txt']) {
      const response = await request.get(
        `${PAGES_ORIGIN}${BASE_PATH}/${path}`,
      );
      expect(response.status(), path).toBe(200);
      expect(await response.text(), path).toContain(
        `${PUBLIC_ORIGIN}${BASE_PATH}/`,
      );
    }

    const apiResponse = await request.get(
      `${PAGES_ORIGIN}${BASE_PATH}/api/runs/demo/approve/`,
    );
    expect(apiResponse.status()).toBe(404);
  });
});
