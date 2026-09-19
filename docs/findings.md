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

## 2026-09-19 — A reused mutable trace-input object breaks once results outlive the loop

Source: building `src/gameplay/laser-system.js` (receiver evaluation,
spec §8).

Same family of bug as the matrixWorld one above, different mechanism.
The original per-beam loop reused one `traceEmitter` scratch object
(mutating its `pos`/`dir`/`color` for each emitter) to avoid allocating —
safe as long as each `trace` result was consumed immediately and thrown
away, which is what the beam renderer did. `traceBeam()`'s very first
`path` entry is a *reference* to the `emitter.pos` object passed in, not a
copy, so the trace's path implicitly aliased the shared scratch object.

Adding receiver evaluation broke the assumption: receivers need every
beam's `trace` collected into an array and read *after* the whole
per-beam loop finishes, by which point the shared scratch object had been
mutated for every subsequent emitter. `composeReceiverColor()` doesn't
happen to read `trace.path`, so this was never visibly wrong yet — but it
was a landmine for anything that would (e.g. future debug rendering of
all beam paths, or per-beam diagnostics).

Fixed by giving each beam its own small `{pos, dir, color}` object per
frame instead of a shared scratch one. **Rule of thumb**: a scratch/reused
mutable object is only safe across a loop when nothing keeps a reference
to it past the current iteration — the moment a result needs to survive
past the loop (like `traces` does for receivers), every input that result
transitively points to needs to stop being shared, too.
