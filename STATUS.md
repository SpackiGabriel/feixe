# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus (checkpoint 2026-11-05, deadline ≈ 2026-11-12)

Functionally complete, and the **juice pass** (game feel and presentation)
is done: every state change now reads as a short cause→effect chain,
non-laser devices are neutral, and the UI is an operator panel instead of
web dialogs. Rules and code map: `docs/presentation.md`. What's left is
**human** work:

1. **Playtest on the presentation machine, with a mouse** (both students):
   feel, comfort, clarity, sound mix. Use the tuning list below.
2. **Creative level pass** (designer): `docs/level-authoring.md`.
3. Visual track: final assets can replace device meshes without touching
   logic (`docs/presentation.md`, "Swapping in final assets").

## Verified (evidence from this checkpoint)

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

- Mouse feel of grab/slide/rotate, the FOV lean-in and the door rumble
  (camera comfort). Sound mix and levels (headless has no audio output).
- Whether the atmosphere reads as intended, and clarity for a first-time
  player: does the trap, the conduit/pip language and the portal pairing
  explain themselves without a hint?
- Frame rate on the *actual* presentation machine. Run with "Qualidade:
  baixa" if it's weaker than the Radeon 610M.
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
  mirrors toned below the beams. **Proposal, not applied** (changes the
  puzzle's look/space; designer's call): move the six mirrors' bases onto
  two visibly separate floor zones (south-west = red/green into the portal,
  south-east = blue), and lift the trap off the walking gap's edge.

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
- Mirrors reflect on both faces.
- Portal beams leave the far portal from its center (not the mirrored
  entry offset).
- All meshes are procedural primitives; no GLB is loaded yet.
- No web fonts (offline): the UI uses system font stacks.
- The ceiling (design-system D-20, still open) is a presentation choice
  made in this pass: dark coffers at 3 m.

## Tuning list (fill in during playtest)

- Manipulation: `ROTATE_SENSITIVITY`, `RAIL_METRES_PER_PIXEL`, Q/E step 15°
  (`core/manipulation.js`).
- Timing: `TEMPO` (`presentation/motion.js`), `DOOR_TIMING`
  (`door-motion.js`), `CHAIN` (`conduits.js`).
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

Asset toolchain is installed and smoke-tested (Blender 4.5 LTS headless,
`@gltf-transform/cli`, `playwright-core`): `bash assets/src/smoke.sh`, details
in `assets/README.md`. Not yet used for any real asset.

## How to run

See `README.md` (`npm start`, `npm run lint`, `npm test`, `npm run e2e`).
