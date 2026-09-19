# Technical Preferences

## Engine & Language

- **Engine**: Three.js r186
- **Language**: JavaScript (ES modules)
- **Rendering**: WebGLRenderer, PerspectiveCamera, forward rendering, no post-processing pipeline
- **Physics**: None — custom raycast-based collision (AABB vs. static geometry) per spec §4, no physics engine

## Input & Platform

- **Target Platforms**: Web (desktop browser)
- **Primary Input**: Keyboard/Mouse (WASD translate + mouse look, per spec §4)
- **Gamepad / Touch Support**: None — out of scope, not a spec requirement
- **Platform Notes**: Pointer Lock API for mouse-look; no on-screen touch controls needed

## Naming Conventions

- **Classes**: PascalCase (e.g., `MirrorNode`, `LaserEmitter`)
- **Variables**: camelCase (e.g., `moveSpeed`)
- **Files**: kebab-case matching module (e.g., `laser-emitter.js`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_REFLECTIONS`)
- **Levels**: declarative data objects (spec §10), not scene files

## Performance Budgets

- **Target Framerate**: 60 fps (spec NFR "Desempenho")
- **Frame Budget**: 16.6ms
- **Draw Calls**: Low — small reused mesh set (wall/floor/mirror/emitter/receiver/door), instanced where possible

## Testing

See `.claude/rules/test-standards.md`. No framework chosen yet — pick one
(e.g. Vitest) when the first unit test is actually written, not before.
Required coverage per spec: laser reflection/raycast math, color
composition (AND/OR/NOT), door/receiver state logic.

## Allowed Libraries

- `three` (r186) — the only dependency. No build step, no bundler.

## Code conventions

See `.claude/rules/code-conventions.md` — the single source, not
duplicated here.
