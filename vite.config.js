import { defineConfig } from 'vite';

// Phase 1: Vite replaces the Grunt build. melonJS v4 stays a vendored global
// loaded via a classic <script> from public/vendor (see index.html); it is NOT
// bundled here (engine swap to the npm ESM build is Phase 2).
//
// Runtime-referenced assets (images, audio, fonts) live under public/data and
// are copied verbatim to dist/, so game resource strings like
// "data/img/bg.png" and the CSS @font-face keep resolving unchanged.
//
// base stays default '/'; the GitHub Pages base path is a Phase 3 concern.
export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
