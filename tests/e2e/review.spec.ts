import { expect, test } from '@playwright/test';

test('reviews the source-backed pack at desktop and mobile widths', async ({ page }) => {
  const response = await page.goto('/review');
  expect(response?.headers()['x-frame-options']).toBe('DENY');
  expect(response?.headers()['content-security-policy']).toContain(
    "frame-ancestors 'none'",
  );
  await expect(
    page.getByRole('heading', { name: '3-príspevkový balík' }),
  ).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(3);
  await expect(page.getByLabel('Náhľad Instagram gridu').locator('.grid-tile')).toHaveCount(9);
  await expect(page.getByText('Overené zdroje')).toBeVisible();
  await expect(page.getByText('LinkedIn dokument')).toBeVisible();
  await expect(page.getByText('Facebook crop')).toBeVisible();
  await expect(page.getByText('Biznisový brief', { exact: true })).toBeVisible();
  await expect(page.getByText('Vizuálna QA', { exact: true })).toBeVisible();
  await expect(page.getByText('Ľudské checkpointy')).toBeVisible();
  const tileLabels = await page
    .getByLabel('Náhľad Instagram gridu')
    .locator('.grid-tile')
    .allTextContents();
  expect(new Set(tileLabels).size).toBe(9);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('heading', { name: '3-príspevkový balík' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nasledujúca karta' })).toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
});
