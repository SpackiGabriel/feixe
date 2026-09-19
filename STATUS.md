# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus

Nothing is implemented yet. Next up: Rendering & Scene Foundation (see
build order in `design/game-concept.md`).

## Implementation progress

| System | State |
|---|---|
| Rendering & scene foundation | Not started |
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

1. Set up `src/` (created on first real implementation file — see
   `.claude/docs/directory-structure.md`) and stand up the Three.js
   renderer/scene/camera.
2. When building the level loader, apply the receiver-placement
   constraint from `docs/findings.md`.
