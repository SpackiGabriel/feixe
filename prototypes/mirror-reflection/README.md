# PROTOTYPE — mirror reflection & color composition

**Throwaway.** Do not build on this directly — the validated logic
(`engine.mjs`) is meant to be lifted into the real `Laser Simulation & Color
System` GDD/implementation; the terminal shell (`tui.mjs`) is not.

## Question

`design/gdd/systems-index.md` flags the Laser Simulation & Color System as
the project's highest technical risk: per-frame reflection recomputation
through successive mirrors, plus additive/subtractive color composition
(spec §4-§8, RF04/RF05). Before writing that system's full GDD, this
prototype checks: **does the plane-segment reflection formula generalize
cleanly to any mirror angle, does multi-emitter additive color composition
at a receiver work as designed, and do filters/blockers behave as one-way
gates without special-casing?**

The model is 2D top-down on purpose — mirrors and emitters only rotate
around the vertical axis per the spec, so the real geometry question is
entirely in-plane; the 3D scene is just this plane extruded upward.

## Run it

```
node prototypes/mirror-reflection/tui.mjs
```

Interactive: `[a/d]` rotate mirror1, `[w/s]` move mirror1, `[j/l]` rotate
mirror2, `[i/k]` move mirror2, `[f]` toggle a filter/blocker test scene,
`[q]` quit.

## What it answered

- **Reflection formula holds for any angle.** `reflect(dir, normal)` is
  invariant to the sign of the normal (mirroring a segment's direction by
  90° either way gives the same result), so there's no special-casing
  needed per mirror orientation — confirmed by testing 45°, -45°, and
  interactive arbitrary angles.
- **Found a scene-authoring trap, not a math bug.** An early hand-built test
  scene put two mirrors on the same x-column with the receiver placed past
  *both* of them; the first beam's reflected path ran straight through and
  bounced off the second mirror instead of stopping at the receiver. The
  reflection math was correct — the receiver just wasn't in the right place
  to intercept the beam before the geometry "found" the next mirror. Real
  implication for the Level System GDD: **levels must place receivers so
  they're the nearest segment along the beam's post-reflection path**, or a
  beam can silently sail past a receiver and hit unrelated geometry. Worth
  a validation check in `/design-system level-system` and in the level
  data schema (e.g., a level-authoring lint that raycasts each declared
  beam and flags receivers that are found not-nearest).
- **Additive convergence works as designed.** Two emitters (red, blue) each
  bouncing off their own mirror into the same receiver correctly compose to
  magenta and satisfy an AND-style (§7) target — validates the OR-together
  color composition model in `evaluateReceiver`.
- **Filters and blockers behave as pure pass-through/stop gates** with no
  direction change, confirmed via the `[f]` toggle scene — matches spec §7's
  "no cor com comportamento oculto" requirement (a color's effect never
  depends on context).

## Capture

The validated `engine.mjs` module (pure, no I/O) is the reference
implementation for the Laser Simulation & Color System GDD — its
`traceBeam`/`evaluateReceiver` shape can be lifted directly into the real
codebase. The receiver-placement finding above should be carried into that
GDD's design as an explicit constraint, not just left in this README.
