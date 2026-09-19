# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus

Rendering & scene foundation is done. Next up: Movement & raycast
interaction (see build order in `design/game-concept.md`).

## Implementation progress

| System | State |
|---|---|
| Rendering & scene foundation | Done — `src/core/{renderer,camera,scene}.js`, `index.html`, `src/main.js` |
| Movement & raycast interaction | Not started |
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

1. Build movement & raycast interaction: WASD translate + mouse look
   (Pointer Lock), AABB-vs-static-geometry collision, and the
   raycasting groundwork for mirror/emitter selection (RF01, RF04
   partial).
2. When building the level loader, apply the receiver-placement
   constraint from `docs/findings.md`.

## How to run

`python3 -m http.server` from the repo root, then open
`http://localhost:8000/` (ES modules don't load from `file://`; see
`docs/decisions/0001-three-via-cdn-import-map.md` for why Three.js is
loaded from a CDN import map instead of npm).
