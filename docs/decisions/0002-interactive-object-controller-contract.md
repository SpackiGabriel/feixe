# 0002 — Interactive objects expose a plain `userData.controller` shape

## Context

Spec §4 describes a single generic interaction flow: aim (raycast) → confirm
→ manipulate (drag along a rail, or rotate around an axis, "conforme o
tipo"). Mirrors (§5) and emitters (§6) are the first two object types that
need to plug into this flow, but they have different geometry, different
enabled degrees of freedom, and (for emitters) a fixed color identity that
hover feedback must not clobber. Something has to let `interaction.js` and
`manipulation.js` stay generic across object types without knowing about
mirrors or emitters specifically.

## Decision

Any raycastable mesh that should be selectable sets on its own `userData`:

- `interactive = true` — makes it eligible for the raycast hit-test.
- `controller = { positionEnabled, rotationEnabled, applyPositionDelta(delta), applyRotationDelta(delta) }`
  — what `manipulation.js` drives with mouse-movement deltas once the
  object is confirmed. `manipulation.js` gates each call on the matching
  `*Enabled` flag (and the object's own function is a safe no-op if called
  anyway), so it never has to branch on object type.
- `setHovered(isHovered)` (optional) — overrides the default "tint gray"
  hover feedback in `interaction.js`. Used by the emitter so hovering
  doesn't overwrite its laser-color emissive hue; mirrors don't define it
  and get the default.

This is a plain object shape (duck typing), not a class hierarchy or
formal interface — there's no shared base class between `Mirror` and
`Emitter`, just the convention that both attach the same `userData` keys.

## Alternatives considered

- **A shared `InteractiveObject` base class**: rejected — two object types
  with almost no shared state don't need inheritance; it would be
  structure for structure's sake in a two-person, fixed-scope project.
- **`interaction.js`/`manipulation.js` switch on object type** (e.g.
  `if (obj instanceof Mirror)`): rejected — couples the generic
  aim/confirm/manipulate flow to every concrete gameplay object, meaning
  every new type (future levels' variants) requires editing shared core
  code instead of just implementing the contract.

## Consequences

Adding a new interactive object type (e.g. a future variant) only requires
setting these three `userData` keys correctly — `interaction.js` and
`manipulation.js` need no changes. The cost is that the contract is
implicit (no TypeScript/interface to enforce it); a mismatched shape fails
silently at the call site (e.g. `controller.applyPositionDelta` being
`undefined`). Acceptable for this project's size — if it becomes a
recurring source of bugs, revisit with a runtime shape-check.
