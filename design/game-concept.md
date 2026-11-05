# Feixe — working concept

*Full requirements: `feixe-especificacao.pdf` (authoritative, closed,
never edited). This file translates the spec into working vocabulary for
implementation — it does not restate it. Section refs below point at the
PDF.*

## What it is

First-person 3D puzzle game: aim colored lasers through movable mirrors
into receivers to open doors, across 10 fixed levels (spec §1). The
mechanic is a direct physical metaphor for logic operators — AND
(convergence), OR (multi-receiver door), NOT (blocker) — taught with zero
on-screen symbols (spec §12).

## Pillars

1. **One mechanic, explored in depth.** Everything routes through
   light/reflection/color. *Test: if a feature doesn't route through
   laser/mirror/color/logic, cut it.*
2. **Logic without symbols.** Every operator is taught through direct
   manipulation, never a symbol/formula/technical term (spec §12).
3. **Scaffolded difficulty.** Each level after the first adds at most one
   new concept (spec §11). *Test: if a level needs two new rules at once,
   split it.*
4. **No twitch skill required.** Difficulty is spatial/logical, never
   reflex-based — snap-to-rail placement, no timers (spec §3).

**Anti-pillars**: not an action game (no combat/enemies/fail states beyond
soft restart), not open-world (10 fixed self-contained rooms), not
visually realistic (minimalist, no GI/ray tracing — spec §14 excludes
these), not narrative-driven (no story/characters/dialogue — spec scopes
this out entirely).

## Explicitly out of scope

Per spec §14: realistic rigid-body physics, real-time global
illumination/ray tracing, portal see-through rendering (portals are opaque
directional teleports only, spec §9), multiplayer, a level editor for
players, enemy/NPC AI, procedural level generation. Don't add any of
these, or infrastructure toward them, even if it seems like natural
polish — the spec explicitly rules them out as out of scope for the
course's evaluation.

## Build order

Dependency order, foundation → feature (validated by prototype, see
`docs/findings.md`):

1. Rendering & scene foundation (renderer, camera, base meshes)
2. Movement & raycast interaction (RF01, RF04 partial)
3. Mirror & emitter system (RF02, RF03)
4. Laser simulation & color composition (RF04, RF05) — highest technical
   risk; validated in `prototypes/mirror-reflection/`
5. Receiver & door logic (RF06, RF07)
6. Level system — declarative level data + shared scene constructor
   (RF08, RF09)
7. Portal system (spec §9 — introduced level 8+ only)
8. Feedback/accessibility UI — color-blind symbols, activation feedback
   (RF10, spec §3)

**Current implementation state**: see `STATUS.md` (and the code) for what's
actually done — this file describes intent and order, not progress.
