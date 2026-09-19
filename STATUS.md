# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus

Laser simulation & color composition is done. There's a TEMPORARY demo
rig (`src/levels/demo.js`, one mirror + one emitter) standing in for the
level loader so the system is actually visible in the running game — it's
not real level content and should be deleted once the level system exists.
Next up: Receiver & door logic (see build order in `design/game-concept.md`).

## Implementation progress

| System | State |
|---|---|
| Rendering & scene foundation | Done — `src/core/{renderer,camera,scene}.js`, `index.html`, `src/main.js` |
| Movement & raycast interaction | Done — `src/core/{input,look,movement,interaction,manipulation}.js` |
| Mirror & emitter system | Done — `src/gameplay/{mirror,emitter}.js` |
| Laser simulation & color composition | Done — `src/gameplay/{laser,laser-beam,laser-system}.js`, unit tested (`tests/unit/laser.test.js`); receiver/filter/blocker segment types exist in the tracer but nothing places them in the scene yet |
| Receiver & door logic | Not started |
| Level system (declarative data + loader) | Not started |
| Portal system | Not started |
| Feedback / accessibility UI | Not started |
| Levels 1-10 | None built |

## Known issues / blockers

None yet.

## Immediate next steps

1. Build receiver & door logic (RF06/RF07): a receiver object that reacts
   (visual/audio pulse) when `composeReceiverColor()` (in
   `src/gameplay/laser.js`) matches its target color, and a door that
   opens/closes based on AND/OR over a set of receivers. Blocker and
   filter segment types already exist in `traceBeam()` — this slice adds
   the actual scene objects for `receiver`/`filter`/`blocker`/`door`.
2. When building the level loader (item 6), apply the receiver-placement
   constraint from `docs/findings.md`, and replace `src/levels/demo.js`
   with real declarative level data.

## How to run

`python3 -m http.server` from the repo root, then open
`http://localhost:8000/` (ES modules don't load from `file://`; see
`docs/decisions/0001-three-via-cdn-import-map.md` for why Three.js is
loaded from a CDN import map instead of npm).

Run unit tests with `npm test` (Vitest — `npm install` first).
