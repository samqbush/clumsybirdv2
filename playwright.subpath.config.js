import { defineConfig, devices } from '@playwright/test';

// Phase 3: sub-path deployment smoke. Serves the built dist/ under a GitHub
// Pages-style project sub-path (/clumsybirdv2/) and boots the game there, so we
// prove the relative-base ('./') bundle resolves every asset from a nested
// directory URL -- the real Pages topology. The root-served net in
// playwright.config.js cannot catch a sub-path-only regression (e.g. a stray
// root-absolute asset ref), so this config is the deploy gate for that risk.
//
// dist/ must already be built (the serve script exits if it is missing); the
// test:e2e:subpath npm script runs `vite build` first.
export default defineConfig({
  testDir: './tests/subpath',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4180',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--autoplay-policy=no-user-gesture-required'],
        },
      },
    },
  ],
  webServer: {
    command: 'node tests/subpath/serve.mjs',
    url: 'http://127.0.0.1:4180/clumsybirdv2/',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
});
