const { test, expect } = require('@playwright/test');
const { gotoGameAndWaitForMenu } = require('./helpers');

// Boot smoke test + golden-master screenshot of the title screen.
// Behavioral seams: game boots with 0 console errors and renders a stable title.

test.use({ viewport: { width: 1000, height: 700 } });

test('boots with zero console errors and reaches the title screen', async ({ page }) => {
  const errors = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // favicon 404 is environmental noise, not a game error.
    if (/favicon/i.test(text)) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => errors.push(String(err)));

  await gotoGameAndWaitForMenu(page);

  expect(errors, `Unexpected console/page errors:\n${errors.join('\n')}`).toEqual([]);
});

test('title screen matches golden master (stable region above the scrolling ground)', async ({ page }) => {
  // The golden master is a committed Linux fixture captured in the same
  // Playwright container CI uses. Skip elsewhere (e.g. local macOS) to avoid a
  // false failure from a missing per-OS snapshot; CI (Linux) enforces it.
  test.skip(process.platform !== 'linux', 'golden master is a Linux-only fixture');

  await gotoGameAndWaitForMenu(page);

  // The logo tweens into place over ~1s; wait for it to settle.
  await page.waitForTimeout(1500);

  const canvas = page.locator('#screen canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  // Exclude the bottom ~22% of the canvas: the ground layer scrolls perpetually
  // and would make a full-canvas snapshot non-deterministic. The region above it
  // (background + settled logo + instructions text) is static.
  await expect(page).toHaveScreenshot('title-screen.png', {
    clip: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: Math.round(box.height * 0.78),
    },
  });
});
