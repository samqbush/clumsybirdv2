# Clumsy Bird — Architecture (Audited Current State)

> Audited evidence base for `MODERNIZATION_PLAN.md`. Every claim cites a file (and
> line where useful). Facts marked **[verified]** were confirmed by running the
> command/probe during the feasibility spike (2026-07-06, Node v25.8.2, npm 11.11.1,
> Chromium via playwright-cli).

## 1. Overview

Clumsy Bird is a single-page, **client-side HTML5 canvas game** — a Flappy Bird
clone built on the **melonJS** game engine. It has no backend, no database, and no
server-side logic. The entire app is static assets (`index.html` + JS + images +
audio) served by any static file server. Total first-party game code is ~600 LOC
of vanilla ES5 JavaScript (`js/game.js`, `js/entities/*.js`, `js/screens/*.js`).

## 2. Tech Stack Inventory

| Concern | Current | Version | Status |
|---|---|---|---|
| Game engine | melonJS (vendored minified file, not npm) | **v4.0.0** (2016) — `js/melonJS-min.js:2` | 13 majors behind current **17.4.0**; engine went ESM-only "melonJS 2" at v10 |
| Language / modules | Vanilla ES5, global `game` + `me` namespaces, `<script>` concatenation | ES5 | No module system |
| Build tool | Grunt + `grunt-contrib-uglify` (minify), `-jshint`, `-clean`, `-connect` | grunt **0.4.5** (2013) | Abandoned; `npm install` reports **35 vulns (9 critical)** **[verified]** |
| Lint | JSHint via `.jshintrc` | grunt-contrib-jshint 0.8.0 | Superseded by ESLint |
| Tests | **None.** `grunt-contrib-nodeunit` declared in `package.json:36` but **zero test files exist** | — | No coverage, never had any |
| Dev server | `grunt connect` (port 8001, `Gruntfile.js:46`) | grunt-contrib-connect 0.7.1 | Works but tied to Grunt |
| Runtime pin | `engines.node: ">= 0.8.0"` (`package.json`) | Node 0.8 | Ancient; builds fine on Node 25 **[verified]** |
| Deploy (Heroku) | `Procfile`: `python -m SimpleHTTPServer $PORT` | Python 2 | **DEAD** — Python 2 EOL; `SimpleHTTPServer` removed in Python 3 (now `python3 -m http.server`) |
| Deploy (primary) | GitHub Pages `gh-pages` branch (`README.md`, `app.json`) | — | Live at ellisonleao.github.io/clumsy-bird |
| Persistence | `me.save` (melonJS localStorage wrapper) storing `topSteps` hi-score | localStorage | `js/screens/gameover.js:13-17,71` — the *only* stateful data |

## 3. Feature / Domain Map

The game is a small melonJS state machine (`js/game.js:44-46`) with three screens
and a handful of entities:

- **Bootstrap** — `js/game.js`: `game.resources` (12 images + 4 audio), `onload`
  (`me.video.init(900,600)`, `me.audio.init`, preload), `loaded` (registers screens
  into `me.state`, binds SPACE/M/pointer, registers entities into `me.pool`).
- **Screens** (`js/screens/`): `TitleScreen` (`title.js`), `PlayScreen` (`play.js`),
  `GameOverScreen` (`gameover.js`) — each an `me.ScreenObject.extend` with
  `onResetEvent`/`onDestroyEvent` lifecycle.
- **Entities** (`js/entities/entities.js`): `BirdEntity` (gravity + tween flap +
  rotation + collision → end animation), `PipeEntity`, `PipeGenerator`
  (`me.Renderable` spawner), `HitEntity` (invisible score trigger), `Ground`
  (scrolling floor).
- **HUD** (`js/entities/HUD.js`): `HUD.Container` + `ScoreItem` (`me.Font`),
  `BackgroundLayer` (`me.ImageLayer` + mute toggle).
- **Assets** (`data/`): `img/`, `sfx/`, `bgm/`, and a custom bitmap font
  (`data/css/gamefont.*`).

All rendering, physics, input, audio, and collision go through the melonJS `me.*`
global API — the single most important coupling in the codebase.

## 4. Deployment & Infrastructure

- **Primary:** static hosting on the `gh-pages` branch (GitHub Pages).
- **Heroku:** one-button deploy (`app.json`, `README.md` deploy button) via
  `Procfile` running a Python 2 static server — **non-functional on any current
  Python**.
- **Build artifact `build/clumsy-min.js` is committed to source** and referenced
  directly by `index.html:41` (alongside vendored `js/melonJS-min.js:40`). Grunt
  regenerates it from `Gruntfile.js:9-16` source list.

## 5. Commands & Verification Inventory

| Action | Command | Status |
|---|---|---|
| Install deps | `npm install` | **[verified]** — 430 pkgs, 35 vulns (9 critical) |
| Build (minify) | `grunt default` (needs `grunt-cli`; runs `uglify:dist` → `build/clumsy-min.js`) | **[verified]** green on Node 25 |
| Lint | `grunt jshint:beforeConcat` | **[verified]** runs, but **fails**: `.jshintrc` doesn't declare `me`/`game` globals |
| Lint (broken task) | `grunt lint` | **Broken** — references `concat` task never loaded via `grunt.loadNpmTasks` (`Gruntfile.js:63-67`) |
| Serve (dev) | `grunt connect` (port 8001) | Works |
| Serve (Heroku/Procfile) | `python -m SimpleHTTPServer $PORT` | **DEAD** (Python 2) |
| Tests | — | **None exist** |
| Smoke (manual) | serve statically + open in browser | **[verified]** boots on Chromium with **0 console errors**, 15 warnings (melonJS v4 uses deprecated canvas `textAlign:'middle'`), title screen renders correctly |

## 6. Known Pain Points

1. **Vendored melonJS v4.0.0** — 13 majors behind; the engine went ESM-only at v10.
   Upgrading is a full API rewrite (Jay `.extend` → ES6 classes, globals removed).
2. **Dead build toolchain** — Grunt 0.4.x, 9 critical vulns; unmaintained.
3. **Zero automated tests** — no regression safety net of any kind.
4. **Global namespaces + `<script>` concat** — no module system; blocks modern
   bundlers and melonJS 17 (ESM).
5. **Broken `grunt lint` task** and misconfigured JSHint globals.
6. **Dead Heroku deploy path** (Python 2).
7. **Committed build artifact** (`build/clumsy-min.js`) drifts from source.

> **Crucial nuance:** despite the dead *tooling*, the **shipped game is fully
> alive** — it builds on Node 25 and boots error-free on modern Chromium. This is
> the "lucky" freeze-then-lift case, not a corpse. See the modernization plan's
> feasibility spike.
