// Vite entry module. melonJS is now an npm ESM package imported via ./melon.js
// (which also publishes window.me for the Phase 0 test seam). Import order still
// matters: each module attaches its members onto the shared `game` singleton in
// the same order the legacy build used (game -> entities -> HUD -> title -> play
// -> gameover).
import { me } from './melon.js';
import '../index.css';
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

// v19: the v4 global `onReady` is gone; boot once the device is ready.
me.device.onReady(function onReady() {
  game.onload();
});
