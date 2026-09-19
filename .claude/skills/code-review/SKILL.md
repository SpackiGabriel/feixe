---
name: code-review
description: "Reviews a file or diff for correctness, adherence to .claude/rules/code-conventions.md, and scope creep against the spec. Reports findings inline — no approval gate, no specialist routing."
argument-hint: "[path-to-file-or-directory]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
model: sonnet
---

# Code Review

Reviews the given file(s) (or the current diff if no path is given) for:

1. **Correctness** — logic errors, edge cases, mismatches against the
   relevant `feixe-especificacao.pdf` requirement.
2. **Convention adherence** — against `.claude/rules/code-conventions.md`
   (the single source — don't invent additional standards here).
3. **Scope** — does this introduce anything not required by the spec
   (unused generality, infra for hypothetical future needs)? Flag it.
4. **Testability** — for laser/color/door logic, is it structured so a
   unit test can actually exercise it without a full scene?

## Steps

1. Read the target file(s) in full, plus `.claude/rules/code-conventions.md`
   and the relevant spec section.
2. Report findings directly — file, line if applicable, what's wrong, why
   it matters. Skip nitpicks that don't affect correctness or violate a
   stated convention.
3. If asked to fix, apply the fixes and summarize what changed.

No director sign-off, no story acceptance criteria to check against —
this is a straightforward second pair of eyes.
