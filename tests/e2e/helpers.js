// Shared helpers for the Phase 0 behavioral safety net.
// The game exposes `window.game` and `window.me` globals; we OBSERVE via those
// and DRIVE via real input, per the Phase 0 net design.

const MENU_TIMEOUT = 15000;

/**
 * Navigate to the game and wait until melonJS has finished loading resources
 * and the title (MENU) state is active.
 */
async function gotoGameAndWaitForMenu(page) {
  await page.goto('/');
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
}

/** Read whether a given melonJS state id is current. */
function isState(page, stateName) {
  return page.evaluate((name) => window.me.state.isCurrent(window.me.state[name]), stateName);
}

export { gotoGameAndWaitForMenu, isState, MENU_TIMEOUT };
