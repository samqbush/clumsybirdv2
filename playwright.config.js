import { defineConfig, devices } from '@playwright/test';

// Phase 1: behavioral e2e over the Vite-built game (dist/), served by
// `vite preview`. Playwright builds then previews so the net exercises the
// real production bundle + copied assets, identically locally and in CI.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  expect: {
    // Tight tolerance: absorb font antialiasing only, not real regressions.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Allow audio autoplay so headless boot is not blocked.
          args: ['--autoplay-policy=no-user-gesture-required'],
        },
      },
    },
  ],
  webServer: {
    // Build the production bundle, then serve dist/ on a fixed strict port.
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
