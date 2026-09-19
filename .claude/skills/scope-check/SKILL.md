---
name: scope-check
description: "Checks a proposed or in-progress change against feixe-especificacao.pdf and the scope guardrail in CLAUDE.md — is this required, and is it the simplest thing that satisfies the requirement? Read-only."
argument-hint: "[what's being built or proposed]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
model: haiku
---

# Scope Check

Read-only. Reports findings, writes nothing.

The concrete scope-creep safeguard for this project: `feixe-especificacao.pdf`
is closed and fixed. This skill checks a specific piece of work against it.

## Steps

1. Identify what's being checked — a proposed feature, an in-progress
   change (`git diff`), or a piece of existing code.
2. Find the spec requirement(s) it's meant to satisfy. If none exists,
   say so plainly — that's the finding.
3. Check against the explicitly-out-of-scope list in `CLAUDE.md` (physics
   engine, GI/ray tracing, portal see-through rendering, multiplayer,
   level editor, enemy AI, procedural generation).
4. Check whether the implementation is simpler than the spec requires
   (good), matches it (good), or adds generality/abstraction the spec
   didn't ask for (flag it, with what to cut).

## Output

A short verdict: in scope / out of scope / over-built (with what to trim).
Not a report file — just tell the user directly.
