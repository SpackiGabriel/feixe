---
name: help
description: "Reads STATUS.md and the build order in design/game-concept.md, and suggests what to work on next. Use when the user says 'what should I do next', 'I'm stuck', or similar."
argument-hint: "[optional: what you just finished]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
model: haiku
---

# Help — What Next?

Read-only. Reports a suggestion, writes nothing.

## Steps

1. Read `STATUS.md` for current focus, progress table, and blockers.
2. Read the build order in `design/game-concept.md`.
3. Check `git log --oneline -10` and `git status` for anything not yet
   reflected in `STATUS.md`.
4. Suggest the next concrete step: the next unimplemented system in build
   order, or resolving a listed blocker. If a known issue in `STATUS.md`
   is blocking progress, surface that first.
5. If nothing in `STATUS.md` matches what's actually in the repo (e.g. a
   system marked "not started" that clearly has code for it), point that
   out — `STATUS.md` may be stale and should be corrected before
   proceeding (see the implementation-state rule in `CLAUDE.md`).

Keep the answer to a few sentences: what's next, and why.
