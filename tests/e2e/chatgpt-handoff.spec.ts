import { expect, test } from '@playwright/test';

test('puts the software identity and stop gate at the local root', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Rise.sk je softvérová a produktová firma.',
    }),
  ).toBeVisible();
  await expect(page.locator('.handoff-critical')).toContainText(
    'Nie sme stavebná firma',
  );
  await expect(page.locator('.handoff-critical')).toContainText(
    'MapaTrhu je dátový softvérový produkt',
  );
  await expect(page.getByText('Žiadosť o prvé obrázky?')).toBeVisible();
  await expect(page.locator('.handoff-brand svg')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
});
