---
name: architecture-decision
description: "Records a short Architecture Decision Record (ADR) in docs/decisions/ for a technical decision worth a future agent knowing the 'why' of. Not a gate — use before or right after making the call."
argument-hint: "[short title of the decision]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion
model: sonnet
---

# Architecture Decision

Writes one ADR to `docs/decisions/NNNN-slug.md` for a decision that's
genuinely worth recording — not a planning step, not required before
implementing.

**Use this when**: a future agent (including future-you) would otherwise
have to re-derive the reasoning, or could plausibly make a different,
worse call without knowing why this one was chosen. Most implementation
choices don't meet that bar — don't write an ADR for them.

**Don't use this when**: the choice is obvious from `feixe-especificacao.pdf`,
or it's a routine implementation detail with no real alternative worth
recording.

## Steps

1. Read `docs/decisions/README.md` for the format and the next available
   number (check existing files in `docs/decisions/`).
2. Confirm with the user (or infer from context) what the decision
   actually is, what problem forced it, and what the real alternatives
   were — skip the "alternatives" section if there was genuinely only one
   reasonable option.
3. Write a short file (the four sections from the README: Context,
   Decision, Alternatives considered, Consequences). Target a few
   paragraphs, not a page — if it's getting long, it's probably trying to
   cover more than one decision.
4. Ask: "May I write this to `docs/decisions/NNNN-slug.md`?" before
   writing.
