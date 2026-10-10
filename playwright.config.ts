import { defineConfig, devices } from '@playwright/test';

const channel = () => (process.env.E2E_CHANNEL ?? 'chrome') || undefined;

/**
 * End-to-end tests against a running app and API.
 *   E2E_BASE_URL  frontend URL (default http://localhost:5173)
 *   E2E_API_URL   API URL used for test setup (default http://localhost:3001)
 * Point the API at a disposable database: the tests register users and create data.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Uses the locally installed Google Chrome; set E2E_CHANNEL= (empty) to use Playwright's bundled Chromium.
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: channel() } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: channel() } },
  ],
});
