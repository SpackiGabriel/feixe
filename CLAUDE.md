# Feixe — Computação Gráfica UTFPR (Projeto Final)

3D first-person laser/mirror puzzle game, built by two students to satisfy
the four required axes of the Computação Gráfica final project
(geometry/transforms, camera/navigation, lighting/shading/materials/
textures, animation). Full requirements: `feixe-especificacao.pdf`
(authoritative, closed, never edited). Working vocabulary and scope
boundaries: `design/game-concept.md`. Current state: `STATUS.md`.

This is a small, fixed-scope, deadline-driven university project — not a
commercial game or a studio production. Keep process proportional to that.

## Commands

`npm install` once, then `npm start` (serve at :8000), `npm run lint`,
`npm test` (Vitest, ~1 s; single file: `npx vitest run tests/unit/<file>`).
Run lint + tests before committing. Details in `README.md`.

## Read order for a fresh session

1. This file.
2. `STATUS.md` — current focus, what's implemented, what's next.
3. `design/game-concept.md` — if unfamiliar with the game. Building a
   level or a new gameplay object: `docs/level-authoring.md`.
4. `docs/decisions/` and `docs/findings.md` — skim for anything relevant
   to the task at hand.
5. The actual code in `src/` for what's really implemented — see the
   implementation-state rule below.

## Technology stack

- **Engine**: Three.js r186 (WebGLRenderer only — no WebGPU)
- **Language**: JavaScript (ES modules, no build step)
- **Assets**: procedural (BufferGeometry) — no external 3D model imports

Details: `.claude/docs/technical-preferences.md`. Code conventions (the
single source, don't duplicate it): `.claude/rules/code-conventions.md`.
Directory layout: `.claude/docs/directory-structure.md`.

## Implementation-state rule

**Code is authoritative for the current implementation state.
Documentation must never imply that a designed, planned, or specified
feature is already implemented.** The spec is authoritative for
requirements and scope; the codebase is authoritative for what currently
exists and works. When describing or updating status, distinguish:

- required by the specification (→ `feixe-especificacao.pdf`)
- designed / decided (→ `design/game-concept.md`, `docs/decisions/`)
- currently being implemented (→ `STATUS.md`)
- actually implemented and verified (→ the code + its tests, `src/`)

## Scope guardrail

`feixe-especificacao.pdf` is closed and fixed — it will not change, and
nothing gets added that it doesn't require. Concretely:

- Prefer the simplest implementation that satisfies the current
  requirement over a more general one.
- Don't introduce abstractions, infrastructure, or systems for
  hypothetical future requirements.
- Don't turn a routine implementation task into a design phase — see the
  workflow below.
- Spec §14 explicitly excludes: realistic rigid-body physics, real-time
  global illumination/ray tracing, portal see-through rendering,
  multiplayer, a level editor, enemy/NPC AI, procedural generation. Don't
  build toward any of these even as "future-proofing."
- If genuinely unsure whether something is in scope, check
  `feixe-especificacao.pdf` first; the `scope-check` skill exists for this.

## Workflow

`spec → implement → test/play → learn → document important knowledge → update STATUS → continue`

1. Check the relevant spec section (RF/NFR ID) for the piece being built.
2. Implement the smallest working slice. If a non-obvious technical choice
   comes up along the way, just make it — don't stop to write anything yet.
3. Test it: a unit test for logic-heavy pieces (laser tracing, color
   composition, door logic — see `.claude/rules/test-standards.md`),
   manual play otherwise.
4. Afterward, decide if anything is worth recording:
   - A **genuinely important decision** a future agent would otherwise
     have to re-derive → a short ADR in `docs/decisions/` (see its
     README for the format). Written now or later — never a blocking
     step before coding. Most routine choices need no ADR.
   - A **surprising discovery or gotcha** → one dated bullet in
     `docs/findings.md`.
   - Otherwise → nothing; the code is the record.
5. Update `STATUS.md`.
6. Commit with a plain, descriptive message.

No sprints, no epics/stories, no phase gates, no design doc for something
the spec already answers unambiguously.

## Working directly, not through role-play

There's no roster of department agents in this project (no
producer/director/specialist personas) — two people and Claude working
directly on the code is the coordination mechanism. If a task ever
genuinely needs a scoped persona (e.g. a hard shader-math problem), spin
one up ad hoc for that task rather than maintaining a permanent roster.

Ask before writing to a file when the change is non-trivial or the
direction is ambiguous; for straightforward implementation work matching
an already-agreed plan, just do it and report what changed.
