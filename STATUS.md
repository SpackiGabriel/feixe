# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus

Movement & raycast interaction is done. Next up: Mirror & emitter system
(see build order in `design/game-concept.md`).

## Implementation progress

| System | State |
|---|---|
| Rendering & scene foundation | Done — `src/core/{renderer,camera,scene}.js`, `index.html`, `src/main.js` |
| Movement & raycast interaction | Done — `src/core/{input,movement,interaction}.js` |
| Mirror & emitter system | Not started |
| Laser simulation & color composition | Designed (validated in `prototypes/mirror-reflection/`), not implemented |
| Receiver & door logic | Not started |
| Level system (declarative data + loader) | Not started |
| Portal system | Not started |
| Feedback / accessibility UI | Not started |
| Levels 1-10 | None built |

## Known issues / blockers

None yet.

## Immediate next steps

1. Build the mirror & emitter system (RF02, RF03): parent/pivot + child
   reflective-plate node pair, rail-constrained position and single-axis
   rotation, driven through the aim/select interaction already in place
   (`src/core/interaction.js`'s `interactiveObjects` list is currently
   empty — mirrors/emitters should register themselves into it).
2. When building the level loader, apply the receiver-placement
   constraint from `docs/findings.md`.

## How to run

`python3 -m http.server` from the repo root, then open
`http://localhost:8000/` (ES modules don't load from `file://`; see
`docs/decisions/0001-three-via-cdn-import-map.md` for why Three.js is
loaded from a CDN import map instead of npm).
