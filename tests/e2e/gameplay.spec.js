import { test, expect } from '@playwright/test';
import { gotoGameAndWaitForMenu, isState } from './helpers.js';

// Behavioral seams that must survive the later melonJS v4 -> v17 rewrite:
//   title -> play -> gameover state flow, score increments on pipe pass,
//   collision ends the run, hi-score persists in localStorage.
// We OBSERVE via window.game / window.me and DRIVE via real input / the real
// game code paths (never by directly poking the value under assertion).

test.use({ viewport: { width: 1000, height: 700 } });

/** From the title screen, press SPACE (real input) and wait until PLAY is
 *  active and the ~2s "get ready" tween has flipped game.data.start = true. */
async function startPlaying(page) {
  await gotoGameAndWaitForMenu(page);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.me.state.isCurrent(window.me.state.PLAY), undefined, {
    timeout: 10000,
  });
  await page.waitForFunction(() => window.game.data.start === true, undefined, {
    timeout: 10000,
  });
}

test('SPACE on the title screen transitions MENU -> PLAY', async ({ page }) => {
  await gotoGameAndWaitForMenu(page);
  expect(await isState(page, 'MENU')).toBe(true);

  await page.keyboard.press('Space');

  await expect.poll(() => isState(page, 'PLAY'), { timeout: 10000 }).toBe(true);
});

test('score (steps) increments when the bird passes a pipe hit-box', async ({ page }) => {
  await startPlaying(page);

  const before = await page.evaluate(() => window.game.data.steps);

  // Drive the REAL scoring path: spawn a real "hit" entity (the invisible
  // in-gap trigger) onto the live bird and invoke the bird's real onCollision
  // handler, exactly as the collision system would. The ++ is computed by game
  // code (entities.js onCollision, type === 'hit'), not by the test.
  const ok = await page.evaluate(() => {
    const world = window.me.game.world;
    const bird = world.children.find((c) => c instanceof window.game.BirdEntity);
    if (!bird) return false;
    const hit = window.me.pool.pull('hit', bird.pos.x, bird.pos.y);
    world.addChild(hit, 11);
    bird.onCollision({ b: hit }, hit);
    return true;
  });
  expect(ok).toBe(true);

  await expect
    .poll(() => page.evaluate(() => window.game.data.steps), { timeout: 5000 })
    .toBe(before + 1);
});

test('collision ends the run: PLAY -> GAME_OVER without flapping', async ({ page }) => {
  await startPlaying(page);

  // Do not flap: the bird falls under gravity, collides with the ground (real
  // collision path), plays the end animation, then transitions to GAME_OVER.
  await expect.poll(() => isState(page, 'GAME_OVER'), { timeout: 20000 }).toBe(true);
});

test('hi-score persists in localStorage across a full reload', async ({ page }) => {
  await gotoGameAndWaitForMenu(page);

  // Persist via the same API the game uses (gameover.js: me.save.add/topSteps).
  await page.evaluate(() => {
    if (window.me.save.topSteps === undefined) {
      window.me.save.add({ topSteps: 0 });
    }
    window.me.save.topSteps = 42;
  });

  // Prove it actually reached localStorage (not just in-memory state).
  const inStorage = await page.evaluate(() =>
    Object.keys(window.localStorage).some((k) =>
      String(window.localStorage.getItem(k)).includes('42'),
    ),
  );
  expect(inStorage).toBe(true);

  // Full reload = fresh JS context; value must come back from localStorage.
  // melonJS re-binds a saved key only when the game re-registers it via
  // me.save.add (exactly what gameover.js does: `if (!me.save.topSteps)
  // me.save.add({topSteps: ...})`). This asserts the real localStorage round-trip.
  await gotoGameAndWaitForMenu(page);
  const restored = await page.evaluate(() => {
    window.me.save.add({ topSteps: 0 });
    return window.me.save.topSteps;
  });
  expect(restored).toBe(42);
});
