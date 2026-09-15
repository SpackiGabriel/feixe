# Technical Preferences

<!-- Populated by /setup-engine. Updated as the user makes decisions throughout development. -->
<!-- All agents reference this file for project-specific standards and conventions. -->

## Engine & Language

- **Engine**: Three.js r186
- **Language**: JavaScript (ES modules)
- **Rendering**: WebGLRenderer, PerspectiveCamera, forward rendering, no post-processing pipeline
- **Physics**: None — custom raycast-based collision (AABB vs. static geometry) per spec §4, no physics engine

## Input & Platform

<!-- Written by /setup-engine. Read by /ux-design, /ux-review, /test-setup, /team-ui, and /dev-story -->
<!-- to scope interaction specs, test helpers, and implementation to the correct input methods. -->

- **Target Platforms**: Web (desktop browser)
- **Input Methods**: Keyboard/Mouse
- **Primary Input**: Keyboard/Mouse (WASD translate + mouse look, per spec §4)
- **Gamepad Support**: None
- **Touch Support**: None
- **Platform Notes**: Pointer Lock API for mouse-look; no on-screen touch controls needed.

## Naming Conventions

- **Classes**: PascalCase (e.g., `MirrorNode`, `LaserEmitter`)
- **Variables**: camelCase (e.g., `moveSpeed`)
- **Signals/Events**: camelCase, present tense (e.g., `onReceiverActivated`)
- **Files**: kebab-case matching module (e.g., `laser-emitter.js`)
- **Scenes/Prefabs**: N/A — levels are declarative data objects (spec §10), not scene files
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_REFLECTIONS`)

## Performance Budgets

- **Target Framerate**: 60 fps (spec NFR "Desempenho")
- **Frame Budget**: 16.6ms
- **Draw Calls**: Low — small reused mesh set (wall/floor/mirror/emitter/receiver/door), instanced where possible
- **Memory Ceiling**: Not specified — modest hardware target per spec NFR

## Testing

- **Framework**: [TO BE CONFIGURED — spec does not mandate one; recommend Vitest if unit tests are added for laser raycasting/logic]
- **Minimum Coverage**: [TO BE CONFIGURED]
- **Required Tests**: Laser reflection/raycast math, color composition (AND/OR/NOT logic), door/receiver state logic

## Forbidden Patterns

<!-- Add patterns that should never appear in this project's codebase -->
- [None configured yet — add as architectural decisions are made]

## Allowed Libraries / Addons

<!-- Add approved third-party dependencies here -->
- three (r186) — core rendering library

## Architecture Decisions Log

<!-- Quick reference linking to full ADRs in docs/architecture/ -->
- [No ADRs yet — use /architecture-decision to create one]

## Engine Specialists

<!-- Written by /setup-engine when engine is configured. -->
<!-- Read by /code-review, /architecture-decision, /architecture-review, and team skills -->
<!-- to know which specialist to spawn for engine-specific validation. -->

- **Primary**: engine-programmer (no dedicated Three.js specialist exists in this framework)
- **Language/Code Specialist**: engine-programmer (rendering/scene-graph code), gameplay-programmer (puzzle/interaction logic)
- **Shader Specialist**: technical-artist (only if custom GLSL materials are added — spec does not require any)
- **UI Specialist**: ui-programmer (minimal — no HUD beyond level/progress indicator per spec)
- **Additional Specialists**: None
- **Routing Notes**: Route rendering, scene graph, raycasting, and camera code to engine-programmer. Route puzzle rule logic (color composition, doors, level state) to gameplay-programmer. Route level layout/pacing (the 10-level data files) to level-designer for review, not implementation.

### File Extension Routing

<!-- Skills use this table to select the right specialist per file type. -->
<!-- If a row says [TO BE CONFIGURED], fall back to Primary for that file type. -->

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (.js — rendering/scene) | engine-programmer |
| Game code (.js — puzzle/interaction logic) | gameplay-programmer |
| Shader / material files (.glsl, ShaderMaterial) | technical-artist |
| UI / screen files (.html, .css) | ui-programmer |
| Scene / prefab / level files (level data objects) | level-designer (design review), gameplay-programmer (implementation) |
| Native extension / plugin files | N/A |
| General architecture review | engine-programmer |
