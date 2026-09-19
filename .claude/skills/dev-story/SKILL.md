---
name: dev-story
description: "Implements a slice of Feixe: reads the relevant spec section, writes the code, tests it, and updates STATUS.md/findings/decisions per CLAUDE.md's workflow. The core implementation skill — no story files, no epics."
argument-hint: "[what to build, e.g. 'mirror rotation' or 'level 3 data']"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion
model: sonnet
---

# Implement

Implements one slice of Feixe end to end, following the workflow in
`CLAUDE.md`. There's no story file to read — the argument is a plain
description of what to build.

## Steps

1. **Ground it in the spec.** Find the relevant RF/NFR section in
   `feixe-especificacao.pdf` and the build-order entry in
   `design/game-concept.md`. If what's being asked isn't required by the
   spec, say so before implementing (see the scope guardrail in
   `CLAUDE.md`) — don't silently build it anyway.
2. **Check `STATUS.md`** for current state and anything already noted as
   a blocker or in-progress here.
3. **Implement the smallest working slice.** Follow
   `.claude/rules/code-conventions.md`. Create `src/`, `tests/`, or
   `assets/` (and their subfolders) only when this slice actually needs
   them — see `.claude/docs/directory-structure.md` for the intended
   shape.
4. **Test it.** Logic-heavy code (laser tracing, color composition, door
   logic) gets a unit test per `.claude/rules/test-standards.md`. Other
   changes get a manual play-through description of what was checked.
5. **Record what's worth recording** — a short ADR in `docs/decisions/`
   only if this slice made a decision a future agent would otherwise have
   to re-derive; a bullet in `docs/findings.md` for any surprising
   discovery. Most slices need neither.
6. **Update `STATUS.md`** — move the relevant row/checklist item, note any
   new blocker.
7. Report what was built, what was tested, and what's next.

Ask before writing new files when the direction is ambiguous; for a slice
that clearly matches an already-agreed plan, just implement it and report.
