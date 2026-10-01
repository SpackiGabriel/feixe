---
paths:
  - "tests/**"
---

# Test Standards

Vitest, run with `npm test` (all) or `npx vitest run tests/unit/<file>`.
Tests live in `tests/unit/<module>.test.js` and run in plain Node.

- Name tests `test_<subject>_<scenario>_<expectedResult>` inside `it()`,
  grouped by `describe('<function or module>')` — e.g.
  `test_clampLevelIndex_negative_clampsToZero`.
- Arrange / act / assert, one behavior per test. Use `toBeCloseTo` for
  floating-point geometry.
- Test data is defined in the test. No shared mutable state, no network,
  no real `localStorage` (inject a fake — see `level-manager.test.js`).
- Pure modules (no `three` import — `laser.js`, `aabb.js`, `door-logic.js`,
  `exit-trigger.js`, `portal-crossing.js`) are tested directly. Code that
  imports `three` can be tested too once `three` is a devDependency; see
  `docs/decisions/0004`.
- Every bug fix gets a regression test that would have caught it.
- Never import from `prototypes/` in a test.
