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

test('PLAY -> GAME_OVER world reset raises no errors (bird body teardown)', async ({ page }) => {
  // Regression: on death, the PLAY world resets and destroys the bird. melonJS
  // v19 Body.destroy() tried to recycle the bird's me.Ellipse collision shape,
  // which is not poolable, throwing "me.pool: object ... cannot be recycled" and
  // freezing the game a few seconds into play. Assert the death transition is
  // error-free, not merely that the state flips (the state flipped even while
  // the reset threw, which is why the plain collision test missed this).
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon/i.test(msg.text())) errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));

  await startPlaying(page);
  await expect.poll(() => isState(page, 'GAME_OVER'), { timeout: 20000 }).toBe(true);
  // Let the world reset / destroy chain fully settle after the transition.
  await page.waitForTimeout(500);

  expect(errors, `Unexpected errors during death transition:\n${errors.join('\n')}`).toEqual([]);
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

// Regression: the melonJS v4 -> v19 rewrite turned the gameplay entities into
// me.Sprite subclasses, which default to a CENTER anchorPoint (0.5, 0.5). The
// pipe/ground/bird placement math is inherited unchanged from v4, where
// me.Entity positioned by its TOP-LEFT corner, so centering shifted every
// entity up by half its size (832px for the 1664px pipes). That pushed the pipe
// gap entirely off the top of the screen, leaving the bottom pipe covering the
// whole play area -> a solid wall the bird could never pass (the game died
// "no matter what" after ~10-20s). The fix restores top-left anchors + a
// render-only flip on the bottom pipe. This test asserts a real spawned pipe
// pair leaves a passable, on-screen gap that the invisible score trigger sits
// inside, and that collision extents match the visible sprite (no invisible
// wall). It would fail before the fix (gap off-screen) and pass after.
test('a spawned pipe pair leaves a passable, on-screen gap (unwinnable-wall regression)', async ({
  page,
}) => {
  await startPlaying(page);

  // Wait for the PipeGenerator to spawn a real pipe pair.
  await page.waitForFunction(
    () => {
      let n = 0;
      for (const c of window.me.game.world.children) {
        if (c instanceof window.game.PipeEntity) n++;
      }
      return n >= 2;
    },
    undefined,
    { timeout: 10000 },
  );

  const geo = await page.evaluate(() => {
    const world = window.me.game.world;
    const pipes = [];
    let hit = null;
    // world-space top/bottom of a body's first collision shape
    const shapeExtent = (c) => {
      const shp = c.body.shapes[0];
      const sb = shp.getBounds();
      const top = c.pos.y + shp.pos.y + sb.y;
      return { top, bottom: top + sb.height };
    };
    for (const c of world.children) {
      if (c instanceof window.game.PipeEntity) {
        const b = c.getBounds();
        pipes.push({
          x: Math.round(c.pos.x),
          flipY: !!(c._flip && c._flip.y),
          render: { top: b.y, bottom: b.y + b.height },
          collide: shapeExtent(c),
        });
      }
      if (c instanceof window.game.HitEntity) hit = { x: Math.round(c.pos.x), ...shapeExtent(c) };
    }
    return { vpH: window.me.game.viewport.height, pipes, hit };
  });

  // Isolate a single spawned pair (same x). PipeGenerator always spawns exactly
  // two pipes plus one hit trigger per tick.
  const byX = {};
  for (const p of geo.pipes) (byX[p.x] = byX[p.x] || []).push(p);
  const pair = Object.values(byX).find((g) => g.length === 2);
  expect(pair, 'expected a spawned pipe pair sharing an x').toBeTruthy();

  const topPipe = pair.reduce((a, b) => (a.collide.top < b.collide.top ? a : b));
  const botPipe = pair.reduce((a, b) => (a.collide.top > b.collide.top ? a : b));

  // The passable gap: below the upper pipe's bottom edge, above the lower pipe's top edge.
  const gapTop = topPipe.collide.bottom;
  const gapBottom = botPipe.collide.top;
  const gapHeight = gapBottom - gapTop;

  // 1) The pipes actually leave a gap (before the fix the "gap" was negative/off-screen).
  expect(gapHeight).toBeGreaterThan(120);

  // 2) The gap overlaps the visible viewport (0..vpH) - not off the top of the screen.
  expect(gapTop).toBeLessThan(geo.vpH);
  expect(gapBottom).toBeGreaterThan(0);

  // 3) The invisible score trigger sits inside the gap, so a bird flying the gap scores.
  expect(geo.hit, 'expected a hit trigger').toBeTruthy();
  expect(geo.hit.top).toBeGreaterThanOrEqual(gapTop);
  expect(geo.hit.bottom).toBeLessThanOrEqual(gapBottom);

  // 4) Collision extents match the visible sprite for both pipes (no invisible wall):
  //    render bounds and narrow-phase collision-shape extents agree within 1px.
  for (const p of pair) {
    expect(Math.abs(p.render.top - p.collide.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(p.render.bottom - p.collide.bottom)).toBeLessThanOrEqual(1);
  }

  // 5) Exactly one pipe of the pair is flipped (the bottom one, cap pointing up).
  expect(pair.filter((p) => p.flipY).length).toBe(1);
});
