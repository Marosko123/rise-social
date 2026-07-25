import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.RISE_SOCIAL_E2E_PORT ?? '4173');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: process.env.PLAYWRIGHT_PRODUCTION
      ? `npx next start --hostname 127.0.0.1 --port ${port}`
      : `npx next dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_PRODUCTION,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
