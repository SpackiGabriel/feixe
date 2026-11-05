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
## 2026-09-22 — Player portal-crossing needs a doorway, not a point trigger

Source: playtesting level 8's portal ("não funciona").

The player-crossing trigger (`isPlayerAtPortal`, `portal-crossing.js`) was
a 0.8 m radius circle at the portal centre. The teleport math is correct —
walk in dead-centre and you cross fine — but the dividing wall spans the
whole room, so any off-centre approach (tested: 1 m off missed) walks into
the wall beside the small circle and reads as "the portal is broken". Fixed
by making the trigger an oriented box aligned to the portal's face
(`portalRotationY`), `halfWidth` = the 1.2 m panel's half plus a margin,
`depth` along the facing normal — so walking toward the visible panel
crosses, and only the wall *beside* the panel stops you (which is correct).
Note this is the *player* trigger only; the beam crosses via the portal's
tracer segment (`laser.js`), which is the portal's primary job (spec §9)
and was untouched. `PORTAL_CLEARANCE` (0.8) is kept above `depth` (0.7) so
the landing spot is clear of the doorway zone.

## 2026-09-22 — Plain reload does NOT pick up edited ES modules (dev gotcha)

Source: trying to verify the portal fix live in the browser.

With no build step and `python -m http.server` (which sends no
`Cache-Control`), the browser memory-caches ES modules for the session. A
normal reload re-runs `index.html` but re-serves *cached* `./src/*.js`, so
edits don't take effect — a live test can silently run stale code (this bit
the portal verification: the game ran the old circle trigger while the
freshly-imported function returned the new result). Only a **hard reload**
(Ctrl+Shift+R) busts the module cache. Adding `?v=N` to the `main.js`
`<script src>` only reloads `main.js`, not the modules it imports. When
playtesting after any code change, hard-reload — or we add a no-cache dev
server / cache-busting later if it keeps causing confusion.

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
## 2026-09-22 — N emitters can light at most N receivers at once (beam budget)

Source: designing `src/levels/data/level-9.js` ("Circuito", spec §11).

In `traceBeam()` (`src/gameplay/laser.js`) a beam terminates at exactly
one segment: `receiver`, `wall`, and `blocker` end the trace; `mirror` and
`portal` redirect it; `filter` only recolors it and passes through. So a
single beam can satisfy at most one receiver, and a level with N emitters
can have at most **N receivers lit simultaneously** — there is no beam
splitting, and a receiver is opaque (a beam can't pass through one to reach
a second).

This is a real design constraint, not just a rendering detail. It made
level 9's first instinct — an AND door and an *independent* OR door both
open at once — arithmetically impossible with two emitters: a genuine AND
(two receivers) already uses both beams, so an independent OR door's third
receiver can never also be lit. The fix was to have both doors watch the
same two receivers (`docs/decisions/0008`); the operator contrast then
shows up *during* the solve, not as two independently-satisfiable gates.

**Implication for level 10** ("Prisma"): its three emitters raise the
ceiling to three simultaneous receivers, which is exactly what its spec'd
"condição E (cor composta) e uma condição OU (qualquer um de dois
receptores secundários)" needs — a composite receiver (two converging
beams) plus one more for the OR, = three lit at once, = three emitters.
Budget the beams before authoring, not after.

## 2026-11-05 — Free mirror rotation is pixel-precise at room scale

Source: the puzzle analyzer (`npm run analyze`) on the pre-redesign levels.

A receiver is 0.8 m wide. For a target d metres from the mirror, the
mirror's angle may drift by about ±atan(0.4/d)/2: ±2° at 5 m, ±1° for an
edge-on pass at 8 m. The old campaign needed windows of 0.3–4.7°, and
mouse rotation moves ~0.57° per pixel. Q/E steps (15°) land exactly, which
hides the problem from keyboard players. Fix: `rotationStepDegrees`
(`docs/decisions/0009`). Check `npm run analyze` for any free mirror.

## 2026-11-05 — Doors don't block beams

Source: `src/gameplay/laser-system.js` (its segment list has no doors).

A closed door blocks the player and aiming, not light. A beam crosses a
doorway whether the door is open or not (L8's edge-on beam relies on it,
L9's red beam too). Don't design a puzzle where opening a door "lets light
through"; it already does.

## 2026-11-05 — 15° snapping puts beams on a 30° grid: diagonal shortcuts

Source: designing level 6 with the analyzer.

A mirror turned in 15° steps turns a beam in 30° steps, so beams can run
diagonally, and a single mirror on a rail can often aim straight at a
receiver the level meant to be reached in several bounces. With 45° steps
every route is right-angled and the floor rails read as a plan. The old
level 6 had exactly this shortcut (random search: one mirror opened it).

## 2026-11-05 — A composite receiver hit by one component looks "wrong"

Source: `src/gameplay/receiver.js` (`rejected` state), designing level 5.

Magenta hit only by blue flickers exactly like a wrong color. Players may
read "half there" as "blue doesn't belong here". The face shows both
symbols, which is the only hint. Watch for it in playtests (L5, L10's
yellow); a fix would be presentation only (light the matched symbols).

## 2026-11-05 — Mirror reflections cost a scene pass, not pixels

Source: `src/presentation/mirror-reflection.js`, timing renders with
`gl.finish()` on L10 at 1920×1080 (Intel UHD).

Each visible mirror face re-renders the whole scene (all draw calls and
every beam's point light). Dropping MSAA or halving the texture to 256²
changed nothing measurable; the number of visible mirrors does. If frame
time is a problem, cap how many mirrors reflect per frame (nearest
first) rather than lowering resolution. Reflector surfaces sit on layer
1 so reflection cameras skip them: no mirror-in-mirror recursion.

