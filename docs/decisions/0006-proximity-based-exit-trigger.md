# 0006 — Level exit is proximity-based, not a physical passage

## Context

RF09 requires the game to advance through ten levels in a fixed sequence.
Each level's room is a shared, fixed-size box (`docs/decisions/0005`) whose
wall colliders (`src/core/scene.js`) are solid AABB strips covering each
wall's full extent — they don't carve out a gap at the door's position, and
a door's own mesh has no collider at all. Opening a door therefore changes
nothing about whether the player can physically walk past that wall: the
room stays a sealed box regardless of door state.

This matches the game's own scope: levels are ten independent,
self-contained rooms (`design/game-concept.md`'s anti-pillars — "not
open-world"), not physically adjoining spaces. There is no "next room" on
the other side of the wall to walk into; the next level is a completely
separate scene loaded fresh.

## Decision

"Walking through the open exit door" is detected as proximity, not
physical traversal: `src/levels/exit-trigger.js`'s `isPlayerAtExit` returns
true once the player is within `EXIT_TRIGGER_RADIUS` (1.2m,
`level-runtime.js`) of an *open* exit door's fixed XZ position. A door
opts in as the level's exit via `exit: true` in its level data
(`level-loader.js` picks it out as `currentLevel.exitDoor`).
`level-runtime.js`'s `update()` checks this every frame and calls
`load(currentIndex + 1)` once, guarded by an `exitTriggered` flag reset on
each `load()` so lingering at an open exit doesn't repeatedly reload.

## Alternatives considered

- **Carve real gaps in wall colliders at door positions**: rejected for
  now — it would require the room's collider system to know about
  level-specific door placement, contradicting ADR 0005's room-geometry-
  is-not-level-data stance, for a payoff (literal walking through) that
  the game's self-contained-rooms design doesn't need.

## Consequences

Any future door meant to end a level must set `exit: true` in its level
data, or the level will never advance (silent, not validated — same class
of gotcha as the receiver-placement one in `docs/findings.md`, worth a
load-time validation pass alongside that one if it starts causing
mistakes). Levels with multiple doors (e.g. level 10's AND/OR combination)
need exactly one marked `exit: true`; nothing currently enforces "exactly
one" at load time.
