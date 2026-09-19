# 0007 — Closed doors and blockers now physically block the player

## Context

Through level 7, a "closed" door or a `blocker` only affected the laser
simulation (`traceBeam()`) — `src/core/movement.js`'s collision list was
a single fixed set built once from `src/core/scene.js`'s room shell
(`docs/decisions/0005`) and never changed per level. Nothing stopped the
player from walking straight through a closed door or a blocker's mesh.

Level 8 ("Sequência", spec §11) needs this to matter for the first time:
"abrir a primeira [porta] exige uma configuração de espelhos que, se
mantida, impossibilita satisfazer a segunda" only teaches anything if the
player is physically forced through door 1 before they can reach door 2 —
otherwise nothing stops them from skipping straight to door 2's mirror
config and finishing immediately. Level 8 also needs a literal "parede
divisória" (dividing wall) that only a portal can bypass — meaningless if
the player can just walk around it.

## Decision

- `door.js` gains `getCollider()`: `null` while `isOpen()` is true,
  otherwise an AABB from the door's fixed closed-position footprint. It
  follows the door's live logical `open` state immediately, the same
  signal `isOpen()`/the exit trigger already use — not the slide
  animation's progress.
- `blocker.js` gains a `collider` (always present, blockers are static)
  and its `width`/`height`/`thickness` became configurable, so a level
  can build a full room-spanning divider out of one wide blocker instead
  of needing several.
- Both share `src/gameplay/aabb.js`'s `rotatedRectAABB()` (pure, unit
  tested) to turn a rotated rectangle into an AABB, since
  `movement.js`'s collision check only understands axis-aligned rects.
- `movement.js` now takes a second collider source — `getLevelColliders`,
  a callback returning the *current* level's live colliders — alongside
  the static room shell, called fresh every frame since which doors are
  open changes at runtime. A `null` slot (an open door) is skipped.
- `level-runtime.js` owns this: blockers' colliders are collected once
  per `load()` (static), and each door's slot is overwritten in place
  every `update()` (dynamic) — the array itself is never reallocated
  per-frame (render-loop no-allocation rule,
  `.claude/rules/code-conventions.md`).

## Alternatives considered

- **Ship level 8 as a "soft" puzzle**: build the intended mirror-
  reconfiguration/portal layout without real blocking, document that a
  player *can* skip straight to door 2. Rejected — asked the user, who
  preferred real gating, partly because blockers will need this again for
  a literal "avoid this obstacle" puzzle once one appears alongside a
  mirror (level 9, per `docs/findings.md`'s blocker-reachability entry).

## Consequences

RF07's door animation requirement now also has real teeth for movement,
not just visuals — but every future level with a non-exit door or a
blocker needs to be authored with this in mind: a closed door blocking
the *only* path to something the player needs will soft-lock the level.
Note that raycast-based interaction (aiming at a mirror) is **not**
gated by this — `interaction.js`'s raycaster only tests the
`interactiveObjects` array, not general scene occlusion, so a mirror
behind a closed door or wall can still be selected and manipulated from
a distance if the aim ray geometrically lines up. Movement is gated;
manipulation is not.
