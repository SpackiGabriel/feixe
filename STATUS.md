# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus (checkpoint 2026-11-16)

**Campaign redesign** (merged into `main`, baseline tag `pre-redesign`):
all ten levels re-authored, one idea each, inside spec §11's names and
concepts. Design record: `design/campaign.md` (audit, what each level
teaches, cards, playtest protocol and its results in §8); sources:
`docs/research/level-design-research.md`; rules: `docs/decisions/0009`
(snapped rotation, soft object counts, portal-center and two-sided
mirrors as rules). Tool: `npm run analyze [N]`.

**Owner playtest done (2026-11-16)**, results in `design/campaign.md` §8.
Fixed from it: aiming passes through glass (L8 softlock; L8 door 1 has an
open square hatch showing it, visual only), L9's M4 rail
shortened; rails keep devices ≥ 1 m apart (L9 M2 started inside M1;
test `railDevices_cannotOverlap`). Owner then reported (2026-11-16, by feel, no numbers): frame
rate "super smooth", camera smooth with a real mouse (flick fix holds),
sound fine. Next:

1. Second owner playtest (checks the L8/L9 fixes).
2. Visual track: final assets can replace device meshes without touching
   logic (`docs/presentation.md`, "Swapping in final assets").

## Verified (evidence from this checkpoint)

- **Playtest fixes** (2026-11-16): glass walls and doors (`style:
  'glass'`) no longer block aiming (`occluder: null` in `wall.js` /
  `door.js`), so in L8 the mirror stays re-aimable from the strip after
  door 1 shuts; fixed (no-DOF) mirrors are no longer selectable, so L1's
  display mirror behind glass stays inert. L9's M4 rail is now x ∈
  [−0.6, 1]. `npm test` 292 pass; analyzer L9: still one route family;
  `npm run e2e` all pass, incl. the new "selectable through the closed
  glass door" check. `npm run lint` clean. `npm start` now runs
  `scripts/start-server.mjs` (picks `python` on Windows, `python3`
  elsewhere). `npm run analyze` works on Windows again (its main guard
  compared a `file://` string against a backslash path).

- **Mirror reflection prototype** (2026-11-05, branch
  `feat/mirror-reflection`, PR #3): each mirror face is a
  Three.js `Reflector` (vendored `vendor/three/addons/Reflector.js`):
  the scene re-rendered from the camera mirrored across the plate, oblique
  near plane, 512² texture, tinted below the beams. Code:
  `presentation/mirror-reflection.js`. Mirrors don't see other mirrors'
  reflections (layer 1), so no recursion. Seen working on L3 and L10.
  Cost measured on an Intel UHD (this machine, pane hidden, noisy):
  +3.5–6 ms/frame at 1920×1080 with L10's four mirrors in view; MSAA and
  texture size barely matter (the extra scene pass does). **Not measured
  on the presentation machine; not playtested** (do reflected beams read
  as extra beams?). The team tried it: no frame-rate loss, and no
  mirror-in-mirror is wanted (less confusing). Menu "Reflexos"
  (ligados/desligados, persisted, default on) toggles them instantly,
  independent of "Qualidade"; off = the plate's env-mapped metal.
  "Qualidade" sets the reflection texture (alta 512² + 4× MSAA, baixa
  256² no MSAA; `REFLECTION_QUALITY`), applied to existing mirrors at
  once.

- Playtest fixes (2026-11-05): camera flick (Chromium/Windows pointer-lock
  delta spikes) handled in `core/input.js` with raw `unadjustedMovement`
  where supported, dropping one-event deltas > 250 px and the first 2
  events after locking; menu "Sensibilidade" 0.25×–3× (look only,
  persisted, `core/look.js`); level 8 door 1 is a framed glass pane
  (`style: 'glass'` on a door, visual only). `npm test`: 264 pass; menu
  and L8 door checked in the browser. **The flick fix is not verified
  with a physical mouse.**

- Redesign: `npm test` 258 tests pass (new scenarios pin each level's
  intended wrong turns); `npm run analyze`: every level self-checks, and
  only the intended route families open each exit (two in L10, one
  elsewhere); every rail has ≥ 0.3 m slack; every rotation is snapped.
  `npm run e2e`: 71 checks pass on the new levels. Spawn screenshots of
  all ten unsolved levels reviewed (L6 and L9 spawns adjusted).
- **Not re-verified after the redesign:** frame time on real hardware
  (the new levels have fewer or equal objects; software-WebGL frame times
  in e2e are unchanged). Nothing about comprehension or fun: no player
  has played the new campaign.

- `npm run lint` clean; `npm test`: 17 files, 248 tests pass. New: pure door
  motion (reversal without jumps, passable threshold, rapid toggling),
  conduit routing, motion/easing, events, quality/pixel budget, prompt
  parsing; all 10 levels + template still validated headlessly.
- `npm run e2e` (headless Chromium, external network blocked): 71 checks
  pass. They cover the menu (keyboard cursor), real pointer-lock start →
  pause on lock loss → Enter resumes, the level title appearing on play,
  W movement + R restart, aim occlusion, door re-lock reversal (no jump,
  drops shut, impassable), level 8 on foot through door 1 and the portal,
  every level 1→10 (locked → solution → passable → shutter → next), the
  typed ending and replay, a full reduced-motion run, zero page errors and
  zero external requests.
- **Performance on real hardware** (Radeon 610M, Chromium, 1920×1080):
  4–15 ms/frame on every level, including at 1.5× device pixel ratio
  thanks to the pixel budget. Measured with scratch scripts, not part of CI.
- Screenshots reviewed for: menu, room 1, reflections, hover/brackets,
  receiver charge, door lifting/open/under the frame, shutter, trap hit
  (L7), portal pair in use (L8), level 10 unsolved/solved, ending.

## Not verified (needs a human)

(2026-11-16: camera flick, mouse/camera feel, sound and frame rate were
reported fine by the owner on their machine — see Current focus.)

- Clarity for a first-time player (the owner knows the mechanics): does
  the trap, the conduit/pip language and the portal pairing explain
  themselves without a hint? Do L1–L4 teach the controls?
- Frame rate on the presentation machine, if it isn't the owner's. Run
  with "Qualidade: baixa" if it's weaker than the Radeon 610M.
- CI's e2e step on GitHub (never run remotely).

## Level presentation audit (2026-11-05)

Systemic fixes, applied to all levels: neutral devices with distinct
silhouettes, trap identity, conduits + pips (which receiver drives which
door, partial progress), idle-dim affordances, contact flares, exit glow,
chamber numerals, spawns that frame the mechanism.
- **L7 "red rectangle"**: it was the trap glowing red, the same hue as the
  red filter and receiver. Now it's a black/off-white hazard slab with a
  lens that goes white-hot when hit, and its cold dashed conduit points at
  the exit it holds shut.
- **L8 confusing/claustrophobic**: wall A is frosted glass; spawn faces
  the mirror and door 1 from the corner; door 1 has a frame and lamps;
  the portal pair shares a numeral and glows while the beam passes.
- **L10 clutter**: idle dials/rails at 12%, conduits invisible until live,
  mirrors toned below the beams. The redesign applied the zone proposal:
  4 mirrors, red/green side west, blue side east.

## Implementation map (spec → code)

| Spec | Where |
|---|---|
| RF01 movement, §4 camera (pitch clamp, FOV `+`/`−`) | `src/core/{movement,look,camera,input}.js`, `presentation/camera-fx.js` |
| RF02/RF03 select, slide on rail, rotate (snap optional); emitters rotate only if the level allows | `src/core/{interaction,manipulation}.js`, `src/gameplay/{mirror,emitter,filter,rotation,rail}.js`, `presentation/affordances.js` |
| RF04 per-frame trace, reflection limit | `src/gameplay/{laser,laser-system}.js` |
| RF05 additive color; §7 filter (subtractive), trap blocker (NOT) | `laser.js`, `filter.js`, `blocker.js`, `door-logic.js` |
| RF06 receiver feedback (charge, lock, sound) | `src/gameplay/receiver.js`, `presentation/sfx.js` |
| RF07 doors AND/OR, nested `{any}`, `forbidIds`, animated reversible motion | `src/gameplay/door.js`, `presentation/door-{motion,view}.js`, `level-loader.js` |
| RF08 declarative levels incl. interior `walls` (solid/glass) | `src/levels/data/*.js`, `level-loader.js` |
| RF09 10 levels, restart (`R`), progression, ending | `src/levels/{level-manager,level-runtime}.js`, `ui/{menu,transitions}.js` |
| RF10 / NFR feedback, color symbols, HUD | `src/ui/hud.js`, `presentation/conduits.js`, `src/gameplay/{textures,colors}.js` |
| §9 portals (beam + player) | `src/gameplay/portal.js`, `src/levels/portal-crossing.js` |
| NFR persistence | `level-manager.js` (`localStorage`, reset on finish / Novo jogo) |
| §13 III lighting/materials/textures | `core/scene.js`, `textures.js`, env-mapped metal (`presentation/env-map.js`) |
| §13 IV animation | door motion, receiver charge/lock, conduit pulses, beam flow, portal surface, transitions |

## Known limitations (deliberate)

- **No emitter tilt** (RF03/§6 "em casos específicos"): the tracer is 2D at
  one beam height. Decided with the team on 2026-11-05.
- Outer room fixed at 10×10 m for every level; sub-areas use `walls`.
- Mirrors reflect on both faces, and a portal re-emits beams from the far
  portal's center: both are now game rules levels 9–10 rely on
  (`docs/decisions/0009`).
- All meshes are procedural primitives; no GLB is loaded yet.
- No web fonts (offline): the UI uses system font stacks.
- The ceiling (design-system D-20, still open) is a presentation choice
  made in this pass: dark coffers at 3 m.

## Tuning list (fill in during playtest)

- Manipulation: `ROTATE_SENSITIVITY`, `RAIL_METRES_PER_PIXEL`, Q/E step 15°
  (`core/manipulation.js`).
- Timing: `TEMPO` (`presentation/motion.js`), `DOOR_TIMING`
  (`door-motion.js`), `CHAIN` (`conduits.js`).
- Mouse: spike threshold `MAX_MOUSE_DELTA` (`core/input.js`) if fast
  swipes feel swallowed; `SENSITIVITY_STEPS` (`core/look.js`).
- Camera: grab FOV offset, rumble amplitude (`camera-fx.js`); walking
  accel/decel (`movement.js`).
- Look: lighting/fog (`scene.js` `setAtmosphere`), beam thickness/halo
  (`laser-beam.js`), affordance idle level (`affordances.js`).
- Sound: cue gains (`sfx.js`).

## Visual design system (discovery only — nothing implemented)

Visual identity and asset pipeline are being specified, not built:
`design/visual/design-premise.md` (art direction), `design-system-discovery.md`
(established vs. open decisions), `docs/research/pipeline-assessment.md`,
`assets/README.md`. A grey-box evaluation page lives in `gallery/` (reuses the
real factories; `npm start` → `/gallery/`); first-pass screenshots in
`design/visual/evidence/`. The game now has procedural textures, a
baseline symbol mapping (`src/gameplay/{textures,colors}.js`, swappable in
one table) and the presentation rules in `docs/presentation.md` (which
apply design-system COL-01/02: portals, switch, doors and traps are now
neutral). It loads no GLB.

2026-10-03: asset iteration loop built: `assets/src/build.sh receiver`
(Blender → 3 placeholder GLB variants + manifest, validated) and a neutral
clay side-by-side viewer at `/assets/viewer/`. The Receiver design is
deliberately **not** decided (shape, symbols, materials all open); see
`assets/README.md` for the loop. The game does not load any GLB yet.

2026-10-02: `design/visual/design-system.md` (v1, frozen items only) and
`design/visual/tokens.json` (values copied from `src/`) drafted. The
open decisions are listed at the bottom of `design-system.md`; the
Receiver can't be built until the team settles at least the shape
language, symbol mapping and front-face convention.

Asset toolchain is installed and smoke-tested (Blender 4.5 LTS headless,
`@gltf-transform/cli`, `playwright-core`): `bash assets/src/smoke.sh`, details
in `assets/README.md`. Not yet used for any real asset.

## How to run

See `README.md` (`npm start`, `npm run lint`, `npm test`, `npm run e2e`).
