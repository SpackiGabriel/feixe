# Game Concept: Feixe

*Created: 2026-09-15*
*Status: Approved (fixed by `feixe-especificacao.pdf`, the delivered project spec)*
*Source of truth*: `feixe-especificacao.pdf` — this document translates that spec into the
game-studio template format. If the two ever disagree, the PDF wins; update this file instead.

---

## Elevator Pitch

> It's a first-person 3D puzzle game where you aim colored lasers through movable
> mirrors to open doors, teaching logical reasoning (AND/OR/NOT) without ever
> showing a symbol or formula.

---

## Core Identity

| Aspect | Detail |
| ---- | ---- |
| **Genre** | First-person 3D puzzle |
| **Platform** | Web (desktop browser) |
| **Target Audience** | Course instructor/evaluator (grading defense) — see spec's evaluation rubric, not a commercial audience |
| **Player Count** | Single-player, no NPCs |
| **Session Length** | One sitting, ~10 levels, short (est. 15-30 min full playthrough) |
| **Monetization** | N/A — academic deliverable, not commercial |
| **Estimated Scope** | Small — one deliberately narrow mechanic (light, reflection, color) explored deeply across 10 levels, per spec §1 |
| **Comparable Titles** | *The Witness* (laser panels), *Talos Principle* (light-beam puzzles), *Portal* (portal pair mechanic, used sparingly here per spec §9) |

---

## Core Fantasy

You are a quiet architect of light: every room is solved by seeing how colors combine
and cancel, not by reflexes or memorization. The satisfaction comes from mentally
tracing a beam's path before ever touching a mirror — planning, not fumbling.

---

## Unique Hook

Every puzzle mechanic (mirror, filter, blocker, portal, door rule) is a literal,
walkable metaphor for a logical operator (AND = color convergence, OR = either
receiver, NOT = blocker, composition = multi-step circuits) — taught entirely
through direct manipulation, with zero on-screen symbols or jargon (spec §12).

---

## Player Experience Analysis (MDA Framework)

### Target Aesthetics (What the player FEELS)

| Aesthetic | Priority | How We Deliver It |
| ---- | ---- | ---- |
| **Sensation** | 3 | Colored light in dark rooms — high-contrast, satisfying visual/audio confirmation on receiver activation (RF06) |
| **Fantasy** | N/A | No role-play framing — abstract puzzle space |
| **Narrative** | N/A | No story; spec explicitly scopes narrative out |
| **Challenge** | 1 | Core aesthetic — planning a full reflection/color circuit before acting (spec §11, level 10 "Prisma") |
| **Fellowship** | N/A | Single-player only |
| **Discovery** | 2 | Each tutorial level (1-5) introduces exactly one new rule (spec §11 scaffolding) |
| **Expression** | N/A | No customization or creative tools |
| **Submission** | N/A | Not a relaxation-focused game |

### Key Dynamics (Emergent player behaviors)

- Players will mentally trace the full beam path (including reflections and color
  composition) *before* touching any mirror, once puzzles get complex enough
  (levels 8-10) — this is the intended "aha" behavior per spec §11.
- Players will discover that adjusting one mirror for one condition can break a
  previously-satisfied condition elsewhere, forcing holistic replanning (spec, Level 10 "Prisma").

### Core Mechanics (Systems we build)

1. First-person navigation + raycast-based aim-and-select interaction (spec §4, RF01)
2. Mirror/emitter placement and rotation on constrained rails/pivots (spec §5-6, RF02-RF03)
3. Real-time laser path simulation with additive color mixing and subtractive filtering (spec §4/§7, RF04-RF05)
4. Receiver/door logic evaluating AND/OR conditions (spec §8, RF06-RF07)
5. Declarative level data + shared scene constructor (spec §10, RF08-RF09)

---

## Player Motivation Profile

*Note: SDT/PENS and Bartle framing below are filled for template completeness; this
is a graded academic deliverable, not a live product, so these have low design weight
compared to satisfying the spec's four axes and evaluation rubric.*

### Primary Psychological Needs Served

| Need | How This Game Satisfies It | Strength |
| ---- | ---- | ---- |
| **Autonomy** | Player freely repositions any unlocked mirror/emitter at any time; no forced sequence | Supporting |
| **Competence** | Solving a level = correctly reasoning through a logic circuit spatially | Core |
| **Relatedness** | N/A — no social feature | Minimal |

### Player Type Appeal (Bartle Taxonomy)

- [x] **Achievers** — completing all 10 levels in sequence — How: fixed level progression, door opens on completion (spec §8)
- [x] **Explorers** — understanding *why* a rule works (e.g., why filter order doesn't matter) — How: sandbox-like freedom to move pieces and observe cause/effect
- [ ] **Socializers** — N/A
- [ ] **Killers/Competitors** — N/A

### Flow State Design

- **Onboarding curve**: Level 1 has no laser at all — just movement + a switch, isolating the control scheme first (spec §11, Level 1 "Primeiros passos")
- **Difficulty scaling**: One new rule per tutorial level (1-5), then composition of known rules with rising complexity (6-9), then full synthesis (10) — spec §11/§12
- **Feedback clarity**: Receivers give immediate visual+audio confirmation (RF06/RF10); colors carry a redundant geometric symbol for accessibility (spec §3, "Acessibilidade a cores")
- **Recovery from failure**: No failure state — mirrors can always be repositioned; "reinício rápido do nível atual" (spec §3, "Persistência mínima")

---

## Core Loop

### Moment-to-Moment (30 seconds)

Aim the crosshair at a mirror/emitter (raycast selection), confirm to enter
manipulation mode, drag along its rail or rotate about its axis, observe the
laser path update in real time (spec §4-§6).

### Short-Term (5-15 minutes)

Solve one level: reposition all movable pieces until every door's logic
condition (AND/OR over its receivers) is satisfied, then walk through the
open door (spec §8).

### Session-Level (30-120 minutes)

Play through all 10 levels in fixed sequence, tutorial levels (1-5) then
composition puzzles (6-9) then the final synthesis level (10) — a single
sitting is the expected full playthrough (spec §11).

### Long-Term Progression

None — fixed 10-level scope by design (spec §1, "escopo fechado e
deliberadamente contido"). No meta-progression, unlocks, or replay hooks are
in scope.

### Retention Hooks

N/A — this is a bounded academic deliverable evaluated once in a defense, not
a live product designed to bring players back.

---

## Game Pillars

### Pillar 1: One mechanic, explored in depth
The entire game is variations on light + reflection + color; no unrelated
systems are added for variety.

*Design test*: If a proposed feature doesn't route through laser/mirror/color/logic,
it's cut (e.g., no enemies, no inventory, no dialogue).

### Pillar 2: Logic without symbols
Every logical operator (AND/OR/NOT/composition) must be taught through
direct, physical manipulation — never through an on-screen symbol, formula, or
technical term (spec §12).

*Design test*: If a rule can only be explained by writing "AND" or "∧" on screen,
redesign the visual/spatial representation instead.

### Pillar 3: Scaffolded, one-idea-at-a-time difficulty
Every level after the first introduces at most one new concept relative to
what's already been taught (spec §11, §12 "andamento").

*Design test*: If a level would require learning two new rules simultaneously,
split it into two levels.

### Pillar 4: No twitch skill required
Precision is spatial and logical, never reflex-based (spec §3, "Progressão sem
tédio": no pixel-perfect placement, no timed challenges).

*Design test*: If a puzzle's difficulty comes from timing or aim precision
rather than reasoning, simplify the interaction (e.g., snap-to-rail placement).

### Anti-Pillars (What This Game Is NOT)

- **NOT an action game**: no combat, no enemies, no fail states beyond a soft level restart (spec §14 excludes AI/rigid-body physics).
- **NOT open-world or exploratory**: ten fixed, self-contained rooms; no traversal puzzle beyond the room itself (spec §1).
- **NOT visually realistic**: minimalist dark rooms with neutral surfaces; no global illumination/ray tracing (spec §14 explicitly excludes these).
- **NOT narrative-driven**: no story, characters, or dialogue.

---

## Inspiration and References

| Reference | What We Take From It | What We Do Differently | Why It Matters |
| ---- | ---- | ---- | ---- |
| The Witness (laser panels) | Beam-tracing puzzle logic, minimalist presentation | Full 3D walkable space instead of 2D panel; explicit color-logic teaching goal | Validates that pure light-path reasoning sustains a puzzle game |
| The Talos Principle | First-person light-beam/mirror puzzles in 3D rooms | Simpler geometry (rails/pivots, not free 6DOF placement), explicit pedagogical framing | Validates FPS-perspective + mirror manipulation as an interaction model |
| Portal | Sparse, late-game portal-pair mechanic | Portals are opaque surfaces (no view-through rendering), directional teleport only, introduced only in level 8+ | Validates introducing one high-impact mechanic late without inflating scope (spec §9) |

**Non-game inspirations**: Formal logic gates (AND/OR/NOT) and RGB additive/subtractive
color mixing — the entire ruleset is a direct physical analogy to these two systems (spec §7, §12).

---

## Target Player Profile

| Attribute | Detail |
| ---- | ---- |
| **Age range** | N/A — evaluator-facing, not consumer-facing |
| **Gaming experience** | Assume minimal — course instructor grading via live defense, not necessarily a gamer |
| **Time availability** | One grading session (~10-20 min play + defense) |
| **Platform preference** | Whatever runs the grading defense (desktop browser) |
| **Current games they play** | N/A |
| **What they're looking for** | Clear, demonstrable coverage of the four CG axes (spec §13 traceability) + logical-reasoning pedagogy (spec §12) |
| **What would turn them away** | Ambiguous/hidden logic, unclear visual feedback, or scope that doesn't map cleanly to the four axes |

---

## Technical Considerations

| Consideration | Assessment |
| ---- | ---- |
| **Recommended Engine** | Three.js (WebGL) — chosen for raycasting support, browser-based demo with no install, matches the project's existing web-doc presentation style |
| **Key Technical Challenges** | Per-frame laser path recomputation (successive reflections until receiver/blocker/reflection-limit, spec RF04); additive/subtractive color composition (spec §7); declarative level data → scene graph builder (spec §10) |
| **Art Style** | Minimalist 3D — dark rooms, neutral matte surfaces, emissive colored beams as the primary visual element (spec §1, §3) |
| **Art Pipeline Complexity** | Low — small set of procedural/base meshes (wall, floor, mirror, emitter, receiver, door, portal) reused via transforms, no external 3D asset imports (spec §10) |
| **Audio Needs** | Minimal — confirmation stingers on receiver activation and door open/close (spec RF06/RF07) |
| **Networking** | None |
| **Content Volume** | 10 fixed levels (spec §11): 5 tutorial, 4 composition puzzles, 1 final synthesis |
| **Procedural Systems** | None — levels are hand-authored declarative data, not procedurally generated (spec §14 explicitly excludes procedural generation) |

---

## Risks and Open Questions

### Design Risks
- Color-blind accessibility relies on the geometric symbol system (circle/triangle/lozenge per beam color, spec §3) actually reading clearly at a glance — needs a quick visual check once implemented.
- Level 10 ("Prisma") combines every mechanic at once; if any sub-system has a bug, the final level becomes unsolvable/unclear — needs dedicated integration testing.

### Technical Risks
- Real-time reflection recomputation must stay within the O(reflections × emitters) per-frame budget (spec §3, "Desempenho") at 60fps on modest hardware — needs a hard cap on reflections per beam (spec RF04).
- Raycast-based object selection (spec §4) needs to reliably disambiguate closely-spaced mirrors in later levels (6-10) with more objects on screen.

### Market Risks
N/A — not a commercial release.

### Scope Risks
- Two-person team; portals (spec §9) and the multi-condition final level (spec §11, Level 10) are the highest-effort items — build and validate the core mirror/laser/color/receiver loop (levels 1-7) before starting portals.

### Open Questions
- Exact rail/pivot data format for the declarative level schema (spec §10) — resolve during `/map-systems` and the Level System GDD.
- Whether filters (spec §7, "Filtro subtrativo") are single-use per level or repositionable like mirrors — spec doesn't say explicitly; confirm with the professor if it affects Level 7 difficulty, otherwise default to repositionable for consistency with mirrors.

---

## MVP Definition

**Core hypothesis**: A single mirror + emitter + receiver + door loop (levels 1-3)
proves the raycast-selection, mirror-manipulation, and laser-simulation systems
work end-to-end and are legible to a first-time player.

**Required for MVP**:
1. First-person movement + raycast aim/select (RF01, RF04 partial)
2. Movable + rotatable mirror with real-time reflection (RF02, RF03, RF04)
3. Emitter, receiver, and one door with a simple AND/single-receiver rule (RF06, RF07)

**Explicitly NOT in MVP** (defer to later):
- Color composition (AND/OR across colors), filters, blockers (spec §7)
- Portals (spec §9)
- All 10 levels' declarative data (spec §10) — MVP can hardcode one test level

### Scope Tiers (if budget/time shrinks)

| Tier | Content | Features | Timeline |
| ---- | ---- | ---- | ---- |
| **MVP** | 1 level | Movement, raycast select, one mirror, one door | Est. 1 week |
| **Vertical Slice** | Levels 1-5 (tutorials) | + color composition (AND), filters | Est. 1-2 weeks |
| **Alpha** | Levels 1-9 | + OR logic, blockers (NOT), all core mechanics except portals | Est. 2-3 weeks |
| **Full Vision** | All 10 levels | + portals (Level 8+), full polish per spec NFRs | Full delivery per course deadline (see spec's 3-week modality-confirmation window and course due date) |

---

## Next Steps

- [x] Get concept approval — approved by definition, since scope is fixed by the submitted spec (`feixe-especificacao.pdf`)
- [x] Fill in CLAUDE.md technology stack (`/setup-engine` — Three.js r186, done)
- [ ] Decompose concept into systems (`/map-systems`) — run next
- [ ] Design each system (`/design-system [system-name]`) — Movement/Camera, Mirror & Reflection, Color & Logic, Receiver/Door, Level System
- [ ] Prototype the core mechanic (`/prototype mirror-reflection`) — validate raycast reflection math before full GDD authoring, given it's the highest technical risk
- [ ] Plan first milestone (`/sprint-plan new`) — likely scoped to the MVP tier above
