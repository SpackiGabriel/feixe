---
name: test-setup
description: "One-time scaffold of tests/ and a test runner (Vitest) for Feixe's logic-heavy code (laser tracing, color composition, door logic). Run once, before the first unit test is written."
argument-hint: "[force]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, Write
model: sonnet
---

# Test Setup

Scaffolds `tests/` and a minimal test runner, once, the first time a unit
test is actually needed — not upfront as ceremony.

## Steps

1. Check whether `tests/` already exists; if so and `force` wasn't passed,
   stop and report what's there.
2. Add a test runner as a dev dependency — Vitest is the natural fit
   (ES modules, no build step, matches the "no build step" project
   constraint). Ask before adding any `package.json`/`node_modules` if the
   project doesn't have one yet — that's a bigger structural change than
   this skill should make silently.
3. Create `tests/unit/` with one example test for the reflection/color
   logic in `prototypes/mirror-reflection/engine.mjs` as a working
   reference (per `.claude/rules/test-standards.md`'s naming/AAA
   conventions) — this doubles as validation that the runner works.
4. No CI pipeline, no GitHub Actions workflow, no `production/qa/`
   artifacts — out of scope for this skill. If CI is wanted later, that's
   a separate, explicit ask.
