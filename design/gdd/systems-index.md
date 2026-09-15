# Systems Index: Feixe

> **Status**: Approved
> **Created**: 2026-09-15
> **Last Updated**: 2026-09-15
> **Source Concept**: design/gdd/game-concept.md

---

## Overview

Feixe is a single first-person 3D puzzle mechanic (aim, place, and rotate
mirrors/emitters to route colored lasers into receivers, opening doors)
explored across 10 fixed levels. The mechanical scope is deliberately narrow
per the game pillars: everything routes through light, reflection, and
color. The systems below break that single mechanic into buildable layers —
from raw scene rendering up through the puzzle logic (AND/OR/NOT via color
composition) to the declarative level data that assembles all 10 rooms.

---

## Systems Enumeration

| # | System Name | Category | Priority | Status | Design Doc | Depends On |
|---|-------------|----------|----------|--------|------------|------------|
| 1 | Rendering & Scene Foundation | Core | MVP | Not Started | — | — |
| 2 | Movement & Interaction | Core | MVP | Not Started | — | Rendering & Scene Foundation |
| 3 | Mirror & Emitter System | Gameplay | MVP | Not Started | — | Rendering & Scene Foundation, Movement & Interaction |
| 4 | Laser Simulation & Color System | Gameplay | MVP | Not Started | — | Mirror & Emitter System |
| 5 | Receiver & Door Logic | Gameplay | MVP | Not Started | — | Laser Simulation & Color System |
| 6 | Level System | Persistence | Vertical Slice | Not Started | — | Mirror & Emitter System, Laser Simulation & Color System, Receiver & Door Logic |
| 7 | Portal System | Gameplay | Alpha | Not Started | — | Laser Simulation & Color System, Movement & Interaction |
| 8 | Feedback & Accessibility UI | UI | MVP (minimal) / Vertical Slice (full) | Not Started | — | Receiver & Door Logic, Laser Simulation & Color System |

---

## Categories

| Category | Description | Typical Systems |
|----------|-------------|-----------------|
| **Core** | Foundation systems everything depends on | Rendering, camera, movement, raycast interaction |
| **Gameplay** | The systems that make the puzzle work | Mirrors/emitters, laser simulation, color logic, receivers/doors, portals |
| **Persistence** | Save state and continuity | Level data schema, scene construction, local level-completion save |
| **UI** | Player-facing information displays | Receiver/door feedback, color-blind symbols, minimal level HUD |

*(Progression, Economy, Audio-as-a-system, Narrative, Meta categories from the
template are omitted — not applicable to this scope per the game pillars.)*

---

## Priority Tiers

| Tier | Definition | Target Milestone | Design Urgency |
|------|------------|------------------|----------------|
| **MVP** | Movement + raycast select + one mirror + one emitter + one receiver + one door, single-color, no logic composition. Proves the core loop end-to-end. | First playable (levels 1-3 equivalent) | Design FIRST |
| **Vertical Slice** | Add color composition (AND via convergence), subtractive filters, and the declarative Level System — enough to build and play Levels 1-5 (all tutorials). | Levels 1-5 playable | Design SECOND |
| **Alpha** | Add OR logic (multi-receiver doors), blockers (NOT), and the Portal System — enough to build Levels 6-9. | Levels 1-9 playable | Design THIRD |
| **Full Vision** | Level 10 (full synthesis), accessibility polish (color-blind symbol legibility pass), all NFRs (60fps, persistence). | Full delivery | Design as needed |

---

## Dependency Map

### Foundation Layer (no dependencies)

1. **Rendering & Scene Foundation** — renderer/camera/lighting setup and the shared base meshes everything else instances.
2. **Movement & Interaction** — first-person movement and raycast aim/select; needs objects in the scene to select, but is designed as its own foundational input/interaction layer.

### Core Layer (depends on foundation)

1. **Mirror & Emitter System** — depends on: Rendering & Scene Foundation, Movement & Interaction (for placement/rotation manipulation input)
2. **Laser Simulation & Color System** — depends on: Mirror & Emitter System (needs mirror/emitter transforms to trace reflections against)
3. **Receiver & Door Logic** — depends on: Laser Simulation & Color System (needs beam-hit events and resolved colors to evaluate)

### Feature Layer (depends on core)

1. **Level System** — depends on: Mirror & Emitter System, Laser Simulation & Color System, Receiver & Door Logic (must declaratively instantiate all of the above per level)
2. **Portal System** — depends on: Laser Simulation & Color System (beam redirection), Movement & Interaction (player teleport)

### Presentation Layer (depends on features)

1. **Feedback & Accessibility UI** — depends on: Receiver & Door Logic, Laser Simulation & Color System (displays their state: activation, color-blind symbol per beam color)

### Polish Layer (depends on everything)

*(None — scope is deliberately fixed with no polish-tier meta-systems, per game pillars.)*

---

## Recommended Design Order

| Order | System | Priority | Layer | Agent(s) | Est. Effort |
|-------|--------|----------|-------|----------|-------------|
| 1 | Rendering & Scene Foundation | MVP | Foundation | engine-programmer | S |
| 2 | Movement & Interaction | MVP | Foundation | engine-programmer | S |
| 3 | Mirror & Emitter System | MVP | Core | gameplay-programmer, engine-programmer | M |
| 4 | Laser Simulation & Color System | MVP | Core | engine-programmer, gameplay-programmer | L |
| 5 | Receiver & Door Logic | MVP | Core | gameplay-programmer | M |
| 6 | Level System | Vertical Slice | Feature | gameplay-programmer, level-designer | M |
| 7 | Feedback & Accessibility UI | MVP (minimal) | Presentation | ui-programmer | S |
| 8 | Portal System | Alpha | Feature | gameplay-programmer | S |

---

## Circular Dependencies

- None found.

---

## High-Risk Systems

| System | Risk Type | Risk Description | Mitigation |
|--------|-----------|-----------------|------------|
| Laser Simulation & Color System | Technical | Per-frame reflection recomputation must stay within the O(reflections × emitters) budget at 60fps (spec NFR "Desempenho"); it's also the dependency bottleneck — 3 other systems build on it. | **Prototyped** (`prototypes/mirror-reflection/`) — reflection formula validated for arbitrary mirror angles; additive color convergence at a shared receiver confirmed; filters/blockers confirmed as pure pass/stop gates. Finding to carry into the GDD: receivers must be the *nearest* segment along a beam's path, or the beam silently continues past them to the next mirror/wall — the Level System's level-data schema needs a placement constraint or validation lint for this. |
| Level System | Scope | Declarative level schema must cleanly express all 10 levels' variety (rails vs. discrete encaixes, free vs. 45° rotation, portals) without becoming a one-off per level. | Design the schema against Level 10 ("Prisma", the union of all mechanics) first, not just Level 1, to avoid a late rewrite. |

---

## Progress Tracker

| Metric | Count |
|--------|-------|
| Total systems identified | 8 |
| Design docs started | 0 |
| Design docs reviewed | 0 |
| Design docs approved | 0 |
| MVP systems designed | 0/6 |
| Vertical Slice systems designed | 0/1 (Level System; MVP systems get color/filter extensions added at this tier, not new docs) |

---

## Next Steps

- [x] Review and approve this systems enumeration
- [ ] Prototype the highest-risk system first (`/prototype mirror-reflection`) before authoring its GDD
- [ ] Design MVP-tier systems in order (`/design-system rendering-scene-foundation`, then `movement-interaction`, etc.)
- [ ] Run `/design-review` on each completed GDD
- [ ] Run `/gate-check pre-production` when MVP systems are designed
