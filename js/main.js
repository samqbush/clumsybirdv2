// Vite entry module. melonJS v4 is loaded as a side-effecting global
// (`me`, `onReady`) by the classic <script> tag in index.html *before* this
// module runs, so we reference `me`/`onReady` off the window.
//
// The modules below attach their members onto the shared `game` singleton in
// the same order the legacy Grunt concat used (game → entities → HUD →
// title → play → gameover). Import order is significant.
import { game } from './game.js';
import './entities/entities.js';
import './entities/HUD.js';
import './screens/title.js';
import './screens/play.js';
import './screens/gameover.js';

// Publish the debug/test seam the Phase 0 Playwright net observes
// (tests/e2e/helpers.js waits for window.game). ES module scope does not leak
// to window, so this is required to keep the safety net working.
window.game = game;

window.onReady(function onReady() {
  game.onload();
});
