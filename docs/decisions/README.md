# Decisions

Architecture Decision Records — one file per **genuinely important**
technical decision, so a future agent understands *why* something was
built a certain way instead of re-deriving or second-guessing it.

Not a gate. Don't write one before implementing something as a planning
step; don't write one for a routine implementation choice. Write one when
you'd want to have read it yourself — usually right after making the call,
sometimes a bit later once the shape of the decision is clear.

Name files `NNNN-short-slug.md`, incrementing. Keep each one short:

```markdown
# NNNN — Title

## Context
What problem or requirement forced a choice here (reference the spec
section if relevant).

## Decision
What was decided.

## Alternatives considered
What else was on the table and why it lost. Skip if there was really only
one reasonable option.

## Consequences
What this makes easier, harder, or forecloses.
```

Existing ADRs are numbered `0001`–`0010` in this directory; list it to see
the latest number.
