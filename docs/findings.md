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

## 2026-09-19 — A `blocker` downstream of a `filter` can never actually be hit

Source: designing `src/levels/data/level-7.js` ("Filtro", spec §11).

A filter (`src/gameplay/filter.js`) never changes a beam's direction —
only a mirror does. So on any level with no mirror, a beam's XZ line is
fixed the moment it leaves the emitter, and `traceBeam()` always resolves
to whichever segment is *nearest* along that fixed line (docs/findings.md's
earlier receiver-placement entry). A `blocker` placed anywhere past the
receiver on that same line is unreachable no matter what the player does
— the receiver eats the beam first, every time. A `blocker` placed
*before* the receiver, meanwhile, eats the beam unconditionally — solving
the filter can't change the beam's path around it, so the level becomes
unsolvable. There's no position on a straight, unmirrored line where a
blocker is both reachable and avoidable depending on player action.

**Implication**: a `blocker` only functions as real *trace* logic (something
the player must route a beam around) on a level that also has a mirror to
redirect the beam away from it. On a mirror-less level like 7, a blocker
can still be placed as a spatial/visual cue (e.g. marking the "wrong"
spot to leave a filter), but it won't intercept the beam in any solved or
unsolved state — don't expect it to gate the puzzle. Level 9 ("Circuito")
does have mirrors alongside its blocker, so that's where blocker-avoidance
first becomes real trace logic worth testing for.

## 2026-09-19 — A portal's `rotationY` serves two purposes that can point opposite ways

Source: building `src/levels/data/level-8.js` ("Sequência", spec §9/§11) —
caught by the trace-verification script, not by inspection.

A portal's `rotationY` feeds two independent calculations: (1) the beam's
exit-direction remap (`exitRotationDelta` in `src/gameplay/portal.js`,
consumed by `laser.js`'s `rotateXZ`), and (2) the player's landing
clearance push (`computePortalLanding` in `src/levels/portal-crossing.js`,
which pushes the player out along `dir(rotationY)` — same `(-sinθ,-cosθ)`
convention as every other rotationY in this codebase). (1) only cares
about the *relative* rotation between the pair — any consistent pair of
angles that produces the right relative delta works, including one where
each portal's individual `rotationY` doesn't literally point away from
its own wall. (2) genuinely needs each portal's `rotationY` to be its
real physical "front face" direction, or the player gets pushed back
*into* whatever they just walked through instead of clear of it.

First pass at level 8 picked `rotationY` values purely to make the beam
continue straight through the pair (0 and π) — the math checked out in
`traceBeam()`, but `computePortalLanding()` landed the player 0.2m in
*front* of the dividing wall (almost inside its collider) instead of
clear of it, because π happened to face back toward the wall rather than
away from it. Fixed by picking each portal's `rotationY` from its own
"which way does this open into my room" fact first, then deriving
whatever `exitRotationDelta` falls out of that — never the other way
around. **Implication**: always author a portal pair's `rotationY`
values as "outward-facing, away from the wall it's mounted on" and let
`createPortalPair` compute the beam delta from that, and verify a new
pair's *player* landing spot (not just the beam trace) before shipping —
levels 9 and 10 both need more portals.

## 2026-09-19 — Aim-based interaction ignores scene occlusion, doors/blockers included

Source: designing level 8's door/blocker gating (`docs/decisions/0007`)
— found by reading `src/core/interaction.js`, not by manual testing.

`interaction.js`'s raycast for aim/select calls
`raycaster.intersectObjects(interactiveObjects, false)` — Three.js only
tests the objects in that array, it does not check the rest of the scene
for anything blocking the line of sight. A mirror behind a closed door,
inside a walled-off section, or on the far side of a blocker is still
selectable and rotatable/draggable from across the room, as long as the
aim ray geometrically passes through its bounding geometry — the door,
wall, or blocker mesh doesn't occlude the raycast just because it's
solid and in the way visually.

**Implication**: `docs/decisions/0007`'s new door/blocker collision only
gates player *movement*, never *manipulation*. Don't design a puzzle
around "the player can't reach the mirror until X" — they always could,
via aim, regardless of X. What a closed door or dividing wall can gate is
*where the player can physically stand* (relevant for the exit trigger's
proximity check, or reaching a portal/switch), not what they can adjust.
Levels 9 and 10 pack more mirrors behind more obstacles than any level
so far — worth keeping this in mind when authoring their layouts, and
worth a proper occlusion check if this ever becomes an actual exploit
worth closing (it hasn't yet).

**Resolved 2026-11-05**: `interaction.js` now also raycasts the level's
occluders (room/interior walls, doors, blockers), so objects behind them
can't be selected.

## 2026-10-01 — Asset toolchain: axis mapping and headless-render notes

Source: toolchain smoke test (`assets/src/smoke.sh`).

Blender is Z-up and exports to glTF Y-up with Blender +Z → glTF +Y and
Blender +Y → glTF −Z. A flat device whose thickness is meant to run along
the game's local Z (e.g. a 0.8×0.8×0.05 receiver) must therefore be modeled
**thin along Blender Y**; modeling it thin along Z silently yields a
horizontal slab. Checked by exporting and reading the glTF bounding box
(0.8 × 0.8 × 0.08). Also: headless Blender under WSL2 prints harmless
EGL/MESA warnings but renders fine, and the PyPI `bpy` module is not used
because Blender's bundled Python is 3.11 and the system Python is 3.14.

## 2026-11-05 — Emitters were always rotatable, so most levels could be skipped

Source: completion audit (reading `emitter.js`, then tracing level 2–5 data).

`createEmitter` hardcoded `rotationEnabled: true`, and every emitter was
pushed to `interactiveObjects`. In nearly every level the player could
simply aim the emitter at the receiver and ignore the mirrors. Nothing
caught it: the level tests only checked "starts closed" and "solution
opens". Emitters are now fixed unless the level says `rotationEnabled`, and
`levels.test.js` sweeps each rotatable emitter through 360° to check that
rotation alone never opens the exit. **Lesson**: a level test that only
checks "the intended solution works" says nothing about unintended ones.
Add a guard for each cheap shortcut.

## 2026-11-05 — One beam satisfies one receiver; count beams before designing doors

Source: designing levels 9 and 10.

A beam ends at the first receiver it hits, so N emitters can keep at most N
receivers lit at once, and a composite receiver takes 2–3 beams. Level 9's
"AND door + OR door" (2 beams, magenta + one of two receivers = 3 beam-hits)
therefore *cannot* have both doors open together. It became a sequencing
puzzle: open the gate, walk through, then reconfigure. Count the
beam-hits a door state needs before laying out a level. If it's more than
the emitters, the level is sequential whether you meant it or not.

## 2026-11-05 — A door closing on the player trapped them in its collider

Source: building level 8's walled door 1 (found while writing its e2e route).

`movement.js` rejected any step that overlapped a collider. A door that
slides shut while the player stands in the doorway overlaps them, so every
step, including stepping out, was rejected and the player was stuck for
good. Colliders the player is already inside are now ignored for that move
(`tests/unit/movement.test.js`). The player can step out to either side.

## 2026-11-05 — Software WebGL exaggerates fill cost ~10×; measure on the real GPU

Source: juice pass performance check.

The e2e runs on SwiftShader (CPU). There the polish pass looked 2× slower
(e.g. level 8: 150 → 270 ms/frame), mostly because the new ceiling fills
pixels that used to be a cheap clear color. On this laptop's Radeon 610M,
via Chromium with `--ignore-gpu-blocklist --enable-gpu`, the same build
ran at 4–13 ms/frame at 1920×1080, the same as before the pass. The real risk
was **pixel count**: at 1.5× device pixel ratio, frames went to 28–31 ms.
Fixed by capping the pixel ratio by a pixel budget (`presentation/quality.js`).
**Rule**: judge performance on hardware, and treat DPR as the main knob.

## 2026-11-05 — Hand-built floor strips were culled (winding depends on direction)

Source: conduits (`presentation/conduits.js`) didn't render at all.

The conduit strips are built leg by leg. Whether a quad's triangles face
up or down depends on the leg's direction, so legs heading one way were
back-face culled. Invisible, no error. `side: DoubleSide` on generated
flat geometry avoids having to reason about winding per leg.

## 2026-11-05 — Event listeners must exist before the runtime's first load

Source: the level title never appeared for the first level.

`createLevelRuntime()` loads (and emits `level:enter` for) the first level
inside its own constructor. Any listener registered after that line in
`main.js` misses it. Register `events.on(...)` before creating the runtime.
