# 0004 — Pure gameplay logic lives in files with no `three` import

## Context

`package.json` has Vitest as a dev dependency, but **not** `three` itself
— the shipped game loads Three.js from a CDN import map
(`docs/decisions/0001`), and there was no reason to also install it as an
npm package just for tooling. That means any file with a top-level
`import * as THREE from 'three'` cannot be loaded by Vitest at all — the
import itself throws "Cannot find module 'three'" in Node, before a
single test runs, regardless of whether the test actually touches
anything Three.js-related.

Receiver/door logic (this slice) has real branching worth a unit test —
`isReceiverSatisfied`, `evaluateDoorRule` — sitting right next to mesh
construction that needs `three`.

## Decision

Split every gameplay module into a pure part (no `three` import, safe for
Vitest) and a Three.js part (mesh/material construction, browser-only,
verified via Playwright instead — same pattern already used for
`src/gameplay/laser.js` vs. `laser-beam.js`/`laser-system.js`):

- `door-logic.js` (`evaluateDoorRule`) has no `three` import; `door.js`
  imports it and adds the mesh/slide-animation code.
- `colors.js` (the named RGB-boolean palette) has no `three` import, so
  both `emitter.js` and `receiver.js` can share it without either needing
  to be importable by Vitest itself.
- `isReceiverSatisfied` lives in `laser.js` (already the project's
  designated pure/tested module for color composition) rather than in
  `receiver.js`.

## Alternatives considered

- **Add `three` as a devDependency too**: would let any file import it
  under Vitest. Rejected — it doesn't change what ships, but it's an
  unnecessary dependency to keep in sync with the CDN-pinned version
  (`docs/decisions/0001`), for a benefit (testing thin wrapper files that
  are already covered by Playwright) this project doesn't need.
- **Test everything through Playwright instead**: works, but is slower
  and heavier per test than Vitest for logic that has nothing to do with
  rendering — not worth it for pure branching logic like an AND/OR rule.

## Consequences

Any new gameplay object with real logic (a future filter, blocker, or
portal) should follow the same split: pure decision logic in its own
file, `three`-dependent mesh code importing it. A file that mixes both
can only be verified via Playwright, never Vitest — that's the tell for
when a pure extraction is worth doing.
