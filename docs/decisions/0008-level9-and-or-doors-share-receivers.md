# 0008 — Level 9's AND and OR doors watch the same two receivers

## Context

Level 9 ("Circuito", spec §11) must contain "uma porta E e uma porta OU
no mesmo espaço, todas dependentes de um conjunto compartilhado de quatro
espelhos", with the win condition (agreed with the user) being that both
doors are open at once.

But the tracer imposes a hard limit that makes independent doors
impossible here. Each beam terminates at exactly one segment — a receiver,
wall, or blocker ends the trace; a mirror or portal redirects it; a filter
only recolors it and passes through (`src/gameplay/laser.js`). So **N
emitters can light at most N receivers simultaneously.** Level 9 has two
emitters. A genuine AND door (two receivers, both lit) already consumes
both beams, leaving none for an *independent* OR door's own third
receiver. "Both doors open at once" with two independent doors is
therefore unsatisfiable — not a tuning problem, an arithmetic one. (See
`docs/findings.md`'s beam-budget entry.)

## Decision

Both doors watch the **same** two receivers, `{r1 (red), r2 (blue)}` —
the exit is the AND door (`rule: 'AND'`, `exit: true`); the second door is
`rule: 'OR'` over the same pair. This needs **no engine change**: because
`r1 ∧ r2 ⟹ r1 ∨ r2`, whenever the AND/exit door opens the OR door is
already open, so "both open at once" is automatic and the existing
single-`exit`-door proximity trigger (`exit-trigger.js`) is enough.

The operator contrast is taught *during* the solve rather than at the end:
route one beam and the OR door opens (one condition suffices) while the
AND/exit door stays shut until the second beam lands. This reads as a
literal case of the spec's "todas dependentes de um conjunto
compartilhado" — the difficulty lives in the routing (the four shared
mirrors, the filter's decomposition of white→red, and blue's detour around
the blocker), not in the door rules.

## Alternatives considered

- **Add a third emitter** so three receivers can be lit and the OR door
  gets its own independent receiver. Rejected: spec §11 gives level 9
  *two* emitters and reserves the third for level 10 ("Prisma"); using it
  early erodes the 9→10 scaffolding.
- **Sequence the two doors** (open one, walk through, reconfigure for the
  other) with a full-width blocker divider. Rejected by the user: that was
  already level 8's theme ("Sequência"), and it spends the single blocker
  on a wall instead of its "NÃO" role.
- **A small runtime tweak** making the exit require every door open.
  Unnecessary once the shared-receiver framing makes both-open automatic.

## Consequences

Level 9 is almost entirely level data: `src/levels/data/level-9.js` plus
registration, with one small loader change — an opt-in `rotationEnabled:
false` to aim-lock the two emitters (so a free-aimed emitter can't fire
straight across the open room and skip the circuit). The OR door never
becomes the *binding* constraint (the AND door always is), so it functions
as a teaching/feedback element, not an independent gate — an accurate
reflection of the two-emitter budget, and a good thing to be able to
explain in the defense. The same budget ceiling will shape level 10:
three emitters there allow three simultaneous receivers, which is exactly
what an independent AND+OR final door needs.
