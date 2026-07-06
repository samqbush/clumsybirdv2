// Phase 2: melonJS is now an npm ESM dependency (`melonjs@19`), not a vendored
// global. Every game module imports the engine namespace from here so that the
// `me.*` references in top-level class definitions resolve at module-eval time
// (ES module imports are fully resolved before the importing module body runs).
//
// Publishing `window.me` here (as an import side effect, before any screen or
// entity module evaluates) keeps the Phase 0 Playwright behavioral net working:
// helpers.js and the specs OBSERVE the game through `window.me` and `window.game`.
import * as me from 'melonjs';

window.me = me;

export { me };
