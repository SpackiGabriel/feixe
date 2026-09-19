# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus

Level 1 ("Primeiros passos") is built and manually verified: the switch
toggles on aim+confirm and opens the exit door. Reaching the open exit now
also advances to the next level (`src/levels/exit-trigger.js`,
`docs/decisions/0006`) — levels are self-contained rooms with no real
physical passage between them, so this is a proximity check against the
open door, not literal wall-clipping. Next up: Levels 2-3
(mirror/emitter/receiver/door, no new gameplay objects needed), then the
Portal system.

**Needs a manual in-browser check**: the exit-trigger wiring itself
(walking up to the open Level 1 door and confirming the demo-level rig
loads next) hasn't been played through yet — only unit-tested
(`tests/unit/exit-trigger.test.js`) and syntax-checked. No headless-browser
tooling exists in this project to automate that check.

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
| Level-to-level exit trigger | Done — `src/levels/exit-trigger.js` (proximity to an open `exit: true` door, `docs/decisions/0006`), wired into `level-runtime.js`; unit tested (`tests/unit/exit-trigger.test.js`). Not yet manually playtested (see above) |
| Portal system | Not started |
| Feedback / accessibility UI | Not started |
| Levels 1-10 | **Level 1 done** (`src/levels/data/level-1.js`). Levels 2-10 not built yet |

## Known issues / blockers

None yet.

## Immediate next steps

1. Manually playtest the exit trigger in-browser (see "Current focus"
   above), then build Levels 2 and 3 ("Reflexo", "Ângulo") — they need no
   new gameplay objects, just mirror + emitter + receiver + door level
   data, and each door meant to end the level must set `exit: true`
   (`docs/decisions/0006`) or the level will never advance.
2. Filter and blocker scene objects don't exist yet — `traceBeam()`
   already supports those segment types (needed starting at level 7
   "Filtro" and level 9 "Circuito"), but nothing places them in a scene.
3. When authoring each real level's data, apply the receiver-placement
   constraint from `docs/findings.md` — a receiver must be the nearest
   segment along its beam's path, or it silently never activates. A
   level-load validation pass (trace each declared beam, flag receivers
   that aren't nearest) would catch this automatically and is worth
   building once there's more than one real level to validate.

## Known simplifications (not blockers)

- `src/levels/data/demo-level.js` is kept (loaded as level index 1, after
  the real Level 1) as the mirror/emitter/receiver/door rig used to
  validate the loader — it'll be replaced once Level 2 is built.
- Room geometry (walls) is not level data — every level currently shares
  the same fixed room from `src/core/scene.js` (`docs/decisions/0005`).

## How to run

`python3 -m http.server` from the repo root, then open
`http://localhost:8000/` (ES modules don't load from `file://`; see
`docs/decisions/0001-three-via-cdn-import-map.md` for why Three.js is
loaded from a CDN import map instead of npm). Press `R` in-game to
restart the current level.

Run unit tests with `npm test` (Vitest — `npm install` first).
