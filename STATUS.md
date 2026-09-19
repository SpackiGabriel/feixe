# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus

Receiver & door logic is done. The TEMPORARY demo rig (`src/levels/demo.js`)
now has a full loop: emitter → mirror → receiver → door — still just a
placeholder standing in for the level loader, not real level content.
Next up: Level system (declarative data + loader) — see build order in
`design/game-concept.md`.

## Implementation progress

| System | State |
|---|---|
| Rendering & scene foundation | Done — `src/core/{renderer,camera,scene}.js`, `index.html`, `src/main.js` |
| Movement & raycast interaction | Done — `src/core/{input,look,movement,interaction,manipulation}.js` |
| Mirror & emitter system | Done — `src/gameplay/{mirror,emitter}.js` |
| Laser simulation & color composition | Done — `src/gameplay/{laser,laser-beam,laser-system}.js`, unit tested (`tests/unit/laser.test.js`) |
| Receiver & door logic | Done — `src/gameplay/{receiver,door,door-logic}.js`, `src/core/audio.js`; unit tested (`tests/unit/door-logic.test.js`, plus `isReceiverSatisfied` in `laser.test.js`). Filter/blocker segment types still exist only in the tracer — no scene object for them yet |
| Level system (declarative data + loader) | Not started |
| Portal system | Not started |
| Feedback / accessibility UI | Not started |
| Levels 1-10 | None built |

## Known issues / blockers

None yet.

## Immediate next steps

1. Build the level system (RF08/RF09): declarative level data (walls,
   mirrors, emitters, receivers, doors — one file per level under
   `src/levels/`) plus a shared scene constructor that interprets that
   data into the scene graph, replacing `src/levels/demo.js`. Apply the
   receiver-placement constraint from `docs/findings.md` when authoring
   real levels (a level-load validation pass would catch it automatically
   — worth doing here).
2. Filter and blocker scene objects don't exist yet — `traceBeam()`
   already supports those segment types, but nothing places them. Add
   them either as part of the level system slice or as a small follow-up,
   whichever the level data schema needs first.

## Known simplifications (not blockers)

- `src/levels/demo.js` is a hardcoded single-mirror/single-emitter/
  single-receiver/single-door rig, not a real level — delete it once the
  level system exists.

## How to run

`python3 -m http.server` from the repo root, then open
`http://localhost:8000/` (ES modules don't load from `file://`; see
`docs/decisions/0001-three-via-cdn-import-map.md` for why Three.js is
loaded from a CDN import map instead of npm).

Run unit tests with `npm test` (Vitest — `npm install` first).
