import { defineConfig, devices } from '@playwright/test'

/**
 * Local E2E: assumes BOTH dev servers are running:
 *   - API on :8000 (started with ALLOW_TEST_ENDPOINTS=true)
 *   - Web on :3000 (Vite proxy forwards /api/* to :8000)
 *
 * We do NOT use Playwright's `webServer` config because the project's
 * dev script orchestrates both processes and shutting that down between
 * test runs would conflict with normal development. CI / one-shot runs
 * can set PLAYWRIGHT_USE_WEBSERVER=1 to opt in.
 */
const useWebServer = process.env.PLAYWRIGHT_USE_WEBSERVER === '1'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  ...(useWebServer
    ? {
        webServer: [
          {
            command: 'cd ../api && ALLOW_TEST_ENDPOINTS=true npm run dev',
            port: 8000,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
          },
          {
            command: 'npm run dev',
            port: 3000,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
          },
        ],
      }
    : {}),
})
