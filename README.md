Clumsy Bird
===========

A MelonJS made "Flappy Bird" clone.

![](http://i.imgur.com/Slbvt65.png)

**Play online at https://samqbush.github.io/clumsybirdv2/**

## How to Play

Guide the bird between the pipes for as long as you can. The bird constantly falls
— flap to stay airborne and thread each gap. Every pipe you clear adds to your
**Steps** count, and your best run (**Higher Step**) is saved in your browser
between sessions. Touch a pipe or the ground and the run is over.

**Controls**

| Action | Desktop | Touch |
|--------|---------|-------|
| Start the game | `Space` or left mouse click | Tap |
| Flap (fly up) | `Space` or left mouse click | Tap |
| Mute / unmute sound | `M` | — |
| Return to menu (after game over) | `Enter`, `Space`, or click | Tap |

## Running Locally

- Install [Node 24+](http://nodejs.org/download/) (see `.nvmrc`)
- Install the dependencies

```
npm install
```

Start the Vite dev server (hot reload):

```
npm run dev
```

Open your browser at the URL Vite prints (default `http://localhost:5173/`).

Other useful scripts:

```
npm run build      # production build to dist/
npm run preview    # serve the production build on http://127.0.0.1:4173/
npm run lint       # ESLint
npm run format     # Prettier check
npm run test:e2e   # Playwright end-to-end tests (built bundle, served at /)
npm run test:e2e:subpath  # Playwright smoke of the built bundle under the Pages sub-path
```

## Deployment

The game is a static bundle hosted on **GitHub Pages**. Every push to `main`
triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which
runs the Playwright end-to-end net and the sub-path smoke against the built
bundle, then publishes `dist/` to Pages via GitHub Actions. There is no server
runtime (the old Python-2 Heroku path has been removed).

`vite.config.js` sets `base: './'` so the build works under the Pages project
sub-path (`/clumsybirdv2/`) without hardcoding the repo name.

> One-time manual setup: repo **Settings → Pages → Source = GitHub Actions**.

## What We Modernized

This repo is a modernized fork of the original Clumsy Bird. The gameplay, art, and
assets are untouched — only the platform underneath was rebuilt so the game runs on
a current, maintained toolchain. Below is the current shipped stack; see
[`MODERNIZATION_PLAN.md`](MODERNIZATION_PLAN.md) for the full migration history and
rationale.

| Area | Before (original) | Now |
|------|-------------------|-----|
| Game engine | melonJS v4 (vendored min.js) | [melonJS 19](https://melonjs.org/) (npm, ESM) |
| Build tool | Grunt 0.4.x | [Vite](https://vitejs.dev/) 6 |
| Modules | Global `game` / `me` via `<script>` concat | ES modules |
| Lint / format | JSHint | ESLint 9 + Prettier |
| Tests / CI | none | Playwright end-to-end + GitHub Actions CI |
| Deploy | Python-2 Heroku path | GitHub Pages via GitHub Actions |
| Node | `>=0.8.0` | `>=24` (LTS) |

Highlights:

- **Zero known vulnerabilities** — the abandoned Grunt toolchain (and its critical
  advisories) is gone; `npm audit` reports clean.
- **A behavioral safety net** — Playwright asserts the game boots error-free and the
  title → play → game-over flow, scoring, collision, and high-score persistence all
  work, plus a golden-master screenshot, so refactors can't silently break the game.
- **Modern dev experience** — hot-reloading dev server, ESM, and a one-command
  production build, all wired into CI on every push and PR.

## Making your customization

See [CUSTOMIZING](https://github.com/ellisonleao/clumsy-bird/blob/master/CUSTOMIZING.md)

## Credits

Clumsy Bird was originally created by **[Ellison Leão](https://github.com/ellisonleao)**
— see the original project at https://github.com/ellisonleao/clumsy-bird. This
repository is a modernized fork; all game design and assets are his work. The
project remains under the MIT License (see [`LICENSE.md`](LICENSE.md)).

## Some nice games made with this project

[Checkout here](https://github.com/ellisonleao/clumsy-bird/wiki/Games-using-clumsy-bird-code)

Ellison Leão's original blog post about the project is on [Medium](https://medium.com/@ellisonleao/clumsy-bird-an-open-source-flappy-bird-clone-cf615724730f).
