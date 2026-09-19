# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus

Levels 1-5 (the full tutorial block) are built and manually verified end
to end. Level 6 ("Bifurcação") opens the "quebra-cabeças" block: one
emitter, three mirrors that both slide and rotate, and an OR door over
two receivers reachable by two symmetric paths. No blocker object exists
yet (that's level 7) — the geometry itself was verified against the real
`traceBeam()` function (both solved branches hit their receiver, the
unsolved state hits a wall), but not yet played through by hand. Next up:
verify Level 6, then Level 7 ("Filtro"), which needs the filter and
blocker scene objects `traceBeam()` already supports but nothing
currently places.

**Needs a manual in-browser check**: Level 6's two branches — confirm
sliding+rotating the junction mirror picks a side, and the matching
branch mirror (also slide+rotate) completes the path to its receiver.

## Implementation progress

| System | State |
|---|---|
| Rendering & scene foundation | Done — `src/core/{renderer,camera,scene}.js`, `index.html`, `src/main.js` |
| Movement & raycast interaction | Done — `src/core/{input,look,movement,interaction,manipulation}.js` |
| Mirror & emitter system | Done — `src/gameplay/{mirror,emitter}.js` |
| Laser simulation & color composition | Done — `src/gameplay/{laser,laser-beam,laser-system}.js`, unit tested (`tests/unit/laser.test.js`) |
| Receiver & door logic | Done — `src/gameplay/{receiver,door,door-logic}.js`, `src/core/audio.js`; unit tested (`tests/unit/door-logic.test.js`, plus `isReceiverSatisfied` in `laser.test.js`) |
| Switch (laser-free one-shot toggle) | Done and manually playtested — `src/gameplay/switch.js`; reuses `door.js`/`door-logic.js` unchanged via the same `isActive()` shape as a receiver |
| Level system (declarative data + loader) | Done — `src/levels/{level-loader,level-manager,level-runtime}.js`; unit tested (`tests/unit/level-manager.test.js`). Only gameplay objects are level data — room geometry is still hardcoded (`docs/decisions/0005`) |
| Level-to-level exit trigger | Done and manually playtested — `src/levels/exit-trigger.js` (proximity to an open `exit: true` door, `docs/decisions/0006`), wired into `level-runtime.js`; unit tested (`tests/unit/exit-trigger.test.js`) |
| Portal system | Not started |
| Feedback / accessibility UI | Not started |
| Levels 1-10 | **Levels 1-5 done and manually verified, Level 6 done** (`src/levels/data/level-{1..6}.js`). Level 6's geometry is trace-verified but not yet manually played. Levels 7-10 not built |

## Known issues / blockers

None yet.

## Immediate next steps

1. Manually playtest Level 6 (see "Current focus" above), then build
   Level 7 ("Filtro") — this needs filter and blocker gameplay objects
   (level-loader.js has no `data.filters`/`data.blockers` handling yet;
   `traceBeam()` already supports the `filter`/`blocker` segment types,
   they just aren't instantiated by anything).
2. When authoring each real level's data, apply the receiver-placement
   constraint from `docs/findings.md` — a receiver must be the nearest
   segment along its beam's path, or it silently never activates. A
   level-load validation pass (trace each declared beam, flag receivers
   that aren't nearest) would catch this automatically and is worth
   building once there are enough levels that debugging this by hand gets
   painful.

## Known simplifications (not blockers)

- Room geometry (walls) is not level data — every level currently shares
  the same fixed room from `src/core/scene.js` (`docs/decisions/0005`).

## How to run

`python3 -m http.server` from the repo root, then open
`http://localhost:8000/` (ES modules don't load from `file://`; see
`docs/decisions/0001-three-via-cdn-import-map.md` for why Three.js is
loaded from a CDN import map instead of npm). Press `R` in-game to
restart the current level.

Run unit tests with `npm test` (Vitest — `npm install` first).
