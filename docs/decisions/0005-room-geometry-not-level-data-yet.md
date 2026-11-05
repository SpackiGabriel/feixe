# 0005 — Room geometry stays hardcoded; level data only covers gameplay objects

> **Partly superseded (2026-11-05):** levels now declare interior `walls`
> (`{ from: [x,z], to: [x,z], height?, thickness? }`, `src/gameplay/wall.js`),
> which absorb beams and block the player. Level 8's divider uses it. The
> outer 10×10 room shell is still fixed and shared, as below.

## Context

`design/game-concept.md`'s anti-pillars describe the game as "not
open-world (10 fixed self-contained rooms)," which could be read as each
level having its own distinct room shape/size. Spec §10 (RF08) requires
every level to be described by declarative data interpreted by a shared
scene constructor, listing "paredes, espelhos, emissores, receptores,
portas, filtros e portais" (walls included) as level-data content.

Building the level system this slice, though, the ten level descriptions
in spec §11 never call out a room shape or size — every level is
distinguished by its gameplay object layout (mirrors, emitters, receivers,
filters, blockers, portals), not by room geometry. Level 10 ("Prisma")
even explicitly happens "em uma única sala" (in a single room).

## Decision

For now, `src/core/scene.js`'s room (floor + 4 walls, fixed 10×10 size)
stays hardcoded, shared across every level. `src/levels/level-loader.js`'s
`instantiateLevel()`/`disposeLevel()` only create/destroy gameplay objects
(mirrors, emitters, receivers, doors) each level/restart — the room itself
is never rebuilt. Level data (`src/levels/data/*.js`) has no `walls` field
yet, even though RF08's own wording lists walls as level content.

## Alternatives considered

- **Make walls part of level data now**, per RF08's literal wording:
  rejected as premature — nothing in the ten level descriptions needs a
  non-default room, so this would be schema/loader complexity for a
  requirement no actual level currently exercises. Add it if and when a
  level needs a different room shape.

## Consequences

Every level currently plays out in the same fixed room. If a future level
(building out "Levels 1-10") genuinely needs a different room shape,
`instantiateLevel()`/`disposeLevel()` will need to grow a `walls` field
and rebuild the room per level too — that's a bigger change than adding
one more gameplay-object type, since `src/core/scene.js`'s room isn't
currently torn down on restart at all. Revisit then, not speculatively now.
