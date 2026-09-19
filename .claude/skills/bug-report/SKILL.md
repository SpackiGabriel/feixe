---
name: bug-report
description: "Turns a bug description (or a file to analyze) into a clear, structured report: what happens, repro steps, expected vs. actual, likely cause. For a 2-person project — no ticket system, just a clear writeup."
argument-hint: "[description] | analyze [path-to-file]"
user-invocable: true
allowed-tools: Read, Glob, Grep
model: sonnet
---

# Bug Report

Produces a short, structured bug report in the conversation — reproduction
steps, expected vs. actual behavior, and (if inspecting code) a likely
cause. No `BUG-NNNN.md` file, no ticket lifecycle — for two people, the
report itself and the fix are usually the same conversation.

## Modes

- **Description mode** (no keyword): the user describes a bug. Ask for
  whatever's missing to make it reproducible (steps, expected vs. actual)
  if it isn't already clear, then produce the report.
- **Analyze mode** (`analyze [path]`): read the target file(s) and
  identify potential bugs — logic errors, edge cases the code doesn't
  handle, mismatches against `feixe-especificacao.pdf`.

## Report format

```
## Bug: [one-line summary]

**Steps to reproduce:**
1. ...

**Expected:** ...
**Actual:** ...
**Likely cause:** [if identifiable from the code]
**Severity:** blocks play / wrong behavior / cosmetic
```

## After the report

If it's fixable immediately, just fix it — don't create tracking overhead
for a same-session fix. If it can't be fixed right now, ask whether to add
one line to `STATUS.md`'s "Known issues" section so it isn't forgotten.
