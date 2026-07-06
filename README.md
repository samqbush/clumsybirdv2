Clumsy Bird
===========

A MelonJS made "Flappy Bird" clone.

![](http://i.imgur.com/Slbvt65.png)

Play online at https://samqbush.github.io/clumsybirdv2/

## Running Locally

- Install [Node 20+](http://nodejs.org/download/) (see `.nvmrc`)
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

## Making your customization

See [CUSTOMIZING](https://github.com/ellisonleao/clumsy-bird/blob/master/CUSTOMIZING.md)

## Some nice games made with this project

[Checkout here](https://github.com/ellisonleao/clumsy-bird/wiki/Games-using-clumsy-bird-code)

Some thoughts about this code you can find on [my blog post](https://medium.com/@ellisonleao/clumsy-bird-an-open-source-flappy-bird-clone-cf615724730f)
