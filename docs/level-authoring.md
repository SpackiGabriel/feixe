# Level authoring & adding gameplay objects

Practical checklists. For *why* each rule exists, follow the links to
`docs/findings.md` / `docs/decisions/`.

## Authoring a level (`src/levels/data/level-N.js`)

1. Copy the closest existing level; import `BEAM_HEIGHT`, `ROOM_HALF` from
   `./constants.js` (don't redeclare them).
2. Register it in `src/levels/level-manager.js`'s `LEVELS` array.
3. Exactly one door has `exit: true`; the level must start **unsolved**
   (exit door closed).
4. **Receiver must be the nearest segment on its beam's path.** A beam
   hits whatever is nearest; a receiver behind a mirror/wall never
   activates. (findings 2026-09-15)
5. **A `blocker` only gates a puzzle if the level has a mirror** to route
   the beam around it; on a straight unmirrored line it's decoration.
   (findings 2026-09-19, "blocker downstream of a filter")
6. **Portals:** author each end's `rotationY` as "outward-facing, away
   from the wall it's mounted on", and check the *player's landing spot*
   as well as the beam trace. (findings 2026-09-19, "portal's rotationY")
7. **Closed doors/blockers gate player movement only — not aiming.** A
   mirror behind a closed door is still adjustable from across the room.
   Don't design a puzzle around "can't reach the mirror yet".
   (findings 2026-09-19, "aim-based interaction ignores occlusion";
   `docs/decisions/0007`)
8. Room geometry is shared by every level (`docs/decisions/0005`); only
   gameplay objects are level data.

## Adding a new gameplay object type

Currently this touches four places — keep them in sync:

1. `src/gameplay/<thing>.js` — a `createX({...})` factory returning the
   Three.js node(s) plus any `segment` (for laser tracing) / `collider`
   (for player movement). Keep any branching logic in a Three-free module
   so it's unit-testable (`docs/decisions/0004`).
2. `src/levels/level-loader.js` — build it in `instantiateLevel()` **and**
   free it in `disposeLevel()` (scene removal, `interactiveObjects`
   removal, geometry/material dispose). Forgetting the dispose half is a
   silent leak across level restarts.
3. `src/gameplay/laser-system.js` — if it affects beams, add its segments
   to the `segments` list (and a new `type` branch in `laser.js`'s
   `traceBeam` with a unit test).
4. `src/levels/level-runtime.js` — pass it to `createLaserSystem`, and
   (if it blocks the player) add its collider to `levelColliders`.

If it's interactive: set `userData.controller` (drag/rotate —
`docs/decisions/0002`) or `userData.activate` (one-shot, like `switch.js`)
on the mesh and push the mesh to `interactiveObjects`.

## Verifying

`npm run lint && npm test`, then play the level in the browser (`npm start`).
