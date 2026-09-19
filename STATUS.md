# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus

Mirror & emitter system is done (as reusable modules, not yet placed in
any level — there's no level loader yet). Next up: Laser simulation &
color composition (see build order in `design/game-concept.md`).

## Implementation progress

| System | State |
|---|---|
| Rendering & scene foundation | Done — `src/core/{renderer,camera,scene}.js`, `index.html`, `src/main.js` |
| Movement & raycast interaction | Done — `src/core/{input,look,movement,interaction,manipulation}.js` |
| Mirror & emitter system | Done — `src/gameplay/{mirror,emitter}.js`; not yet instantiated by any level |
| Laser simulation & color composition | Designed (validated in `prototypes/mirror-reflection/`), not implemented |
| Receiver & door logic | Not started |
| Level system (declarative data + loader) | Not started |
| Portal system | Not started |
| Feedback / accessibility UI | Not started |
| Levels 1-10 | None built |

## Known issues / blockers

None yet.

## Immediate next steps

1. Build laser simulation & color composition (RF04, RF05) — trace each
   emitter's beam through successive mirror reflections each frame,
   render it as a thin emissive polyline, and compose additive color
   where beams converge. Highest technical risk item; validated
   separately in `prototypes/mirror-reflection/`. Mirror plates now
   expose their orientation via `plate.rotation.y` / world quaternion for
   the reflection math to read.
2. `src/core/interaction.js`'s `interactiveObjects` list is still empty —
   nothing places mirrors/emitters into the running scene yet. That's the
   level system's job (item 6 in the build order); wire it up once that
   or a temporary test level exists.
3. When building the level loader, apply the receiver-placement
   constraint from `docs/findings.md`.

## How to run

`python3 -m http.server` from the repo root, then open
`http://localhost:8000/` (ES modules don't load from `file://`; see
`docs/decisions/0001-three-via-cdn-import-map.md` for why Three.js is
loaded from a CDN import map instead of npm).
