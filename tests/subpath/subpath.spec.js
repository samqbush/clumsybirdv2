import { test, expect } from '@playwright/test';

// Phase 3 sub-path deployment smoke: boot the built bundle from a GitHub
// Pages-style project sub-path and assert every asset resolves. This is the
// gate for "relative base breaks asset loading under /clumsybirdv2/".

const BASE = '/clumsybirdv2/';
const MENU_TIMEOUT = 15000;

test('built bundle boots under the Pages sub-path with all assets resolving', async ({ page }) => {
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // favicon 404 is environmental noise, not a game/asset error.
    if (/favicon/i.test(msg.text())) return;
    consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  page.on('requestfailed', (req) => {
    if (/favicon/i.test(req.url())) return;
    failedRequests.push(`${req.url()} (${req.failure()?.errorText ?? 'failed'})`);
  });
  page.on('response', (res) => {
    const url = res.url();
    if (/favicon/i.test(url)) return;
    // Only assert on our own origin's assets; ignore any third-party embeds.
    if (!url.includes('127.0.0.1:4180')) return;
    if (res.status() >= 400) badResponses.push(`${res.status()} ${url}`);
  });

  await page.goto(BASE);

  // The game exposes window.me / window.game; wait until melonJS finishes
  // loading every resource and the title (MENU) state is active. If any asset
  // 404'd this would not be reached.
  await page.waitForFunction(
    () =>
      !!window.me &&
      !!window.game &&
      !!window.me.state &&
      typeof window.me.state.isCurrent === 'function' &&
      window.me.state.isCurrent(window.me.state.MENU),
    undefined,
    { timeout: MENU_TIMEOUT },
  );

  expect(failedRequests, `Failed asset requests:\n${failedRequests.join('\n')}`).toEqual([]);
  expect(badResponses, `Non-2xx asset responses:\n${badResponses.join('\n')}`).toEqual([]);
  expect(consoleErrors, `Console/page errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});

test('the gamefont @font-face loads under the sub-path', async ({ page }) => {
  await page.goto(BASE);
  await page.waitForFunction(
    () => !!window.me && window.me.state?.isCurrent(window.me.state.MENU),
    undefined,
    { timeout: MENU_TIMEOUT },
  );
  // Force-load the @font-face (CSS fonts load lazily). load() resolves with the
  // matched FontFace(s) on success and an empty array if the url() 404s, so this
  // fails loudly if the sub-path font path is broken.
  const fontLoaded = await page.evaluate(async () => {
    try {
      const faces = await document.fonts.load("20px 'gamefont'");
      return faces.length > 0 && document.fonts.check("20px 'gamefont'");
    } catch {
      return false;
    }
  });
  expect(fontLoaded, 'gamefont did not load from the sub-path').toBe(true);
});

test('the sub-path root redirects when the trailing slash is missing', async ({ request }) => {
  // Mirrors GitHub Pages: /clumsybirdv2 -> /clumsybirdv2/. Relative asset URLs
  // only resolve correctly from the trailing-slash directory URL.
  const res = await request.get('/clumsybirdv2', { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(res.headers()['location']).toBe('/clumsybirdv2/');
});
