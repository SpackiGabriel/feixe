---
paths:
  - "src/**"
---

# Code Conventions

Three.js (r186, WebGLRenderer) / plain ES modules, no build step. This is
the single source for code conventions — don't duplicate this content
elsewhere; if something here needs to change, change it here.

## Naming (per `.claude/docs/technical-preferences.md`)

- Classes: PascalCase (`MirrorNode`, `LaserEmitter`)
- Variables/functions: camelCase (`moveSpeed`)
- Files: kebab-case matching the module (`laser-emitter.js`)
- Constants: UPPER_SNAKE_CASE (`MAX_REFLECTIONS`)

## Data-driven values

Gameplay-tunable numbers (reflection limits, move speed, colors, level
layout) belong in level data (`src/levels/data/level-N.js`, plain JS
objects) or a named constant, not inline magic numbers in `src/`. This is
so `src/gameplay/` code reads the same for every level instead of
branching on level number. Shared level values (room size, beam height)
live in `src/levels/data/constants.js` — don't re-declare them per level.

## Render loop

Avoid allocating new objects (`new THREE.Vector3()`, arrays, etc.) inside
`requestAnimationFrame`/render-loop code *where it's free to avoid* —
reuse pre-allocated vectors and mutate in place (see `mirror.js`,
`door.js`, `laser-beam.js`). Exception: `laser.js`'s `traceBeam` is
deliberately written as small pure functions that return `{x,z}` objects;
it's bounded (≤ `MAX_REFLECTIONS` bounces per beam, 1-2 beams per level)
and fully unit-tested, so don't rewrite it for zero-allocation unless a
profile shows jank (spec NFR "Desempenho" — 60fps).

## Structure

- Prefer plain functions and small modules over singletons/global mutable
  state, when it's free to do so — but don't introduce a DI framework or
  abstract interfaces for a two-person project with one implementation of
  everything. If there's only ever going to be one `LaserSimulator`, it
  doesn't need to be injectable.
- Raycasting/selection logic belongs with the interaction/input code, not
  duplicated per-object.
- A mirror is a parent (base/pivot) + child (reflective plate) node pair
  (spec §5) — this is the one place hierarchical transforms are load-bearing;
  don't flatten it into a single mesh with manual math.

## What NOT to do

- No mandatory gamepad support, no standalone localization system — out of
  scope per the spec (keyboard/mouse only, Portuguese UI is fine as
  written). Color-blind accessibility is handled via the spec's own
  geometric-symbol requirement (§3), not a separate accessibility system.
- No API-deprecation periods, thread-safety documentation, or
  backward-compatibility shims — there's one version of this codebase, two
  people maintaining it, and a fixed deadline. If something needs to
  change, change it.

## Example

```js
// good: reused scratch vector, no per-frame allocation
const _scratch = new THREE.Vector3();
function reflectInPlace(dir, normal) {
  _scratch.copy(normal).multiplyScalar(2 * dir.dot(normal));
  return dir.sub(_scratch).normalize();
}
```
