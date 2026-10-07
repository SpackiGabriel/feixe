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
  `exit-trigger.js`, `portal-crossing.js`) are the preferred style for
  branching logic. Code that imports `three` is testable headlessly too
  (`three` is a pinned devDependency — `docs/decisions/0004`, amended);
  see `levels.test.js` for building real scene objects without a renderer.
- Every level must declare a `solution` in its data (see
  `docs/level-authoring.md`); `levels.test.js` checks it opens the exit
  door and that the level starts closed.
- Every bug fix gets a regression test that would have caught it.
- Never import from `prototypes/` in a test.
