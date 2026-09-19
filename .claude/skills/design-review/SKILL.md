---
name: design-review
description: "Reviews a design note or ADR (design/game-concept.md, a docs/decisions/ entry, or ad hoc design text) for clarity, internal consistency, and whether it's implementable as written. Lightweight, single-pass — no specialist delegation."
argument-hint: "[path-to-doc]"
user-invocable: true
allowed-tools: Read, Glob, Grep
model: sonnet
---

# Design Review

A second pass on a design note before someone implements against it. Rare
to need this — most design decisions in this project are either obvious
from `feixe-especificacao.pdf` or small enough not to need a written note
at all.

## Checks

- **Clear**: could someone implement this without asking a follow-up
  question?
- **Consistent**: does it contradict the spec, `design/game-concept.md`,
  or an existing entry in `docs/decisions/`?
- **Testable**: if it makes a claim about behavior, can that behavior be
  verified (by a unit test or by playing it)?
- **In scope**: does it require anything from the explicitly-out-of-scope
  list in `CLAUDE.md`'s scope guardrail? Flag it if so.

## Output

A short list of concrete issues (or "looks good, no issues"). No
APPROVE/CONCERNS/REJECT verdict format, no sign-off ceremony — just tell
the user what's unclear or wrong.
