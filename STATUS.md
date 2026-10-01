# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus

Levels 1-8 are built (1-7 manually verified; 8 trace-verified only). Next:
manually play Level 8, then build Level 9 ("Circuito") — reuses every
system already built, no new ones needed.

**Needs a manual in-browser check**: Level 8 — door 1 opens with the
mirror at +45°; walking through the (solid) dividing wall requires the
portal; reconfiguring to 90° re-closes door 1 but opens the exit via the
portal-routed beam.

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
| Level system (declarative data + loader) | Done — `src/levels/{level-loader,level-manager,level-runtime}.js`; unit tested (`tests/unit/level-manager.test.js`). Only gameplay objects are level data — room geometry is still hardcoded (`docs/decisions/0005`) |
| Level-to-level exit trigger | Done and manually playtested — `src/levels/exit-trigger.js` (proximity to an open `exit: true` door, `docs/decisions/0006`), wired into `level-runtime.js`; unit tested (`tests/unit/exit-trigger.test.js`) |
| Portal system | Done — `src/gameplay/portal.js` + `src/levels/portal-crossing.js` (beam and player both supported); unit tested (`tests/unit/{laser,portal-crossing}.test.js`). Not yet manually playtested (see above) |
| Door/blocker movement collision | Done — `src/gameplay/aabb.js`, `door.js`'s/`blocker.js`'s `getCollider()`, wired into `movement.js`/`level-runtime.js` (`docs/decisions/0007`); unit tested (`tests/unit/aabb.test.js`). Doesn't gate aim-based manipulation — see `docs/findings.md` |
| Feedback / accessibility UI | Not started |
| Levels 1-10 | **Levels 1-7 done and manually verified, Level 8 done** (`src/levels/data/level-{1..8}.js`). Level 8's geometry/color/collision logic is trace-verified but not yet manually played. Levels 9-10 not built |

## Known issues / blockers

None yet.

## Immediate next steps

1. Manually playtest Level 8, then build Level 9 ("Circuito") — two
   emitters, a filter, a blocker, an AND door and an OR door sharing four
   mirrors.
2. Before authoring it, read `docs/level-authoring.md` (placement and
   portal gotchas).
3. Quality follow-ups, not started: simplify `disposeLevel`, CI, a
   `?debug` level-jump hook.

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
