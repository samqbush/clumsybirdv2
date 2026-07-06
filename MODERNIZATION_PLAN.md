# Clumsy Bird — Modernization Plan

> Forward-looking action set. Current-state evidence lives in `ARCHITECTURE.md`
> (cited, not restated here). Feasibility spike run 2026-07-06 on Node v25.8.2,
> npm 11.11.1, Chromium (playwright-cli).

## 1. Executive Summary

Clumsy Bird is a ~600-LOC client-side HTML5 canvas game on a **vendored, 13-major-
behind melonJS v4.0.0** engine, built by an **abandoned Grunt 0.4.x toolchain**
(9 critical vulns), with **zero automated tests** and a **dead Python-2 Heroku
deploy path**. The pivotal finding: **the shipped game is fully alive** — it builds
on Node 25 and boots error-free on modern Chromium. This is the *lucky* freeze-then-
lift case. The plan therefore: (Phase 0) throws a **Playwright behavioral safety
net** over the running game and stands up CI while changing nothing; then, under
that net, (Phase 1) swaps Grunt→Vite + JSHint→ESLint + globals→ES modules, (Phase 2)
performs the high-risk **melonJS v4→v17 API rewrite**, and (Phase 3) modernizes
deployment. Scope is deliberately conservative — the game design, assets, and
mechanics are kept exactly as-is; only the platform underneath is modernized.

## 2. Current State Assessment

See `ARCHITECTURE.md` §2–§6. Headlines: melonJS v4.0.0 vendored (`js/melonJS-min.js`);
Grunt 0.4.5 build **[verified green on Node 25]**; no tests; `me.save` localStorage
`topSteps` hi-score is the only persisted data (`js/screens/gameover.js:13-17`);
Heroku `Procfile` Python-2 server is dead; primary deploy is GitHub Pages (`gh-pages`).

## 3. Feasibility Spike Result & Strategy

**Time-boxed spike (≈1 session).** Probed install / build / boot / test, per the
single deployable unit (this app is one client-side bundle; concerns split by tool).

| Probe | Result |
|---|---|
| `npm install` from `package.json` (no lockfile) | ✅ **[verified]** 430 pkgs, no hand-patching; 35 vulns (9 critical) |
| Build `grunt default` (uglify) on Node 25 | ✅ **[verified]** `build/clumsy-min.js` produced, no errors |
| Lint `grunt jshint` | ⚠️ runs but fails on undeclared `me`/`game` globals (config bug, not toolchain death); `grunt lint` task itself broken (`Gruntfile.js:63`) |
| Boot in modern browser (static serve + Chromium) | ✅ **[verified]** **0 console errors**, 15 warnings (deprecated `textAlign:'middle'`), title screen renders pixel-correct |
| Test runner executes ≥1 meaningful test | ❌ **no test suite exists** (never did) |

### Per-component strategy, testability & safety rung

There is effectively **one component**. Its defining trait: it **runs**, but has
**no tests**. So "testable" is not blocked by a dead toolchain — it's blocked only
by the *absence* of a harness, which we can add cheaply against the living game.

- **Migration strategy: (A) Freeze-then-lift.** The app is resurrectable at ~zero
  cost (it already runs). Net it first, then upgrade under the net. Strategy B
  (beachhead) is unnecessary — there is no corpse.
- **Testability Milestone: Phase 0.** The game crosses all four testability
  conditions (supported runtime ✅, deps from lockfile — *added* in Phase 0 ✅,
  build on current toolchain ✅, **≥1 meaningful test green in CI** — *added* in
  Phase 0) at the **end of Phase 0**. Every phase is therefore **post-testability
  ("lit")** from Phase 1 onward; Phase 0 itself is the transition and exits on the
  safety-net rung it establishes.
- **Oracle (net the seams, not units):** the **running game is the oracle**. The
  durable seams are its *externally observable behaviors*: boots with 0 console
  errors, title→play→gameover state flow, score (`steps`) increments on pipe pass,
  collision ends the run, hi-score persists in localStorage. These are pinned as
  **Playwright e2e assertions + a golden-master screenshot** — captured **[verified]**
  during the spike. Unit tests on melonJS-coupled entity code would be deleted at
  the v17 rewrite; the behavioral seams survive it. This is a **self/running-oracle
  golden master**: correct because we watched it run correctly.
- **Target safety rung: L4** (green lint + e2e/smoke in CI), reachable by end of
  Phase 0 because the app runs. No downgrade required. **Residual risk (named):**
  the golden master pins *self-consistency* of later refactors, not absolute visual
  correctness of physics timing; audio and exact tween timing are asserted only
  loosely (see §8). Human play-test blesses each phase's parity.

### CI Milestone

**CI is stood up in Phase 0** (the first lit phase / Testability Milestone) —
`.github/workflows/ci.yml` running lint + build + Playwright e2e on Node 20.
**Enforcing** that workflow as a **required status check / branch-protection rule**
on `main` is a **manual human step the agent cannot perform** — see §9. Until a
human enables it, CI *runs* on PRs but does **not** block merges.

### Residual-risk register (rungs below L4 / named risks)

| Item | Risk | Closes / mitigated by |
|---|---|---|
| Golden-master is self-frozen | Pins consistency, not first-boot correctness | Human play-test at each phase; captured against known-good v4 build |
| Tween/physics timing not asserted exactly | A subtly different feel could pass e2e | Phase 2 parity play-test + frame-sampled screenshots |
| Audio playback not e2e-asserted | Muted/broken audio could pass | Manual smoke item in each phase checklist |
| 35 npm vulns in legacy toolchain | Exposure while Grunt remains | ✅ **Closed in Phase 1** — Grunt removed; `npm audit` reports **0 vulnerabilities** |
| `me.Entity` deprecation (Phase 2) | 4 entities still extend the deprecated `me.Entity`, emitting one one-time `console.warn` (not an error) | ✅ **Closed in Phase 4** — `BirdEntity`/`PipeEntity`/`HitEntity`/`Ground` migrated to `me.Sprite` + manually-attached `me.Body`; boot into PLAY (all 4 entity types constructed) verified **0 deprecation warnings / 0 console errors**; 5 e2e behavioral specs green (incl. real bird↔ground quadtree collision) |
| Golden master re-baselined at v19 (Phase 2) | New snapshot pins v19 rendering, not v4 | Justified: a 15-major engine upgrade changes the renderer; re-captured in the CI container and reviewed; behavior tests independently green |
| Pages sub-path breaks asset loading (Phase 3) | Relative `base: './'` + `public/` fonts could 404 under `/clumsybirdv2/` | ✅ **Closed in Phase 3** — fonts moved into the Vite asset graph (rebased relative), CSS de-inlined, and an automated sub-path smoke (`test:e2e:subpath`) asserts 0 failed requests + font load + trailing-slash redirect against the built bundle |

## 4. Target Architecture

**Pattern:** stays a **static client-side single-bundle SPA** — correct for a
canvas game; no server/services/DB introduced. Only the *platform* modernizes.

**Recommended stack:** **Vite** (dev server + ESM build) · **melonJS 17.x** (npm,
ESM) · **ES modules** (replace globals) · **ESLint (+ Prettier)** · **Vitest**
(unit, where logic is decoupled) + **Playwright** (e2e/smoke — the primary net) ·
**Node 20 LTS** · **GitHub Pages via GitHub Actions** (replace dead Heroku path).

**What stays vs. goes** (decision framework — least disruptive that solves it):

| Component | Decision | Rationale |
|---|---|---|
| Game design, assets (`data/`), mechanics | ✅ Keep as-is | Work perfectly; zero maintenance burden. Don't gold-plate. |
| Node runtime `>=0.8.0` | ⬆️ Upgrade | Pin Node 20 LTS (`engines`, CI, `.nvmrc`) |
| Grunt 0.4.x build | 🔀 Swap → **Vite** | Grunt abandoned + 9 critical vulns; Vite gives ESM build + dev server melonJS 17 needs |
| JSHint | 🔀 Swap → **ESLint** | JSHint superseded; fixes broken lint task + globals config |
| `<script>` concat + global `game`/`me` | 🔄 Wrap/adapt → **ES modules** | Required by melonJS 17 (ESM) and Vite |
| melonJS **v4.0.0** vendored min | ⬆️ Upgrade in place → **melonjs@17 (npm)** | Same engine, actively maintained; concepts map 1:1. **Requires code rewrite of glue (H2)** — justified: no viable in-place path, engine went ESM at v10 |
| Tests (none) | 🔁 Add → **Playwright + Vitest** | New capability = the safety net |
| `Procfile` Python-2 Heroku server | 🗑️ Remove / 🔀 replace | Dead runtime; GitHub Pages + Actions is the real deploy |
| Committed `build/clumsy-min.js` | 🗑️ Remove from source | Build output; generate in CI |
| `js/melonJS-min.js` vendored | 🗑️ Remove | Replaced by npm dependency (Phase 2) |

### ADR: Freeze-then-lift with a Playwright behavioral net (not unit characterization)
- **Context:** The app runs but has zero tests; entity code is tightly coupled to
  the melonJS global that Phase 2 replaces.
- **Decision:** Strategy A. Build the safety net at the **behavioral seams**
  (Playwright e2e + golden master), not as unit tests on melonJS-coupled code.
- **Alternatives considered:** Unit characterization of `BirdEntity` physics —
  rejected: tests get deleted at the v17 rewrite, high effort, low durable value.
  Strategy B beachhead rewrite — rejected: there is no corpse to bypass.
- **Consequences:** Net survives the engine swap; residual risk is timing/audio
  fidelity, mitigated by human play-test (§3 register).

### ADR: Upgrade melonJS v4 → v17 rather than re-engine (Phaser) or freeze
- **Context:** v4 is 13 majors behind and ESM-only since v10; it still runs today.
- **Decision:** Upgrade in place to melonjs@17 via npm (decision-framework level 1),
  accepting the mechanical API rewrite (H2) as its own phase under the net.
- **Alternatives considered:** Re-engine on Phaser — rejected: full rewrite, no
  benefit for a Flappy clone, throws away working assets/logic mapping. Freeze on
  v4 forever — rejected: unmaintained, blocks tooling modernization and ESM.
- **Consequences:** One concentrated high-risk phase (Phase 2); mitigated by the
  Phase 0 net and golden-master parity.

### ADR: Vite + GitHub Pages Actions (retire Grunt + Heroku)
- **Context:** Grunt is abandoned (9 critical vulns); Heroku Procfile is dead.
- **Decision:** Vite for build/dev; GitHub Actions deploy to Pages.
- **Alternatives considered:** esbuild-only (less batteries-included), keep Grunt
  (unmaintained). Both rejected.
- **Consequences:** Modern DX + CI-generated artifact; `Procfile`/`app.json`
  removed or updated.

## 5. Per-Feature Migration Analysis

The whole app migrates together per phase (single bundle), so analysis is per
**concern**. Testability: all reach L4 by their phase; Milestone = Phase 0.

| Concern | Current (ref) | Strategy / tactic | Effort | Key risk |
|---|---|---|---|---|
| Bootstrap / state machine | `js/game.js` | Incremental refactor → ESM (P1), melonJS 17 API (P2) | M | `me.video.init`→`Application`/`me.game` API change |
| Screens (title/play/gameover) | `js/screens/*.js` | Strangler per screen: `me.ScreenObject`→`me.Stage`, `me.Font`→`me.Text` (P2) | M | Lifecycle + font API rename |
| Entities (bird/pipe/hit/ground) | `js/entities/entities.js` | `me.Entity.extend`→ES6 `class extends` (P2) | L | Physics/tween/collision API deltas — highest-risk file |
| HUD / layers | `js/entities/HUD.js` | Same class rewrite; `me.Font`→`me.Text`, `me.ImageLayer` settings (P2) | S | Text rendering parity |
| Persistence (hi-score) | `me.save.topSteps` `gameover.js:13-17` | Preserve localStorage key across v17 (P2) | XS | Key/format drift → hi-score reset (H5) |
| Build/lint | `Gruntfile.js` / `.jshintrc` | Swap → Vite + ESLint (P1) | M | Bundling globals→ESM |
| Deploy | `Procfile`/`app.json`/`gh-pages` | Replace → Pages Actions (P3) | S | Base-path/asset URLs on Pages |

**Acceptance criteria (all phases), expressed against the oracle, not a not-yet-
existing suite:** game boots with **0 console errors**; title→play→gameover flow
works; `steps` increments on pipe pass; collision ends the run; hi-score persists;
golden-master screenshot matches within tolerance; manual play-test feels identical.

## 6. Phased Implementation Plan

**Regime-aware phase gate (applies to every phase):** a phase is complete only when
its Verification & Exit Criteria are **executed and recorded**, and you do **not**
advance until they pass. Phase 0 exits on its established safety-net rung; Phases
1–3 are **lit** and exit on **green CI on the phase PR**. Report any phase whose
pass/fail is unknown rather than assuming it passed. Branch per phase off `main`;
merge to `main` before the next phase (H7).

---

### Phase 0: Safety Net & Baseline (T-shirt: M) — **Testability & CI Milestone**

**Goal:** Throw a behavioral net over the *running* game and stand up CI — changing
zero game behavior.
**Regime:** transition → establishes **lit**. **Safety rung:** L4 (target), min L3.
**Prerequisites:** none.
**Duration:** 1–2 sprints.

#### Tasks
| ID | Task | Component | Blocked by |
|----|------|-----------|------------|
| 0.1 | Commit a `package-lock.json` (run `npm install`, commit lockfile) — reproducible baseline | build | — |
| 0.2 | Add Playwright; write e2e net: boots with **0 console errors**; title screen golden-master screenshot; SPACE starts play; `steps` increments after a scripted flap sequence; forced collision → GAME_OVER; hi-score persists in localStorage | tests | 0.1 |
| 0.3 | Add a **temporary** dev-serve script that is not Grunt-only (`npx http-server` / `python3 -m http.server`) so e2e runs in CI without the legacy dev server | tests | — |
| 0.4 | Author `.github/workflows/ci.yml`: install → `grunt default` (build) → serve → Playwright e2e, on **Node 20** | CI | 0.2,0.3 |
| 0.5 | **Prove the net has teeth:** mutate one value (e.g. flip score increment / break collision), confirm e2e goes **red**, revert | tests | 0.2 |
| 0.6 | Record known-good baseline in `MODERNIZATION_PLAN.md` (versions, build/boot evidence, golden image path) | docs | 0.4 |

#### Risks & Mitigations
- **Risk:** melonJS canvas is opaque to DOM assertions → **Mitigation:** assert via
  `me`/`game` globals in `page.evaluate` (e.g. `game.data.steps`, `me.state`) +
  pixel golden master, not DOM text.
- **Risk:** audio autoplay blocks headless boot → **Mitigation:** launch Chromium
  with autoplay allowed; assert boot/render, treat audio as manual smoke item.

#### Decisions made
- Net is **behavioral/e2e**, not unit (ADR §4). Unit tests **deferred** to post-P2
  where logic decouples — not dropped.
- Build tool stays **Grunt** this phase (purely additive; swap is Phase 1).
- Golden master committed as a repo fixture; tolerance set to absorb font
  antialiasing. Hi-score/localStorage assertion included.
- **H1** grepped: dead-artifact removal is *not* in this phase (additive only) —
  cleared. **H3** CI runner pinned Node 20 (matches future run-runtime) — cleared.
  **H6** no insecure shim introduced — cleared. **H7** branch off `main`
  (**corrected**: actual trunk is `main`, one commit ahead of `master` and the only
  branch holding this plan — see §9) — cleared. **H8** baseline recorded in plan —
  n/a topology unchanged.

#### Verification & Exit Criteria (Definition of Done) — ✅ MET 2026-07-06
- [x] `npm ci` installs from committed lockfile **[runnable]** — verified Node 20
      Linux (Docker) and locally.
- [x] `grunt default` builds green on Node 20 **[runnable]** — required adding
      `grunt-cli` devDep (binary was absent); output `build/clumsy-min.js` is
      **byte-identical** to the committed artifact (md5 `b70aa635…`), proving the
      freeze held.
- [x] Playwright e2e green: 0 console errors + state-flow + score + collision +
      hi-score assertions pass **[green CI]** — 6/6 in the Playwright Linux
      container; behavioral 4/4 stable across 6× repeat locally.
- [x] Golden-master screenshot committed and matched — Linux fixture
      `tests/e2e/smoke.spec.js-snapshots/title-screen-chromium-linux.png`, clipped
      to the static region above the scrolling ground; captured in the same
      container CI runs in.
- [x] Net proven to fail (0.5 recorded): score `steps++` disabled → score test
      **red**; `collided = true` → `false` → collision test **red**; both reverted,
      full suite green again.
- [x] **No game behavior, dependency, or logic changed** — purely additive
      (`js/` untouched; only new dev deps, scripts, tests, CI, lockfile).
- [ ] CI workflow runs on the PR. *(Making it a **required check** is a manual
      human step — see §9; not a done task here.)*

**Baseline recorded (known-good):** Node 20.20.2 (CI) / built + validated on Node
25.8.2 locally; npm 11.x; `@playwright/test` 1.61.1 (Chromium), pinned exact; CI in
`mcr.microsoft.com/playwright:v1.61.1-noble`. Build artifact md5
`b70aa635d97923d76c2ea94002708e94`. Golden image:
`tests/e2e/smoke.spec.js-snapshots/title-screen-chromium-linux.png`.

---

### Phase 1: Toolchain Modernization — Vite + ESLint + ES Modules (T-shirt: M)

**Goal:** Replace the dead Grunt/JSHint toolchain and move first-party code to ES
modules — **still on melonJS v4**, behavior identical.
**Regime:** **lit.** **Safety rung:** L4.
**Prerequisites:** Phase 0 merged to `main`.
**Duration:** 2–3 sprints.

#### Tasks
| ID | Task | Component | Blocked by |
|----|------|-----------|------------|
| 1.1 | Add Vite; convert `js/*.js` from globals + `<script>` concat to ES modules (export/import). Keep melonJS v4 loaded as a side-effecting global that our modules reference (no engine change yet) | src/build | — |
| 1.2 | Replace `index.html` script tags: single Vite entry module; drop hand-referenced `build/clumsy-min.js` | build | 1.1 |
| 1.3 | Swap JSHint→ESLint (+ Prettier); fix the `me`/`game` globals config; delete `Gruntfile.js`, `.jshintrc`, Grunt devDeps | lint/build | 1.1 |
| 1.4 | Remove committed `build/clumsy-min.js`; Vite emits build output to a git-ignored `dist/` | build | 1.2 |
| 1.5 | Bump `engines.node` → `>=20`; add `.nvmrc`=20; update CI (`ci.yml`) to `vite build` + `eslint` + Playwright (drop `grunt default`) | build/CI | 1.3,1.4 |
| 1.6 | Update `README.md` run instructions (Grunt → Vite) and any command tables (H8) | docs | 1.5 |

#### Risks & Mitigations
- **Risk (H2):** globals→ESM can break load order / `this` binding →
  **Mitigation:** incremental module conversion, e2e net green after each.
- **Risk (H3):** CI/runtime drift → **Mitigation:** 1.5 moves `engines`, `.nvmrc`,
  CI runner together with the build swap in the same phase.
- **Risk:** Vite serving of melonJS v4 UMD global → **Mitigation:** load v4 via a
  static `<script>`/`?url` import or `vite-plugin` shim; verified by e2e boot.

#### Decisions made
- **melonJS stays v4 this phase** — decouples the tooling swap from the engine
  rewrite so a regression is unambiguously attributable. Engine upgrade = Phase 2.
- Build artifact **removed from source** (was `index.html:41`); `dist/` git-ignored.
- **H1** grepped `grunt`/`clumsy-min`/`.jshintrc` refs (`Gruntfile.js`,
  `index.html:41`, `package.json` devDeps) — **full removal set enumerated above**;
  post-cutover build target = `vite build`. **H2** codemod = manual globals→ESM
  (tree is tiny; no jscodeshift needed) + JSHint→ESLint config; test engine already
  Playwright from P0 — cleared. **H3** runtime pins moved in lockstep (1.5).
  **H6** none. **H7** off `main`, P0 merged first. **H8** README/commands updated
  (1.6).

#### Verification & Exit Criteria — ✅ MET 2026-07-06 (pending CI confirmation on PR)
- [x] `vite build` green; `dist/` produced **[verified]** — Vite 6.4.3, 9 modules
      transformed, `dist/assets/index-*.js` + copied `dist/data/**` +
      `dist/vendor/melonjs-min.js`.
- [x] `eslint .` green (globals resolved) **[verified]** — 0 errors (11 benign
      `no-unused-vars` warnings on self-starting tweens / unused callback params).
- [x] `prettier --check .` green **[verified]** — first-party code formatted; prose
      docs `.prettierignore`d to avoid table reflow.
- [x] Playwright e2e green against the **built bundle** (`vite preview`) — 5/5
      behavioral (0 console errors incl. no asset 404s, MENU→PLAY, score++,
      collision→GAME_OVER, hi-score localStorage round-trip). Golden master is a
      Linux-only fixture, **skipped on macOS / enforced on CI**. Asset serving
      confirmed by curl: `/`, `/vendor/melonjs-min.js`, `/data/css/gamefont.woff`,
      `/data/img/{bg,logo}.png`, `/data/bgm/theme.ogg` all **200**.
- [x] No `grunt`/`jshint` refs remain in code/config (`grep` clean); `Gruntfile.js`,
      `.jshintrc`, `build/clumsy-min.js` removed. **0 npm vulnerabilities** (Grunt's
      35 closed). Remaining textual mentions are historical prose in plan/architecture
      docs + explanatory code comments only.
- [x] README run instructions + `.github/copilot-instructions.md` command table
      updated in the same PR (H8).
- [ ] Green CI on the Phase 1 PR — authoritative signal (golden master runs Linux).

**Implementation notes (as-built):**
- melonJS v4 kept as a classic `<script src="/vendor/melonjs-min.js">` *before* the
  deferred Vite entry module (`js/main.js`) — `me`/`onReady` remain window globals.
- `game` is now an ESM singleton (`js/game.js` `export const game`); modules import
  and attach onto it in the legacy concat order via `js/main.js`. `js/main.js`
  re-publishes `window.game` so the Phase 0 net keeps observing it.
- The shared `BackgroundLayer` (was a concat-scoped `var` in `HUD.js`) is now
  `game.BackgroundLayer` — the one real concat→ESM scoping hazard, fixed.
- Runtime-referenced assets moved to `public/data/**` (+ vendored engine to
  `public/vendor/`) so Vite copies them verbatim to `dist/`; CSS `@font-face` +
  favicon paths switched to root-absolute `/data/...`. `base` left default `/`
  (Pages base path deferred to Phase 3).
- `"type": "module"` added → Playwright config + e2e specs converted to ESM.

---

### Phase 2: melonJS v4 → v19 Upgrade (T-shirt: L) — the risk phase — ⏳ IN REVIEW (pending human parity play-test + merge)

**Goal:** Replace vendored melonJS v4 with npm melonjs@19 and rewrite the API glue,
preserving identical observable behavior.
**Regime:** **lit.** **Safety rung:** L4 (net from P0 + parity play-test).
**Prerequisites:** Phase 1 merged to `main`.
**Duration:** 3–5 sprints.

> **Version decision (updated):** the ADR said "latest major"; latest is now
> **19.8.0** (was 17.x when the plan was written). Confirmed with the user to target
> **`melonjs@19`**. The engine is imported once via `js/melon.js` (`import * as me
> from 'melonjs'`), which also publishes `window.me` for the Phase 0 test seam. All
> game modules import `me` from there so top-level class definitions resolve at
> module-eval time (making the cutover atomic-but-clean rather than file-by-file
> bootable, which was infeasible once the v4 global was removed).

#### Tasks
| ID | Task | Component | Blocked by |
|----|------|-----------|------------|
| 2.1 | Read melonJS Upgrade Guide; add `melonjs@17`; remove `js/melonJS-min.js`; import `import * as me from 'melonjs'` | engine | — |
| 2.2 | Bootstrap rewrite: `me.video.init(900,600,...)` → v17 `Application`/`me.game` init + `me.loader.preload` API deltas | `game.js` | 2.1 |
| 2.3 | Screens: `me.ScreenObject.extend`→`class extends me.Stage`; lifecycle `onResetEvent`/`onDestroyEvent` deltas; event subscribe API | `screens/*.js` | 2.2 |
| 2.4 | Entities: `me.Entity.extend`→ES6 `class`; migrate `this._super(...)`→`super(...)`; body/gravity/`me.Tween`/collision/`me.Rect` API deltas | `entities.js` | 2.2 |
| 2.5 | HUD/text: `me.Font`→`me.Text`; `me.ImageLayer` settings; fix deprecated `textAlign:'middle'` → `'middle'`→valid value (removes the 15 warnings) | `HUD.js` | 2.2 |
| 2.6 | **Persistence (H5):** preserve the `me.save.topSteps` localStorage key/format across v17; if key changes, add a one-time read-migration so existing players keep hi-scores | `gameover.js` | 2.3 |
| 2.7 | Update `engines`/deps; ensure CI + e2e run against the new bundle | build/CI | 2.4,2.5 |

#### Risks & Mitigations
- **Risk (H2 — the core hazard):** whole-API rewrite; subtle physics/tween/collision
  behavior drift → **Mitigation:** e2e net + golden master after each sub-task;
  human parity play-test; migrate one screen/entity at a time keeping the game
  bootable throughout.
- **Risk (H5):** hi-score data loss on `me.save` format change → **Mitigation:**
  2.6 explicit key preservation + read-migration; *decision:* a hi-score reset is
  acceptable-but-avoided (per-browser, ephemeral, zero server data).
- **Risk:** no automated codemod exists for melonJS v4→17 → **Mitigation:** manual,
  guided by the official Upgrade Guide; tree is ~600 LOC.

#### Decisions made
- Upgrade in place to **v17.x** (latest major), not an intermediate version — the
  glue is small and rewritten wholesale anyway.
- **Persistence:** *preserve* the localStorage key with a read-migration fallback
  (2.6) — **not dropped**.
- Deprecated `textAlign:'middle'` fixed as part of the text migration (closes the
  only console warnings).
- **H2** the whole phase *is* the codemod — each API family enumerated as its own
  task (bootstrap, stage, entity, text, save); test engine unaffected (Playwright).
  **H3** `engines`/CI already Node 20 from P1; melonjs is pure JS (no native/base-
  image pin) — cleared. **H5** addressed (2.6). **H1/H4/H6** n/a — no route classes,
  no security shim, removal set = just `js/melonJS-min.js` (grepped: referenced only
  `index.html`, now via ESM). **H7/H8** off `main`, docs updated.

#### Verification & Exit Criteria — ⏳ MOSTLY MET 2026-07-06 (golden master + e2e green; CI authoritative on PR) — **final gate pending: human parity play-test before merge**
- [x] App boots on melonjs@19 with **0 console errors** (v4 `textAlign` warnings gone).
      *One* residual: a single one-time `me.Entity` deprecation **warning** (not an
      error) — see residual register. Smoke test (errors-only gate) passes.
      **(Residual closed in Phase 4.)**
- [x] Playwright e2e green: MENU→PLAY→GAME_OVER flow + score + collision→game-over +
      hi-score persistence — **5/5 behavioral** locally; golden master green in the
      CI container (`playwright:v1.61.1-noble`).
- [x] Golden-master re-baselined at v19 (justified: 15-major renderer change) and
      green in the CI container. **⏳ Human parity play-test still required** before
      merge (physics/tween/audio feel) — the one gate an agent cannot run.
- [x] Hi-score localStorage round-trip across a full reload verified by e2e
      (`me.save.topSteps`); key/format preserved by v19 — no migration needed.
- [x] `public/vendor/melonjs-min.js` removed; no v4-only API (`_super`, `.extend(`,
      `Number.prototype`, `me.ScreenObject`, `me.Font`, `me.collision.check`) remains
      (grep-verified); `window.me`/`window.game` seams still published.

---

### Phase 3: Deployment Modernization (T-shirt: S) — ⏳ IN REVIEW (pending human live-URL check after first Pages deploy)

**Goal:** Retire the dead Python-2 Heroku path; deploy via GitHub Actions to Pages.
**Regime:** **lit.** **Safety rung:** L4.
**Prerequisites:** Phase 2 merged to `main`.
**Duration:** 1 sprint.

#### Tasks
| ID | Task | Component | Blocked by |
|----|------|-----------|------------|
| 3.1 | Add `.github/workflows/deploy.yml`: `vite build` → deploy `dist/` to GitHub Pages | deploy | — |
| 3.2 | Set Vite `base` to the Pages sub-path; verify asset URLs resolve | deploy | 3.1 |
| 3.3 | Remove/replace dead `Procfile` (Python 2) and the Heroku deploy button + `app.json` (or update to a working buildpack) | deploy | — |
| 3.4 | Update `README.md`/`CUSTOMIZING.md` deploy docs (H8) | docs | 3.1 |

#### Risks & Mitigations
- **Risk:** Pages base-path breaks asset loading → **Mitigation:** e2e smoke against
  the built `dist/` (not just dev server) before merge.

#### Decisions made
- Heroku path **removed** (dead), not repaired — no user relies on it; Pages is the
  real host. **Deferred vs dropped:** dropped, explicitly.
- **H3** deploy runtime = static Pages (no server runtime to pin). **H8** README +
  CUSTOMIZING updated same PR. **H1** grep `Procfile`/`app.json`/Heroku refs =
  removal set. **H5** the built asset deploy carries no stateful store.

#### Implementation notes (as built)
- **`vite.config.js`:** `base: './'` (relative — no hardcoded repo name) **plus
  `build.assetsInlineLimit: 0`**. Inlining had turned `index.css` into a base64
  `data:` URI whose `@font-face url('/data/css/gamefont.*')` stayed root-absolute
  and would 404 under the sub-path; disabling inlining emits a real `assets/*.css`.
- **Font moved into the Vite asset graph:** `public/data/css/gamefont.*` →
  `fonts/gamefont.*`, referenced from `index.css` as `./fonts/gamefont.*`, and
  `index.css` is now imported from `js/main.js` (the `<link>` in `index.html` was
  removed). Vite only rebases `url()` for graph assets, not `public/` files, so
  this is what makes the fingerprinted font resolve relative under Pages.
- **Sub-path smoke:** `playwright.subpath.config.js` + `tests/subpath/` serve the
  built `dist/` under `/clumsybirdv2/` via a zero-dep static server
  (`tests/subpath/serve.mjs`) and assert boot with **0 failed asset requests /
  non-2xx / console errors**, the **gamefont loads**, and the **trailing-slash
  redirect**. Run with `npm run test:e2e:subpath`. This is the gate the root-served
  net cannot provide.
- **`deploy.yml`:** push to `main` + `workflow_dispatch`; `build` job (Playwright
  container, Node 24) runs `test:e2e` then `test:e2e:subpath`, then
  `upload-pages-artifact` (`dist/`); `deploy` job (ubuntu-latest) runs
  `deploy-pages`. Enabling Pages (Settings → Pages → Source: GitHub Actions) is the
  one remaining manual human step.

#### Verification & Exit Criteria
- [x] e2e smoke green against the **built** bundle at the Pages base path
  (`test:e2e:subpath` — 3/3; root `test:e2e` — 5/5).
- [x] `Procfile` + `app.json` + Heroku button removed; README reflects Pages/Vite.
- [ ] `deploy.yml` publishes `dist/` to Pages; live URL loads with 0 console errors
  (**manual** — verify after enabling Pages + first deploy).

---

### Phase 4: Retire deprecated `me.Entity` → `me.Sprite` + `me.Body` (T-shirt: S) — ✅ CODE COMPLETE 2026-07-06 (pending green CI on PR + human parity play-test)

**Goal:** Close the Phase 2 residual — migrate the 4 entities off the deprecated
`me.Entity` to the supported `me.Sprite` + manually-attached `me.Body` pattern,
eliminating the one-time boot deprecation `console.warn`.
**Regime:** **lit.** **Safety rung:** L4. **Prerequisites:** Phase 3 merged to `main`.

#### Tasks (as built)
| ID | Task | Status |
|----|------|--------|
| 4.1 | `BirdEntity` → `me.Sprite`+`me.Body` (spike-first: custom ellipse shape, animations, transforms, tweens, `onCollision`) | ✅ |
| 4.2 | `PipeEntity`, `HitEntity`, `Ground` → `me.Sprite`+`me.Body` | ✅ |
| 4.3 | Fix external `pipe1.renderable.currentTransform` → `pipe1.currentTransform` in `PipeGenerator` | ✅ |
| 4.4 | Update `entities.js` header comment to the Sprite+Body pattern | ✅ |

#### Implementation notes (as built)
- The Sprite **is** the renderable, so `this.renderable.*` (animations,
  `currentTransform`, `alpha`, `width`) became `this.*`. Bodies are built **in the
  constructor before `me.game.world.addChild`** (which registers the body in the
  collision quadtree — verified via the real bird↔ground collision e2e).
- **No `this.body.update(dt)`** added: manual movement + `updateBounds()` +
  `super.update(dt)` only (per review — the world adapter drives bodies).
- **`framewidth`/`frameheight` set explicitly** (Sprite does not default them from
  `width`/`height` the way `me.Entity` did) so the bird spritesheet frames animate.
- **Anchor untouched** (Sprite default `{0.5,0.5}` reproduces Entity's rendered
  center); collision shapes copied verbatim (bird `me.Ellipse(5,5,71,51)`, hit
  `me.Rect(0,0,w-30,h-30)`). No command/topology change ⇒ README/CUSTOMIZING/
  copilot-instructions command table untouched (H8 n/a).

#### Verification & Exit Criteria
- [x] `eslint .` ✅ 0 errors, `prettier --check .` ✅, `vite build` ✅.
- [x] `playwright test` ✅ **5/5 behavioral** (incl. real bird↔ground quadtree
  collision → GAME_OVER, and `onCollision` score path).
- [x] Boot into PLAY with all 4 entity types constructed: **0 `me.Entity`
  deprecation warnings, 0 console errors** (the point of the phase).
- [ ] Green CI on the Phase 4 PR — authoritative signal (golden master runs Linux).
- [ ] Human parity play-test (flap arc / gravity / collision vibrate / score / lose
  drop-tween feel) — **manual**.

---

**Future considerations (not scheduled):** Vitest unit tests for decoupled logic;
TypeScript adoption; asset optimization; PWA/offline. None block the modernization
and none are worth doing until a maintainer asks.

## 7. Execution Governance

- **Trunk is `main`** (confirmed: `origin/HEAD → main`; a stale `master` exists one
  commit behind — do not use it). No active default-branch split.
- **Branch per phase**, cut from `main`; open one PR per phase; **merge to
  `main` before starting the next phase — never stack** (H7). Verify
  `git log origin/main..HEAD` empty at branch creation.
- **Regime-aware gate:** Phases 1–3 (lit) advance on **green CI on the PR**; Phase 0
  advances on its established net + "net proven to fail" evidence.
- **CI Milestone = Phase 0.** Authoring `ci.yml` is done by the agent;
  **enforcing** it as a required status check is a **manual human step** (§9).
- **Interface-preserving & independently deployable:** each phase leaves the game
  bootable; rollback = redeploy previous. Behavior-preserving phases prove
  equivalence via the golden-master/e2e oracle.
- **Living plan:** update status markers (✅/⏭️/🗑️) and the residual-risk register
  as phases land; update `.github/copilot-instructions.md`, `README`, `CUSTOMIZING`
  in the **same PR** as any topology/command change (H8).
- **Red-team each phase against `references` H1–H8 before coding** — the cleared
  checklist is recorded in each phase's "Decisions made".

## 8. Migration Safety Net

- **Oracle & seam contracts:** the **running game** (self-frozen golden master +
  Playwright e2e) captured **[verified]** in Phase 0 is the behavioral reference.
  Seams pinned: 0-console-error boot; MENU→PLAY→GAME_OVER state flow; `steps`
  increment on pipe pass; collision→game-over; `me.save.topSteps` localStorage
  persistence; title-screen pixel golden master. New work is diffed against these
  every phase.
- **Feature flags:** not needed — phases are interface-preserving and independently
  deployable; the whole bundle swaps atomically per phase.
- **Data migration (H5):** the *only* persisted data is the `topSteps` hi-score in
  localStorage (`me.save`). Phase 2 **preserves the key** with a one-time
  read-migration; a reset is an accepted-but-avoided fallback (per-browser,
  ephemeral, no server data). No database, no volumes.
- **Rollback (per phase):** redeploy the previous phase's `main` commit / Pages
  build. Each phase is a discrete revertible PR.
- **Transitional-insecure-state register (H6):** **none.** No permit-all shims,
  CSRF toggles, open endpoints, or placeholder secrets are introduced — this is a
  static client-side game with no auth/network surface. The only interim change is
  a modern local static server replacing the dead Python-2 one (not a weakening).
- **Testing strategy:** primary net is **Playwright e2e** (built on the target
  stack, survives the v17 rewrite). Vitest unit tests are a post-Phase-2 future
  item once logic decouples from `me.*`. Nothing is quarantined.
- **Observability:** headless boot **console-error count must stay 0**; golden-
  master diff tolerance; per-phase manual play-test for physics/tween/audio feel
  (the parts e2e asserts only loosely).

## 9. Open Questions / Decisions Needed From Stakeholders

- **[MANUAL — agent cannot perform]** After Phase 0's `ci.yml` lands, a repo admin
  must make it an **enforced required status check / branch-protection rule** on
  `main` (**GitHub → Settings → Branches → Branch protection**). Until then CI
  *runs* on PRs but does **not** block merges.
- **[MANUAL — agent cannot perform]** Enable **GitHub Pages** in repo settings and
  grant the Actions workflow Pages deploy permission (Phase 3).
- **[DECISION NEEDED — product]** Keep or drop the Heroku one-button deploy? Plan
  assumes **drop** (dead Python-2 path, Pages is primary). Confirm no downstream
  fork/user depends on it.
- **[DECISION NEEDED — product]** Target **melonJS 17.x** (latest) vs. a
  conservative intermediate major? Plan assumes latest (glue rewritten wholesale).
  ✅ **RESOLVED (Phase 2):** targeted **`melonjs@19`** (current latest; 17.x was
  latest only when the plan was written). Confirmed with the user.
- **[DECISION NEEDED — scope]** Is per-browser hi-score preservation across the v17
  upgrade required, or is a reset acceptable? Plan assumes **preserve** (cheap
  read-migration).
  ✅ **RESOLVED (Phase 2):** `me.save.topSteps` key/format is unchanged in v19; the
  hi-score round-trips through localStorage (e2e-verified). No migration needed.
