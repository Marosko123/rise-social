import { expect, test } from '@playwright/test';

test('explores the complete content plan at desktop and mobile widths', async ({
  page,
}) => {
  await page.goto('/content-plan');

  await expect(
    page.getByRole('heading', { name: '90-dňový content plán' }),
  ).toBeVisible();
  await expect(page.getByTestId('content-plan-entry')).toHaveCount(24);
  await expect(page.getByTestId('project-disclosure')).toHaveCount(11);

  await page.getByRole('button', { name: 'Dôkazy' }).click();
  await expect(page.getByTestId('content-plan-entry')).toHaveCount(8);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Všetky' }).click();
  await expect(
    page.getByRole('heading', { name: '90-dňový content plán' }),
  ).toBeVisible();
  await expect(page.getByTestId('content-plan-entry')).toHaveCount(24);
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
});
