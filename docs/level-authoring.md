# Level authoring

How to build, preview, test and ship a level. You don't need to touch
engine code: a level is one plain data file.

## The loop

1. **Copy** `src/levels/data/level-template.js` (every field, commented) or
   the closest existing level to `src/levels/data/level-N.js`. Rename the
   export (`levelN`), set `id: 'level-N'` and `name`.
2. **Register** it in `src/levels/level-manager.js`: import it and put it in
   `LEVELS` where it belongs in the sequence.
3. **Preview**: `npm start`, open
   `http://localhost:8000/?debug&level=N`. Reload after each edit. In debug
   mode:
   - the panel (top left, `F3` toggles it) shows your position/yaw, the
     object under the crosshair (id, rail `t`, rotation in degrees), and
     every receiver, trap and door state;
   - you can walk without clicking into the game first;
   - `R` restarts the level, `window.__feixe` exposes the runtime in the
     browser console.
4. **Solve it in the browser**, then copy the `t` / rotation values from the
   debug panel into the level's `solution` (radians: `deg * Math.PI / 180`).
   Optionally add `scenarios` for intermediate states you want guaranteed
   (a gate that must open, a trap that must close a door, an alternative
   route that must also work).
5. **Test**: `npm test`. For every level, `tests/unit/levels.test.js`
   checks that:
   - there's exactly one exit door and ids are unique;
   - the exit starts **closed**;
   - `solution`, applied through the player's own controls, **opens** it
     (so it fails if the solution needs a disabled degree of freedom);
   - every `scenario` ends with the door states it declares;
   - rotating the emitters alone can't open the exit (shortcut guard);
   - unloading the level frees everything.
6. **Play it for real** once (`http://localhost:8000/`, `Novo jogo` or the
   debug jump). Then run `npm run e2e`: it plays every level in Chromium,
   from closed exit to next level, ending on the end screen.

## Vocabulary (what each field does)

See `level-template.js` for exact shapes and defaults.

| Field | What it is | Player can |
|---|---|---|
| `mirrors` | Plate on a base. Zero-length rail = fixed position | slide (`positionEnabled`), rotate (`rotationEnabled`), optional snap `rotationStepDegrees` |
| `emitters` | Fixed beam source: `red`, `green`, `blue` or `white` | rotate only if `rotationEnabled` (default **off**) |
| `receivers` | Panel lit by the right color. Composites need all components at once | — |
| `filters` | Lets only its primary through; white → that primary | slide on its rail |
| `blockers` | Absorbs beams, blocks the player. `trap: true` = NOT | — |
| `walls` | Interior walls by endpoints `[x, z]`; `style: 'glass'` for frosted glass (looks see-through, blocks the same) | — (blocks walking and aiming) |
| `portals` | Pair; beam and player go in one, out the other | walk through |
| `switches` | Button, no laser | click to toggle |
| `doors` | `AND` / `OR` over `receiverIds` (`{ any: [...] }` = nested OR), `forbidIds` (traps), one has `exit: true` | walk through when open |
| `spawn` | Start position + yaw (default `[0, 4.5]`, facing north). Aim it so the first view shows the mechanism | — |

Automatic presentation (no level data needed): floor conduits from every
door input (and trap) to its door, one pip per input on the door's lintel
(traps as diamonds), dials under rotatable objects, rails under sliding
ones. Conduits run in an L (along x, then z) on the floor and may pass under
walls. That's fine, but keep inputs from stacking on the same line.
See `docs/presentation.md` for the rules behind them.

Color symbols (accessibility) are automatic: red = circle, green =
triangle, blue = diamond, composites show their components. The mapping
lives in `src/gameplay/colors.js`.

## Placement rules (the gotchas)

1. **A beam hits whatever is nearest.** A receiver behind a mirror, wall
   or another receiver never lights. The tests catch this as "solution
   doesn't open the exit".
2. **Mirrors reflect on both faces.** A beam arriving from the back
   bounces too (level 10 uses this on purpose).
3. **45° reference**: a mirror at `rotationY = π/4` turns a north-going
   beam east (and east-going → north); `-π/4` turns north-going → west.
   At `π/2` it's edge-on to a north-south beam, which passes straight by.
4. **Receiver width is 0.8 m, mirror 1 m.** Leave ≥ 0.2 m between a beam
   line and the edge of anything it must miss. Gentle tolerances keep the
   spec's "no pixel-perfect placement" rule.
5. **One beam ends on one receiver.** N beams can satisfy at most N
   receivers at once (a composite takes 2–3). If two doors need more than
   that, the player must open them in sequence (levels 8, 9).
6. **A trap only matters if some reachable configuration hits it.** On a
   straight, mirror-less line nothing ever changes the beam's path.
7. **Walls, closed doors and blockers block aiming.** The player can't
   grab an object they can't see. Make sure every object the solution
   needs is visible from somewhere the player can stand at that point,
   e.g. through an open door (level 8).
8. **Portals**: author each end's `rotationY` facing away from its wall.
   The player is pushed 0.8 m out of the far portal. Keep 1 m clear
   around a portal, or the player will step into it by accident
   (findings 2026-09-19).
9. **Doors** are 2 m wide, 3 m tall. A door is only a real gate when walls
   meet both of its sides. On a room wall, put it 0.1 m inside
   (`±(ROOM_HALF - 0.1)`) with `rotationY: Math.PI` on the north wall.
10. **Spawn** must not sit on an emitter or inside a mirror/filter (mirrors
    and filters have no player collision). Keep ≥ 1 m from an emitter:
    standing right behind one fills the screen with its housing.
11. Keep walls axis-aligned: player collision is box-based, so a diagonal
    wall blocks its whole bounding box.

## Limits (by design)

- Everything happens on one horizontal plane (`BEAM_HEIGHT`). No tilt, no
  vertical routes: the tracer is 2D. Emitter tilt from RF03 is deliberately
  not implemented.
- The outer room is always 10×10 m. Use `walls` for sub-areas.
- At most 8 reflections or portal hops per beam (`MAX_REFLECTIONS`).

## Adding a new kind of object (engine work, not level work)

1. `src/gameplay/<thing>.js`: a `createX({...})` factory returning the
   Three.js node(s) plus any `segment` (laser) / `collider` (movement).
   Keep branching logic Three-free when worth testing (`docs/decisions/0004`).
2. `src/levels/level-loader.js`: build it in `instantiateLevel()` via
   `addToScene()` (disposal is then automatic) and return it.
3. Beams: add its segments in `laser-system.js` and a `type` branch in
   `laser.js`'s `traceBeam`, with a unit test.
4. Player: add its collider/occluder in `level-runtime.js`.
5. Interactive: `userData.controller` (drag/rotate, `docs/decisions/0002`)
   or `userData.activate` (one-shot), plus `userData.prompt` for the HUD.
