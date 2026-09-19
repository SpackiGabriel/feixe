# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus

Levels 1-3 are built. Level 1 ("Primeiros passos") is fully manually
verified end to end, including the exit trigger advancing to the next
level. Levels 2 ("Reflexo") and 3 ("Ângulo") are real declarative data
reusing the existing mirror/emitter/receiver/door systems — no new
gameplay objects needed — but their specific mirror-bounce geometry
hasn't been played through yet. Next up: manually verify 2-3, then build
Level 4 ("Duas cores"), or the Portal system.

**Needs a manual in-browser check**: Level 2's slide-to-intercept mirror
puzzle and Level 3's rotate-to-align mirror puzzle — the reflection math
itself is unit-tested (`tests/unit/laser.test.js`) and validated by the
prototype, but the specific positions/angles chosen for these two levels
haven't been played through. No headless-browser tooling exists in this
project to automate that check.

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
| Levels 1-10 | **Levels 1-3 done** (`src/levels/data/level-{1,2,3}.js`). Level 1 manually verified; Levels 2-3 not yet (see above). Levels 4-10 not built |

## Known issues / blockers

None yet.

## Immediate next steps

1. Manually playtest Levels 2 and 3 in-browser (see "Current focus"
   above), then build Level 4 ("Duas cores") — two emitters/receivers,
   independent colors, no new gameplay objects needed either.
2. Filter and blocker scene objects don't exist yet — `traceBeam()`
   already supports those segment types (needed starting at level 7
   "Filtro" and level 9 "Circuito"), but nothing places them in a scene.
3. When authoring each real level's data, apply the receiver-placement
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
