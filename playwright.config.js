const { defineConfig, devices } = require('@playwright/test');

// Phase 0 safety net: behavioral e2e over the running (unmodified) game.
// Playwright owns the static server (npm run serve) so e2e runs identically
// locally and in CI without the legacy Grunt dev server.
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  expect: {
    // Tight tolerance: absorb font antialiasing only, not real regressions.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: 'http://127.0.0.1:8080',
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
    command: 'npm run serve',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
});
