---
name: smoke-check
description: "Runs the test suite (once tests/ exists) and does a quick manual-play sanity check before calling a level or system done. Reports PASS/FAIL directly — no QA hand-off ceremony."
argument-hint: "[optional: what to check, e.g. 'level 3']"
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
model: sonnet
---

# Smoke Check

A quick "is this actually working" pass before calling something done —
not a formal QA gate.

## Steps

1. If `tests/` exists, run the test suite and report pass/fail counts and
   any failures in full.
2. Check the relevant spec requirement(s) are satisfied — walk through
   what should happen and confirm the code does it (read the code; if a
   dev server is running, actually try it per the `run` skill/workflow if
   available).
3. For the specific thing being checked (a level, a system), verify the
   concrete acceptance signal from the spec (e.g., a level's door opens
   under the right laser configuration).

## Output

`PASS` or `FAIL` with specifics — what was checked, what broke if
anything. If it fails, that's the finding; fix it or note it in
`STATUS.md`'s known issues, don't produce a separate report document.
