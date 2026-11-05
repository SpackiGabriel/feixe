# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus (checkpoint 2026-11-05, deadline ≈ 2026-11-12)

The game is functionally complete. All ten levels are playable end to end
with every spec mechanic (RF01–RF10), the HUD, persistence and the end
screen. The remaining work is **creative and verification work**, not
engine work:

1. **Manual playtest on a real GPU, with mouse feel** (both students). It
   has never been done for levels 6–10 since this round of changes. Note
   anything confusing in the tuning list below.
2. **Creative pass on levels** (designer): the levels in
   `src/levels/data/` are working reference levels that satisfy spec §11.
   Refine layouts and difficulty following `docs/level-authoring.md`.
3. Visual track: replace placeholder looks where desired (see "Visual
   design system" below). Keep gameplay readability: symbols, door lamps,
   receiver pulse.

## Verified (evidence from this checkpoint)

- `npm run lint` clean; `npm test`: 13 files, 219 tests pass. These include
  headless validation of all 10 levels plus the template: exit starts
  closed, `solution` opens it, `scenarios` hold, emitter-rotation shortcut
  guard, dispose frees everything.
- `npm run e2e` (headless Chromium, software WebGL, external network
  blocked): 52 checks pass. It covers real `W` movement and `R` restart,
  aim occlusion, level 8's two-door route walked with the real `W` key,
  then every level 1→10 (closed exit → solution → open → walk into exit →
  next level), the end screen, progress reset, zero page errors and zero
  external requests.
- Screenshots of every level reviewed (`node tests/e2e/playthrough.mjs --shots <dir>`).

## Not verified (needs a human)

- Mouse-driven manipulation feel (pointer lock can't be driven headless;
  e2e applies solutions through the same object controls instead).
- Frame rate on the presentation machine (spec NFR 60 fps); software
  WebGL in e2e says nothing about it.
- Audio (procedural tones; headless has no audio).
- CI's new e2e step (added to `.github/workflows/ci.yml`, not yet run on GitHub).

## Implementation map (spec → code)

| Spec | Where |
|---|---|
| RF01 movement, §4 camera (pitch clamp, FOV `+`/`−`) | `src/core/{movement,look,camera,input}.js` |
| RF02/RF03 select, slide on rail, rotate (snap optional); emitters rotate only if the level allows | `src/core/{interaction,manipulation}.js`, `src/gameplay/{mirror,emitter,filter,rotation,rail}.js` |
| RF04 per-frame trace, reflection limit | `src/gameplay/{laser,laser-system}.js` |
| RF05 additive color; §7 filter (subtractive), trap blocker (NOT) | `laser.js`, `filter.js`, `blocker.js`, `door-logic.js` |
| RF06 receiver feedback (pulse, light, tone) | `src/gameplay/receiver.js`, `src/core/audio.js` |
| RF07 doors AND/OR, nested `{any}`, `forbidIds`, slide animation, lock lamps | `src/gameplay/door.js`, `level-loader.js` |
| RF08 declarative levels incl. interior `walls` | `src/levels/data/*.js`, `level-loader.js` |
| RF09 10 levels, restart (`R`), progression, end screen | `src/levels/{level-manager,level-runtime}.js` |
| RF10 / NFR feedback, color symbols, HUD | `src/ui/hud.js`, `src/gameplay/{textures,colors}.js` |
| §9 portals (beam + player) | `src/gameplay/portal.js`, `src/levels/portal-crossing.js` |
| NFR persistence | `level-manager.js` (`localStorage`, reset on finish / Novo jogo) |
| §13 III textures (procedural canvas) / IV animation | `textures.js`; door slide, receiver pulse, beam update |

## Known limitations (deliberate)

- **No emitter tilt** (RF03/§6 "em casos específicos"): the tracer is 2D at
  one beam height. Decided with the team on 2026-11-05.
- Outer room fixed at 10×10 m for every level; sub-areas use `walls`.
- Mirrors reflect on both faces.
- Portal beams leave the far portal from its center (not the mirrored
  entry offset).
- Spec §10/§13 "malhas-base reutilizadas": all meshes are procedural
  primitives. No GLB is loaded (the asset pipeline in `assets/` is
  separate, unfinished visual-track work).

## Tuning list (fill in during playtest)

- Rotation sensitivity (`manipulation.js` `ROTATE_SENSITIVITY`), rail drag
  speed (`RAIL_METRES_PER_PIXEL`), Q/E step (15°).
- Lighting levels (`scene.js`), beam thickness (`laser-beam.js`).

## Visual design system (discovery only — nothing implemented)

Visual identity and asset pipeline are being specified, not built:
`design/visual/design-premise.md` (art direction), `design-system-discovery.md`
(established vs. open decisions), `docs/research/pipeline-assessment.md`,
`assets/README.md`. A grey-box evaluation page lives in `gallery/` (reuses the
real factories; `npm start` → `/gallery/`); first-pass screenshots in
`design/visual/evidence/`. The game now has procedural textures and a
baseline symbol mapping (`src/gameplay/{textures,colors}.js`, swappable in
one table) but loads no GLB.

Asset toolchain is installed and smoke-tested (Blender 4.5 LTS headless,
`@gltf-transform/cli`, `playwright-core`): `bash assets/src/smoke.sh`, details
in `assets/README.md`. Not yet used for any real asset.

## How to run

See `README.md` (`npm start`, `npm run lint`, `npm test`, `npm run e2e`).
