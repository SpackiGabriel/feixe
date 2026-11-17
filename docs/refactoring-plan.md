# Feixe — Codebase Review & Refactoring Plan

> Review date 2026-11-17 (day before the defence). Planning document only —
> nothing here is implemented yet. Code remains authoritative for current
> state (see `CLAUDE.md`).

## Context

The owner defends Feixe tomorrow (2026-11-18) and wants a codebase they can
navigate, explain and defend. This review asks one question: *where does the
code make the reader work harder than the design requires?* It is not asking
how to make the code smaller.

**How the review was done**
- **Reviewers:** three read-only Explore reviewers, one per layer:
  `gameplay/`; `levels/` + `core/` + `main.js`; `presentation/` + `ui/` + `tests/`.
- **Spot-checks:** every finding below that drives a change was re-read at the cited
  line. Reviewer claims that did not hold are listed in §7.
- **Project documents read:** ADRs 0002/0004, `code-conventions.md`,
  `test-standards.md`, `findings.md`, and the git history (84 commits; the
  last week was the campaign redesign, the course-brief work and review fixes).
- **Skills:** `code-simplification`, `simplify` and the `code-simplifier` agent
  *apply* edits, so they belong to the implementation phase, not this
  read-only review. Their criteria (behaviour-preserving, no flattening, one
  concern per change) are built into every step below.

**Two constraints shape the whole plan**
1. **`docs/defesa.md` has 54 `file:line` references.** The slides
   (`apresentacao.html`) quote `matrix.js`, `wall.js`, `phong-material.js`
   and `movement.js`. Any edit that shifts lines in a cited file silently
   breaks the defence script. Commit `5eeac24` already had to re-sync these
   once.
2. **`node_modules` is not installed in this checkout.** `npm test` and
   `npm run lint` currently fail with `vitest: not found`. A baseline run is
   step 0.

**Consequence:** the plan is split into **Phase 1, safe before the defence**
(doc/comment-only edits, or edits to files the defence doesn't cite) and
**Phase 2, after the defence** (structural edits). Phase 2 can be pulled
forward only if `defesa.md` is re-synced in the same commit.

---

## 1. Architectural assessment

**Verdict: the architecture is sound and intentional.** What's wrong is
local drift, not structural rot. There is little AI slop. The comments are
overwhelmingly *why* comments tied to spec sections, ADRs and playtests, and
should stay.

### The layers as they actually exist

| Layer | Role | Notable property |
|---|---|---|
| `src/main.js` | Composition root: builds everything, wires callbacks and events, runs the frame loop | Also holds ~70 lines of debug tooling (A3) |
| `src/core/` | Engine plumbing: renderer, scene shell, camera, input, look, movement, aim (`interaction`), grab/drag (`manipulation`), hand-written matrices | Generic over object types via ADR 0002 |
| `src/gameplay/` | Puzzle objects (mirror, emitter, receiver, filter, portal, door, blocker, wall, switch) **plus** pure logic (`laser`, `door-logic`, `aabb`, `rotation`, `colors`) | Pure logic has no `three` import (ADR 0004) |
| `src/levels/` | Data (`data/level-N.js`), then the loader (data → scene graph), then the runtime (live level, per-frame order, exit/portal). `level-manager` holds the sequence and persistence | Levels are pure data (RF08) |
| `src/presentation/` | Feel: motion curves, affordances, camera FX, door view, conduits, sfx, Blinn-Phong shader, reflections | Subscribes to the event bus |
| `src/ui/` | DOM HUD, menu, transitions | Imported only by `main.js` |

### Two coordination mechanisms, each used for the right job
- **Game state is pulled, in a fixed order, every frame.**
  `level-runtime.update`: laser → receivers → portals → devices → blockers →
  conduits → doors. Doors read `isActive()`/`isHit()`. The ordering is the
  contract (`level-runtime.js:117`).
- **Feedback is pushed through the event bus.** `core/events.js` carries
  sound, camera shake and flashes. Gameplay never calls presentation for
  feedback. Emitting with no listener is a no-op, so headless tests are
  unaffected.

The runtime also exposes *callbacks* (`onLevelLoaded`, `onExit`,
`onGameComplete`) for things that must happen **in order and exactly once**
(spawn the player, close the shutter before loading). This split is good but
undocumented (see A4).

### Actual dependency directions
- `gameplay → presentation` is common: objects own their meshes and use
  presentation helpers.
- `presentation → gameplay` happens only through `gameplay/textures.js`,
  which is presentation code living in the wrong folder (A7).
- There are no file-level cycles.

---

## 2. Prioritized findings

Legend: **Pri** H/M/L · **Cx** (complexity) S/M/L · **Phase** 1 = safe before the defence, 2 = after.

### A. Necessary improvements

#### A1 — Storage access can crash boot (Pri M · Cx S · Phase 2)
- **Files:** `src/levels/level-manager.js:31-62`, `src/presentation/quality.js:9-23`,
  `src/presentation/mirror-reflection.js:64-78`, `src/core/look.js:9-24`,
  `src/presentation/sfx.js:21-27,234-241`.
- **Current behaviour:** each module persists its own setting, with
  injectable `storage` for tests.
- **Evidence:**
  - `level-manager.js` has **no** try/catch around `getItem`/`setItem`.
  - In the other four modules, `storage = globalThis.localStorage` is a
    *default parameter*. It is evaluated **outside** the function's
    `try`, so the guard there is only partial.
  - When the browser blocks site data, reading `window.localStorage` throws
    `SecurityError`. `createLevelRuntime` calls `loadSavedLevelIndex` at
    construction, so the game would not boot.
- **Why it costs the reader:** five copies of slightly different fragile code.
  The guard looks complete in four of them and isn't.
- **Proposal:** add one small helper, `src/core/storage.js`:
  - `browserStorage()` returns `globalThis.localStorage` inside try/catch,
    or `null`.
  - `readKey(storage, key)` / `writeKey(storage, key, value)` /
    `removeKey(storage, key)` wrap the calls in try/catch.
  - Every module keeps its own key, validation and default (ownership stays
    local). Defaults become `storage = browserStorage()`.
- **Why it's better:** one obviously correct place for the failure mode, and
  it removes duplication. It is *not* a settings service (rejected in §7).
- **Keep:** key names, value formats, injectability, `resetProgress` semantics.
- **Risk:** low. Saved progress keys are untouched.
- **Tests:**
  - In `level-manager.test.js`, a storage whose `getItem`/`setItem` throw
    gives defaults and no throw.
  - New `storage.test.js`: when the `globalThis.localStorage` getter throws,
    `browserStorage()` returns `null`.

#### A2 — `main.js` construction order relies on misleading guards (Pri M · Cx S · Phase 2)
- **Files:** `src/main.js:66-182, 147, 300`.
- **Evidence:**
  - `levelLabel()` (line 86) and `menu.getState` (93, 95) guard with
    `levelRuntime ? …` / `levelRuntime?.`. But `levelRuntime` is a `const`
    declared at line 151. Before that line, reading it throws
    `ReferenceError` (the temporal dead zone, TDZ), so **the guards can never
    take the fallback branch.**
  - It works only because nothing calls `getState()` until `menu.show` at
    line 310.
  - `movement` is a `let` assigned at line 300 and reached through
    `movement?.stop()` inside `onLevelLoaded`. That callback runs during
    runtime construction, while `movement` is still `null`.
- **Why it costs the reader:** you can't explain the boot order from the
  code. The guards suggest a safety that doesn't exist.
- **Proposal:** make construction linear.
  - Create `movement` before the runtime, passing a lazy
    `() => levelRuntime.getColliders()` (the same pattern `interaction`
    already uses at line 68).
  - Create `menu` after `levelRuntime`. Its callbacks only run on user
    input, so this is safe.
  - Drop the dead `?.` guards and the `loadSavedLevelIndex` fallbacks.
  - Add one comment stating the order rule.
- **Keep:** identical boot behaviour (start menu over the live chamber 1,
  drift, `?debug&level=N`).
- **Risk:** low–medium; boot order is subtle.
- **Validation:** e2e `playthrough.mjs` covers boot, menu, pause/resume and
  level jumps. Smoke-test `npm start` with and without `?debug`.
- **Defence note:** shifts `main.js` lines; `defesa.md` cites `main.js:265`
  and `:321`.

#### A3 — Debug/defence tooling is inlined in the composition root (Pri M · Cx M · Phase 2)
- **Files:** `src/main.js:227-298` (`window.__feixe`, `wallOrder`,
  `projectionLines`, `debugText`, F3/T keys).
- **Evidence:** about 70 of 346 lines are `?debug`-only. Three module-level
  scratch arrays and vectors (`_eye`, `_target`, …) exist only for them.
  `main.js` stops reading as wiring halfway down.
- **Proposal:** add `src/debug.js` exporting
  `installDebugTools({ levelRuntime, camera, scene, renderer, hud, menu, transitions, look, interaction, events, cameraFx, input })`.
  - Inside: `window.__feixe` (same keys), the T/F3 bindings, wall-order
    state, and the projection readout (P·V·p, then divide by w, against
    `Vector3.project`).
  - It returns `{ text() }` for the HUD line in the frame loop.
  - `main.js` keeps one `if (debugMode)` call.
- **Why it's better:** one cohesive concern ("course-brief demo +
  authoring aid") in one file you can open during the defence.
  `main.js` becomes the pure composition root it claims to be.
- **Keep:** the exact `window.__feixe` shape. **The e2e test drives it**:
  `wallOrder`, `levelRuntime`, `phong`, etc.
- **Risk:** medium. The e2e test depends on key names, and the T/L keys are
  demoed live.
- **Validation:** `npm run e2e`. Manually, in `?debug`, press T on L6, L on L10,
  F3, and aim at a mirror to read the w/NDC lines.

#### A4 — Event catalog has drifted from the code (Pri M · Cx S · **Phase 1**)
- **Files:** `src/core/events.js:24-35`, `src/core/manipulation.js:46`.
- **Evidence:**
  - `switch:toggle` is documented as `{ sw, active }` but emitted as
    `{ active }`.
  - `rotate:tick`/`rail:limit` are documented as `{ controller }` but
    emitted as `{}`.
  - `game:complete` is documented as `{}` but emitted as `{ stats }`.
  - `press` is emitted but neither documented nor subscribed.
  - `door:lock` and `trap:off` have no subscribers. That is fine: they are
    symmetric with `door:unlock` and `trap:on`, so document them as
    such.
- **Proposal:** correct the catalog comment. Add two lines saying "bus =
  fan-out feedback; runtime callbacks = ordered, must-happen-once steps".
  Remove the `press` emit, or document it as reserved. Recommendation:
  remove it (Phase 2), since it is dead.
- **Keep:** all event names and payloads that have subscribers.
- **Risk:** none (comment). `events.js` is not cited in `defesa.md`.

#### A5 — ADR 0002's contract no longer matches the code; `userData.interactive` is dead (Pri M · Cx S · Phase 1 for the ADR, 2 for the code)
- **Files:** `docs/decisions/0002-…md`; `src/gameplay/mirror.js:110`,
  `emitter.js:90`, `filter.js:78`, `switch.js:66`;
  `src/presentation/affordances.js:107-116`; `src/core/manipulation.js:16,27`.
- **Evidence:**
  - `userData.interactive = true` is written 4× and **read nowhere**.
    `interaction.js:45` raycasts the `interactiveObjects` array, which the
    loader fills, and the loader is the real gate
    (`level-loader.js:42,57,80,96`).
  - The live contract also includes `controller.rotationStep`, `railAxis`,
    `setGrabbed`, `userData.prompt` and `debugInfo`.
  - `setHovered` is now always installed by `createManipulable`, so
    `interaction.js`'s gray-tint default is never used by game objects.
- **Why it costs the reader:** this is the abstraction most worth defending,
  and its written description is wrong.
- **Proposal:**
  - **Phase 1:** add an ADR 0002 "Amendment (2026-11-17)" section listing
    the real shape, and saying that the `interactiveObjects` array, not a
    flag, decides selectability.
  - **Phase 2:** delete the 4 dead writes. Keep the default hover tint in
    `interaction.js` (it's the fallback for any future plain mesh), but
    reword its comment.
- **Risk:** none for the ADR. For the code, `grep` proves nothing reads
  the flag.

#### A6 — Duplicated rail-device mechanics in `mirror.js` and `filter.js` (Pri M · Cx M · Phase 2)
- **Evidence:**
  - `getReflectiveSegment` (`mirror.js:140-148`) and `getFilterSegment`
    (`filter.js:103-111`) are identical except for the width constant. Each
    file has its own `_localA/_localB` scratch.
  - The rail-slide step (`wasAtEnd`, clamp, `hitLimit`, `applyPosition`) is
    copied at `mirror.js:86-102` and `filter.js:62-76`.
  - The steel material is identical (`mirror.js:16`, `filter.js:13`).
- **Proposal (small, no new hierarchy):**
  - `rail.js` gains a pure `slideAlongRail(t, delta)` returning
    `{ t, hitLimit }`. It is unit-testable, in the style of `railAxis`.
  - One `writePlateSegment(plate, width, out)` (in `rail.js`, since only
    rail devices have moving plates). The existing
    `getReflectiveSegment`/`getFilterSegment` names stay as one-line
    wrappers, because `laser-system.js` reads better with them.
  - A shared steel material helper is **optional** (B).
- **Why it's better:** the one piece of maths (local plate edge →
  `matrixWorld` → world XZ) exists once, which is the hierarchical-transform
  point made in the defence.
- **Keep:** both factories, their different behaviour (a mirror rotates, a
  filter carries colour), and the zero-allocation property.
- **Risk:** medium. Laser correctness depends on it.
- **Tests:** `laser.test.js`, `levels.test.js` (every level's solution
  opens its exit), the new `slideAlongRail` tests, and `npm run analyze`.
- **Defence note:** `defesa.md` cites `mirror.js:16, 36-75, 52-61, 63, 89, 106, 140-148, 141-142`.
  This is the most citation-heavy change, so do it strictly after the
  defence.

#### A7 — `textures.js` is presentation code inside `gameplay/` (Pri L–M · Cx S · Phase 2)
- **Evidence:**
  - It is canvas-generated procedural textures with no game rules.
  - It is imported by `core/scene.js`, `presentation/affordances.js`,
    `presentation/door-view.js` and 7 gameplay objects.
  - It is the **only** reason `presentation/` imports from `gameplay/`.
- **Proposal:** `git mv` it to `src/presentation/textures.js` and update the
  imports. This turns an unstated layering into a true, one-sentence rule:
  *presentation never imports gameplay*.
- **Risk:** low (`modules.test.js` catches broken paths).
- **Defence note:** `defesa.md` cites `textures.js:13,140`; update the path.

#### A8 — `level-runtime.update` mixes three jobs; small accuracy fixes (Pri M · Cx S · Phase 2)
- **Files:** `src/levels/level-runtime.js:68, 114-182, 119`.
- **Evidence:**
  - The 69-line `update` ticks objects, detects the exit, *and* teleports
    through portals.
  - `load()` clamps by hand (line 68), even though `clampLevelIndex` exists
    in `level-manager.js:24`. The hand clamp lets `NaN` through.
  - The comment at line 119 "(was never called before)" is history, not an
    explanation.
- **Proposal:**
  - Split into closure-local `tickLevel(dt)`, `checkExit(camera)` and
    `checkPortals(camera)`. `update` then reads as the three-line frame
    order you'll explain.
  - Use `clampLevelIndex`.
  - Replace the stale comment with the reason the clock is shared.
- **Keep:** exact ordering, the early `return` after an exit trigger, the
  portal cooldown semantics, and the in-place door collider slots.
- **Tests:** `level-manager.test.js` (the runtime race test),
  `portal-crossing.test.js`, `exit-trigger.test.js`, and e2e (the L8 portal
  walk, every level walked out). Add `test_loadLevel_nonInteger_clampsToZero`.

### B. Optional refinements (limited impact; all Phase 2 unless noted)

| # | Change | Evidence | Note |
|---|---|---|---|
| B1 | Move misfiled tests | Events test sits in `motion.test.js`; the `parsePrompt` test sits in `quality.test.js` | Move to `events.test.js` / `hud.test.js`. **Phase 1** (tests only) |
| B2 | Fix the `motion.js` header claim | It says "every presentation animation takes its durations from TEMPO"; only `transitions.js` does | Reword in place, keeping the line count (`motion.js:27` is cited). **Phase 1** |
| B3 | Remove dead exports | `motion.lerp`, `level-runtime.getStats`, `menu.getMode`, `transitions.openNow`, `events.clear`, the `sfx.shutter` cue, `export` on `promptFor`. Each verified to have no caller in `src/`, `tests/`, `gallery/` or `apresentacao/` | Keep test-only exports, which are the pure seams (ADR 0004) |
| B4 | Name the duplicated constants | `switch.js:14-15` has `INACTIVE_COLOR === ACTIVE_COLOR` → one `LAMP_COLOR`. `emitter.js:42` has a literal `0.04` beside `BASE_EMISSIVE_INTENSITY`. `receiver.js:55,99` repeats ring radii `0.47/0.52/48` | Pure readability |
| B5 | Rename misleading names | `affordances.js:9` `LEVELS` (opacity steps, clashes with game levels) → `OPACITY_STEPS`. `door.js` param `receivers` → `inputs` (it also holds switches and `{any}` groups) | `door-view.js` is cited, `door.js` is not |
| B6 | Clarify `level-manager.js`'s role | It holds the sequence plus persistence; "manager" undersells that | Rewrite the header comment only. A rename is not worth the churn |
| B7 | Extract the doors block in `instantiateLevel` | `level-loader.js:139-182` is the only block in the ~170-line function with its own sub-logic (lookup, `{any}` groups, conduits) | Turn it into a local `buildDoor(d)`. The other blocks stay inline, since one block per type reads well |
| B8 | Small UI edge cases | `hud.js:99`: brackets stay visible when every corner is behind the camera. `menu.js:222-232`: typing timers aren't cancelled on ending replay | Verify by hand first |
| B9 | Shared steel material | `mirror.js:16` = `filter.js:13` | Only if A6 is done |

### C. Keep as designed — see §3.
### D. Avoid changing — see §7.

---

## 3. Abstractions worth preserving (and how to defend them)

1. **Pure-logic split (ADR 0004).** `laser.js`, `door-logic.js`,
   `aabb.js`, `rotation.js`, `colors.js`, `exit-trigger.js`,
   `portal-crossing.js`, `matrix.js` and `door-motion.js` have no
   renderer dependency. That is why the laser maths, door rules and every
   level's solution are unit-tested in Node in about 1 s.
2. **Duck-typed controller contract (ADR 0002).** `interaction` and
   `manipulation` never branch on object type. A base class was rightly
   rejected, because the objects share almost no state.
3. **Segment-type protocol in `traceBeam`.** Mirrors, filters, portals,
   receivers, blockers and walls plug in as typed 2D segments. The tracer
   knows nothing about Three.js. It returns `pieces` with `end`/`segment`,
   so the renderer (`laser-beam.js`) is fully separated from the physics.
4. **Fresh per-beam trace objects** (`laser-system.js:20-24`). Do not
   "optimise" these into a scratch object; `findings.md` documents the
   aliasing bug this prevents.
5. **Explicit `updateMatrixWorld()` before raycasts and segment
   extraction.** Not redundant; see `findings.md` 2026-09-19.
6. **Mirror parent/child hierarchy.** The one load-bearing scene-graph
   transform (spec §5).
7. **Loader `addToScene`/`roots` + `userData.shared` disposal.** New object
   types get cleaned up for free, and shared materials survive.
8. **Door: unlock state vs passable state.** `door-motion.js` is a pure,
   reversible state machine. "What blocks you is what you see"
   (`isPassable`) is deliberate.
9. **Pre-reserved door collider slots.** No allocation in the render loop,
   with the reasoning documented.
10. **`onExit`/`advance()` handshake.** The shutter closes before the load,
    and a stale exit is cancelled on reset.
11. **Event bus for feedback; ordered pulls for state.** The right tool for
    each job.
12. **`camera-fx` apply/restore around `render()`.** Shake and FOV lean
    never leak into raycasts or movement.
13. **Hand-written matrices beside Three's (ADR 0010).** `composeTRS`/`TSR`
    with a separate occluder; projection checked against
    `Vector3.project`; the own Blinn-Phong shader with a `PER_VERTEX`
    define. This is the "Avançado" tier of the course brief.
14. **Settings persisted next to their owner, with injectable storage.**
15. **Factory closures, not classes.** Consistent everywhere, private state
    by closure, no `this` pitfalls.
16. **Guard tests.** `modules.test.js` (every module imports),
    `three-version.test.js` (import map = pinned version), `levels.test.js`
    (every solution opens its exit), and the e2e playthrough.
17. **Spec- and ADR-referencing comments.** They are the project's memory.
    Do not prune them as "verbose".

---

## 4. Step-by-step refactoring plan

Each step is **one commit**: lint + unit tests (+ e2e where noted) must be
green, and `defesa.md` must be re-synced if a cited file moved.

**Step 0 — baseline (before anything else)**
- `npm install`, then `npm run lint`, `npm test`, `npm run e2e`. Record that
  all are green.
- Copy this plan to `docs/refactoring-plan.md` and add one line to
  `STATUS.md` linking it.

**Phase 1 — safe before the defence (doc/comment/test-only; no line shifts in cited files)** — ✅ done 2026-11-17 (baseline and after: lint clean, 349/349 unit tests, e2e all passed)
1. A4: rewrite the event catalog comment in `events.js` and add the
   bus-vs-callbacks note.
2. A5 (ADR part): add the ADR 0002 amendment.
3. B2: reword the `motion.js` header in place, with the same line count.
4. B1: move the two misfiled tests.

**Phase 2 — after the defence (or before it, only with a `defesa.md` re-sync in the same commit)**

Ordered by risk, lowest first:

5. A7: move `textures.js` into `presentation/`.
6. A1: add `core/storage.js` and route the 5 persistence modules through it.
   Add tests.
7. A5 (code part) + B3: delete the dead `userData.interactive` writes and the
   dead exports. Remove the `press` emit.
8. B4, B5, B6: constants, names, `level-manager` header.
9. A8: split `level-runtime.update` into three helpers; switch to
   `clampLevelIndex`; add a test.
10. A2: linear construction order in `main.js`. Run e2e.
11. A3: extract `src/debug.js`. Run e2e, then the manual `?debug` checklist.
12. A6 (+B9): `slideAlongRail` + `writePlateSegment` in `rail.js`. Run unit
    tests, `npm run analyze`, and e2e.
13. B7, B8: optional, if time allows.
14. Update `STATUS.md`. Add a `findings.md` bullet for the TDZ/default-param
    storage gotcha, since it is a genuine surprise.

**Re-sync check after each Phase 2 step:**
```
grep -oE '[a-z0-9/_-]+\.(js|mjs):[0-9]+(-[0-9]+)?' docs/defesa.md | sort -u
```
Open each hit and confirm it still points at the quoted code.

## 5. Verification & regression strategy

- **Every step:** `npm run lint`, `npm test`.
- **Steps touching runtime, `main.js`, the loader or the rail devices:**
  `npm run e2e`. The playthrough covers:
  - the menu and pause/resume;
  - walking, the R restart and the L/T demo keys;
  - aim occlusion on L8 and door reversal;
  - the L8 portal route on foot;
  - **every level solved and walked out**;
  - the ending and replay;
  - the quality switch building the env map;
  - a reduced-motion run, with no page errors.
- **Laser / rail changes:** `npm run analyze`. All 10 levels must stay
  solvable with unchanged tolerance windows.
- **New tests:**
  - `storage.test.js`;
  - throwing-storage cases in `level-manager.test.js`;
  - `slideAlongRail` cases in `rotation.test.js` (next to `railAxis`);
  - `test_loadLevel_nonInteger_clampsToZero`.
- **Manual `?debug` checklist:**
  - T on L6 (wall order changes visibly);
  - L on L10 (Gouraud ↔ Phong);
  - F3 readout;
  - aim at a mirror (`à mão` w/NDC ≈ Three NDC);
  - `+`/`-` FOV;
  - M mute;
  - quality and reflections toggles;
  - `?debug&level=10`.
- **No test is weakened or removed.** Moved tests keep their names.

## 6. Academic presentation preparation

### Decisions to be able to explain
- Three.js via an import map with no build step (ADR 0001).
- Pure 2D logic split from the 3D view, for testability (0004).
- Duck-typed interaction contract (0002).
- One dynamic light per beam (0003).
- Proximity exit trigger (0006).
- Doors and blockers as movement colliders (0007).
- Shared receivers for AND/OR doors (0008).
- Snapped rotation (0009).
- Own shader and matrices for the course brief (0010).

### Module responsibilities in one breath
- `core` is "how you see, move, aim and grab".
- `gameplay` is "the puzzle pieces and their rules".
- `levels` is "data → scene, and the live level's frame order".
- `presentation` is "how it feels".
- `ui` is "DOM overlays".
- `main` is "wiring".

### Flows to rehearse
1. **One frame** (`main.js` `animate`):
   - movement (axis-separated AABB slide);
   - `interaction.update` (forces `matrixWorld`, raycasts against
     occluders);
   - `levelRuntime.update`: laser trace, receivers, portals, devices,
     blockers, conduits, doors and their colliders, then the exit check and
     portal teleport;
   - HUD and transitions;
   - `cameraFx.apply`, then `render`, then `cameraFx.restore`.
2. **The beam:**
   - Emitter yaw → direction.
   - `traceBeam` intersects the ray with every segment and takes the nearest.
     A mirror reflects with `r = d − 2(d·n)n`; a filter masks the colour; a
     portal re-emits from its linked end; a receiver or blocker stops the beam.
   - The pieces go to the beam renderer, and the traces go to
     `receiver.evaluate` (additive colour).
3. **The level lifecycle:**
   - `getLevels`, then `instantiateLevel` (factories, `roots`).
   - `createLaserSystem`, colliders/occluders, save the index, then
     `onLevelLoaded` + `level:enter`.
   - The exit triggers `onExit`, the shutter closes, then `advance()` either
     loads the next level or ends the game.
   - `disposeLevel` frees GPU resources, except shared materials.
4. **Interaction:**
   - Aim (ray from the screen centre, nearest object in `interactiveObjects`
     not occluded).
   - Click: `activate()` for one-shot objects, otherwise grab the
     `controller`.
   - The mouse delta becomes rail `t` or a stepped angle; release.

### Trade-offs the professor may question (with short answers)
- **"Why 2D tracing in a 3D game?"** Beams are at a fixed height (spec), so
  the problem is truly planar. That gives exact, testable maths and a cheap
  frame.
- **"Why not physics / ray tracing?"** Spec §14 excludes both.
- **"Why duck typing, not classes or interfaces?"** Objects share almost
  nothing. The contract is three methods. ADR 0002 lists the cost (silent
  mismatches) and why it's acceptable.
- **"Why an event bus *and* callbacks?"** The bus is fan-out with no
  ordering guarantees, which is fine for sound and shake. The callbacks are
  ordered, once-only lifecycle steps.
- **"Why hand-written matrices when Three has them?"** The course brief
  rewards your own logic. Ours is checked against Three's to 9 decimals in
  `matrix.test.js`.
- **"Why does `presentation/door-motion.js` decide passability?"** So the
  collider always matches the panel the player sees. It is pure and tested.
- **"Global singletons (sfx mute, shading mode)?"** There is exactly one
  audio context and one shading mode, by nature. The owner is `main.js`.

### Currently hard to explain (fixed by the plan)
- The `main.js` boot order (A2).
- `main.js`'s debug block (A3).
- The ADR 0002 text vs reality (A5).
- The event catalog (A4).
- The mirror/filter duplication (A6).

---

## 7. Explicitly rejected simplifications (and reviewer claims that didn't hold)

- **A `RailDevice` base class merging mirror and filter.** They differ in
  rotation, colour, prompts and visuals. Share the *mechanics* (A6), not
  the identity.
- **An `InteractiveObject` base class or a formal interface layer.**
  Rejected for good reasons in ADR 0002.
- **Replacing the bus with direct calls, or the runtime callbacks with
  events.** This would lose either decoupling or ordering.
- **Zero-allocation `traceBeam`.** It is explicitly exempted in
  `code-conventions.md`; it is bounded and tested.
- **Removing the "redundant" `updateMatrixWorld()` calls, or the fresh
  per-beam objects.** Both fix documented bugs.
- **A central settings service or store.** Overkill. A1's helper only makes
  access *safe*; ownership stays local.
- **Splitting `instantiateLevel` into a type registry or plugin system.**
  One block per type reads like the level data. At most B7.
- **Splitting `menu.js` / `door-view.js` / `laser-beam.js` into many files.**
  These are long but cohesive factory closures. Splitting adds navigation
  cost without clarity.
- **Inverting `gameplay → presentation` with per-object view classes.** A
  large refactor for no behaviour gain. A7 already makes the remaining rule
  clean.
- **Deleting `matrix.js` functions only used internally** (`identity`,
  `rotationX`, …). They are teaching code, and `composeTRS` is built from
  them.
- **Pruning the spec/ADR-linked comments.** They are the "why" a reader
  needs.
- **Reviewer claims rejected after checking:**
  - "`door:unlock` re-fires on reversal is a bug": no. It mirrors the
    preceding `door:lock`, so the clamp sound is correct.
  - "`door-view.js:140` is a no-op branch": no. The two branches set
    different rotations.
  - "ADR 0004 is stale about `three`": no. It has a 2026-10-01 amendment.
  - "Receiver `RingGeometry` allocation breaks the render-loop rule":
    bounded (≤48 rebuilds during a charge, only on arc change). Not worth
    churn.
