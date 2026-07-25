import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.RISE_SOCIAL_PAGES_PORT ?? '4183');

export default defineConfig({
  testDir: './tests/pages',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/support/pages-server.mjs',
    url: `http://127.0.0.1:${port}/rise-social/`,
    reuseExistingServer: false,
    timeout: 20_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
