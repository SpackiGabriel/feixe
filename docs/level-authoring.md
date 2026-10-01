# Level authoring & adding gameplay objects

Practical checklists. For *why* each rule exists, follow the links to
`docs/findings.md` / `docs/decisions/`.

## Authoring a level (`src/levels/data/level-N.js`)

1. Copy the closest existing level; import `BEAM_HEIGHT`, `ROOM_HALF` from
   `./constants.js` (don't redeclare them).
2. Register it in `src/levels/level-manager.js`'s `LEVELS` array.
3. Exactly one door has `exit: true`; the level must start **unsolved**
   (exit door closed), and must declare a test-only `solution` —
   `{ mirrors: { id: { t?, rotationY? } }, filters: { id: { t } }, switches: [ids] }`
   — that opens the exit door. `tests/unit/levels.test.js` enforces all of
   this headlessly, applying the solution through the objects' own
   controls (so a solution needing a disabled degree of freedom fails).
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

1. `src/gameplay/<thing>.js` — a `createX({...})` factory returning the
   Three.js node(s) plus any `segment` (for laser tracing) / `collider`
   (for player movement). Keep any branching logic in a Three-free module
   when it's worth testing in isolation (`docs/decisions/0004`).
2. `src/levels/level-loader.js` — build it in `instantiateLevel()`, add
   its node(s) with `addToScene()` (**not** `scene.add`), and include the
   new array in the returned object. Disposal is then automatic —
   `disposeLevel()` frees everything in `roots`.
3. If it affects beams: `src/gameplay/laser-system.js` takes it as a
   parameter (it receives the whole loaded level via spread) and adds its
   segments to `segments`; add a new `type` branch in `laser.js`'s
   `traceBeam` with a unit test.
4. If it blocks the player: add its collider in `src/levels/level-runtime.js`
   (`levelColliders`).

`tests/unit/levels.test.js` (including its dispose/leak check) covers every
level that uses it once a level does.

If it's interactive: set `userData.controller` (drag/rotate —
`docs/decisions/0002`) or `userData.activate` (one-shot, like `switch.js`)
on the mesh and push the mesh to `interactiveObjects`.

## Verifying

`npm run lint && npm test` (the level tests catch most placement mistakes), then play the level in the browser (`npm start`).
