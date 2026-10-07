# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus

Levels 1-9 are built (1-7 manually verified; 9 playtested and iterated;
8 trace-verified only). This branch also fixes the Level 8 portal's
**player** crossing — the trigger was a tiny 0.8 m circle that off-centre
approaches missed (hit the full-width wall instead); it's now a doorway
aligned to the portal's face (`portal-crossing.js`, `docs/findings.md`).
Next: build Level 10 ("Prisma").

Level 9 ("Circuito", `docs/decisions/0008`): two aim-locked emitters
(white + blue), four free-rotation mirrors, a slidable red filter and a
blocker feed an AND door (the exit) and an OR door that watch the **same**
two receivers — "both open" is automatic (`r1∧r2 ⟹ r1∨r2`), so no engine
change beyond an opt-in emitter aim-lock in the loader. Trace-verified,
unit-tested (`tests/unit/level-9.test.js` + generic `levels.test.js`), and
playtested (45° snap removed for fluid rotation; emitters locked to kill a
diagonal shortcut).

**Needs a manual in-browser check**: Level 8 — door 1 opens with the
mirror at +45°; the (solid) dividing wall requires the portal (now a
reliable doorway); reconfiguring to 90° re-closes door 1 but opens the
exit via the portal-routed beam.

## Implementation progress

| System | State |
|---|---|
| Rendering & scene foundation | Done — `src/core/{renderer,camera,scene}.js`, `index.html`, `src/main.js` |
| Movement & raycast interaction | Done — `src/core/{input,look,movement,interaction,manipulation}.js` |
| Mirror & emitter system | Done — `src/gameplay/{mirror,emitter}.js` |
| Laser simulation & color composition | Done — `src/gameplay/{laser,laser-beam,laser-system}.js`, unit tested (`tests/unit/laser.test.js`) |
| Receiver & door logic | Done — `src/gameplay/{receiver,door,door-logic}.js`, `src/core/audio.js`; unit tested (`tests/unit/door-logic.test.js`, plus `isReceiverSatisfied` in `laser.test.js`) |
| Switch (laser-free one-shot toggle) | Done and manually playtested — `src/gameplay/switch.js`; reuses `door.js`/`door-logic.js` unchanged via the same `isActive()` shape as a receiver |
| Filter & blocker | Done and manually playtested — `src/gameplay/{filter,blocker}.js`, wired into `level-loader.js`/`laser-system.js` |
| Level system (declarative data + loader) | Done — `src/levels/{level-loader,level-manager,level-runtime}.js`; unit tested (`tests/unit/level-manager.test.js`), plus headless per-level validation (`tests/unit/levels.test.js`: starts closed, declared `solution` opens the exit, dispose frees everything). Only gameplay objects are level data — room geometry is still hardcoded (`docs/decisions/0005`) |
| Level-to-level exit trigger | Done and manually playtested — `src/levels/exit-trigger.js` (proximity to an open `exit: true` door, `docs/decisions/0006`), wired into `level-runtime.js`; unit tested (`tests/unit/exit-trigger.test.js`) |
| Portal system | Done — `src/gameplay/portal.js` + `src/levels/portal-crossing.js` (beam via the tracer segment; player via a doorway-shaped trigger aligned to the portal face); unit tested (`tests/unit/{laser,portal-crossing}.test.js`). Level 8's player-crossing fixed on this branch (was a too-small circle) |
| Door/blocker movement collision | Done — `src/gameplay/aabb.js`, `door.js`'s/`blocker.js`'s `getCollider()`, wired into `movement.js`/`level-runtime.js` (`docs/decisions/0007`); unit tested (`tests/unit/aabb.test.js`). Doesn't gate aim-based manipulation — see `docs/findings.md` |
| Feedback / accessibility UI | Not started |
| Levels 1-10 | **Levels 1-7 manually verified; Levels 8-9 done** (`src/levels/data/level-{1..9}.js`). Level 8 trace-verified, not yet manually played. Level 9 trace-verified, unit-tested and playtested (`docs/decisions/0008`). Level 10 not built |

## Visual design system (discovery only — nothing implemented)

Visual identity and asset pipeline are being specified, not built:
`design/visual/design-premise.md` (art direction), `design-system-discovery.md`
(established vs. open decisions), `docs/research/pipeline-assessment.md`,
`assets/README.md`. A grey-box evaluation page lives in `gallery/` (reuses the
real factories; `npm start` → `/gallery/`); first-pass screenshots in
`design/visual/evidence/`. No GLB loading, no Blender scripts, no tokens exist
yet; gameplay visuals in `src/` are still the placeholder primitives.

Asset toolchain is installed and smoke-tested (Blender 4.5 LTS headless,
`@gltf-transform/cli`, `playwright-core`): `bash assets/src/smoke.sh`, details
in `assets/README.md`. Not yet used for any real asset.

## Known issues / blockers

None yet.

## Immediate next steps

1. Manually playtest Level 8 (portal crossing + the two-door sequence),
   then build Level 10 ("Prisma") — the finale: three emitters, six
   mirrors, a filter, a blocker, a portal pair, and a final door needing
   an AND (composite colour) plus an OR. Its three emitters lift the
   beam-budget ceiling to three lit receivers (`docs/findings.md`).
2. Before authoring, read `docs/level-authoring.md` (placement/portal
   gotchas) and declare a `solution` in the level data (`levels.test.js`).

## Known simplifications (not blockers)

- Room geometry (walls) is not level data — every level currently shares
  the same fixed room from `src/core/scene.js` (`docs/decisions/0005`).
- Level 8's non-exit door ("door 1") isn't flanked by walls, so it's a
  soft gate — a player could walk around its 2m width in the open room
  instead of through it, though nothing about the intended solution path
  requires that detour. Only the level's dividing wall (a full room-width
  blocker) is a genuinely unavoidable obstacle.

## How to run

See `README.md` (`npm start`, `npm run lint`, `npm test`). Press `R`
in-game to restart the current level.
