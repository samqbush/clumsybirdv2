import { defineConfig } from 'vite';

// Phase 1: Vite replaces the Grunt build. melonJS v4 stays a vendored global
// loaded via a classic <script> from public/vendor (see index.html); it is NOT
// bundled here (engine swap to the npm ESM build is Phase 2).
//
// Runtime-referenced assets (images, audio, fonts) live under public/data and
// are copied verbatim to dist/, so game resource strings like
// "data/img/bg.png" and the CSS @font-face keep resolving unchanged.
//
// base is relative ('./') so the built bundle works under the GitHub Pages
// project sub-path (https://<user>.github.io/clumsybirdv2/) without hardcoding
// the repo name (Phase 3). Vite rewrites the root-absolute public refs in
// index.html (e.g. "/data/img/favicon.ico") to relative URLs at build; the
// @font-face lives in the Vite asset graph (index.css -> ./fonts/gamefont.*) so
// it is fingerprinted and rewritten relative too. melonJS runtime resource
// strings ("data/img/bg.png", "data/bgm/") are already relative and resolve
// against the document URL. This keeps dev, preview, e2e (served at '/') and
// Pages (served at a sub-path) all working from one config.
export default defineConfig({
  base: './',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Do not inline assets as base64 data: URIs. Inlining index.css turned its
    // @font-face url('/data/css/gamefont.*') refs into a data: URI where Vite
    // cannot rewrite them to the relative base, so the font 404s under the Pages
    // sub-path. Emitting a real assets/*.css file lets Vite rewrite those url()s
    // relative to './'.
    assetsInlineLimit: 0,
  },
});
