# Findings

A running, append-only log of things discovered while building Feixe that
aren't obvious from `feixe-especificacao.pdf` and that a future agent
shouldn't have to rediscover. Newest entries at the bottom. One entry per
discovery — a few sentences, not a report.

This is not a decision record (see `docs/decisions/` for those) and not a
status tracker (see `STATUS.md`). It's for gotchas, surprising behavior,
and things that turned out to matter more than expected.

---

## 2026-09-15 — Receivers must be the nearest segment on a beam's path

Source: `prototypes/mirror-reflection/` (throwaway 2D top-down prototype
validating the reflection/color-composition math from spec §4-§8).

The reflection math itself is correct for any mirror angle — no
special-casing needed (`reflect()` in `prototypes/mirror-reflection/engine.mjs`
is invariant to which side of the mirror the normal points to).

The real trap is authoring, not math: if a level places a receiver behind
another mirror or wall along a beam's path, the beam simply continues past
it and hits whatever geometry is actually nearest — it doesn't "know" a
receiver was meant to catch it there. Confirmed with a hand-built test scene
where two mirrors sat on the same column with a receiver placed past both;
the beam sailed through the first reflection and hit the second mirror
instead.

**Implication for level data / the level loader**: when building levels
(RF08/RF09), a receiver must actually be the nearest intersecting segment
along the beam's path after all its reflections — otherwise it silently
never activates. Worth a validation check (trace each declared beam at
load time and flag receivers that aren't nearest) once the level loader
exists, rather than debugging "why won't this door open" per level.

Also confirmed in the same prototype: additive color convergence (two
different-colored beams hitting the same receiver) composes correctly, and
filters/blockers behave as pure pass-through/stop gates with no direction
change — no hidden per-color behavior, matching spec §7's "no cor com
comportamento oculto" requirement.

## 2026-09-19 — Raycast/matrixWorld must be force-updated before `renderer.render()` runs

Source: building `src/core/interaction.js` (raycast-based aim/select, spec
§4).

Three.js only recomputes an object's `matrixWorld` automatically inside
`renderer.render()` (or on an explicit `updateMatrixWorld()` call). Our
frame loop in `src/main.js` runs `movement.update()` and
`interaction.update()` *before* `renderer.render()`, so a raycast taken at
that point sees last frame's transforms for both the camera and any
interactive object that moved — caught by a Playwright test where a target
box placed directly ahead didn't register as hovered.

Fixed by having `createInteraction()`'s `update()` call
`camera.updateMatrixWorld()` and `scene.updateMatrixWorld()` itself before
raycasting, rather than relying on render order.

**Implication for the mirror/emitter system (RF02/RF03)**: once mirrors
are draggable, this stays load-bearing — a mirror moved earlier in the
same frame must still be raycast-accurate. Don't remove the explicit
`updateMatrixWorld()` calls as a "redundant with the renderer" cleanup.
