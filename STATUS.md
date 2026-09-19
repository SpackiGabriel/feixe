# Status

The one frequently-updated file. Read this first. Update it whenever focus
changes or a slice of work finishes — see the workflow in `CLAUDE.md`.

**Code is the source of truth for what's implemented.** If this file and
`src/` disagree, `src/` is right — fix this file.

## Current focus

Levels 1-7 are built and manually verified end to end. Level 8
("Sequência") adds the Portal system (spec §9) — `src/gameplay/portal.js`
(a fixed, non-interactive teleport pair; direction remapped by the pair's
orientation difference, `laser.js`'s new `rotateXZ`) and
`src/levels/portal-crossing.js` (the player's own walk-through, pure
proximity + landing-position/heading math, mirroring `exit-trigger.js`'s
pattern). Building this level also surfaced a real gap: closed doors and
blockers didn't physically block the player at all before now (only
visuals/lasers) — RF07's "abrir a primeira porta impossibilita a segunda"
puzzle needs that to be real, so `docs/decisions/0007` adds it (doors and
blockers now feed `movement.js`'s collision check; **aim-based
interaction is unaffected** — see `docs/findings.md`'s newest entries for
both this and a portal-orientation gotcha the trace-verification script
caught before it shipped). Next up: verify Level 8, then Level 9
("Circuito") — reuses everything now built (mirrors, filter, blocker,
AND/OR doors) with no new systems needed.

**Needs a manual in-browser check**: Level 8 — confirm door 1 opens with
the mirror at +45°, walking through the (now-solid) dividing wall
requires the portal, and reconfiguring to 90° (edge-on, straight through)
re-closes door 1 but opens the exit via the portal-routed beam.

## Implementation progress

| System | State |
|---|---|
| Rendering & scene foundation | Done — `src/core/{renderer,camera,scene}.js`, `index.html`, `src/main.js` |
| Movement & raycast interaction | Done — `src/core/{input,look,movement,interaction,manipulation}.js` |
| Mirror & emitter system | Done — `src/gameplay/{mirror,emitter}.js` |
| Laser simulation & color composition | Done — `src/gameplay/{laser,laser-beam,laser-system}.js`, unit tested (`tests/unit/laser.test.js`) |
| Receiver & door logic | Done — `src/gameplay/{receiver,door,door-logic}.js`, `src/core/audio.js`; unit tested (`tests/unit/door-logic.test.js`, plus `isReceiverSatisfied` in `laser.test.js`) |
| Switch (laser-free one-shot toggle) | Done and manually playtested — `src/gameplay/switch.js`; reuses `door.js`/`door-logic.js` unchanged via the same `isActive()` shape as a receiver |
| Filter & blocker | Done and manually playtested — `src/gameplay/{filter,blocker}.js`, wired into `level-loader.js`/`laser-system.js` |
| Level system (declarative data + loader) | Done — `src/levels/{level-loader,level-manager,level-runtime}.js`; unit tested (`tests/unit/level-manager.test.js`). Only gameplay objects are level data — room geometry is still hardcoded (`docs/decisions/0005`) |
| Level-to-level exit trigger | Done and manually playtested — `src/levels/exit-trigger.js` (proximity to an open `exit: true` door, `docs/decisions/0006`), wired into `level-runtime.js`; unit tested (`tests/unit/exit-trigger.test.js`) |
| Portal system | Done — `src/gameplay/portal.js` + `src/levels/portal-crossing.js` (beam and player both supported); unit tested (`tests/unit/{laser,portal-crossing}.test.js`). Not yet manually playtested (see above) |
| Door/blocker movement collision | Done — `src/gameplay/aabb.js`, `door.js`'s/`blocker.js`'s `getCollider()`, wired into `movement.js`/`level-runtime.js` (`docs/decisions/0007`); unit tested (`tests/unit/aabb.test.js`). Doesn't gate aim-based manipulation — see `docs/findings.md` |
| Feedback / accessibility UI | Not started |
| Levels 1-10 | **Levels 1-7 done and manually verified, Level 8 done** (`src/levels/data/level-{1..8}.js`). Level 8's geometry/color/collision logic is trace-verified but not yet manually played. Levels 9-10 not built |

## Known issues / blockers

None yet.

## Immediate next steps

1. Manually playtest Level 8 (see "Current focus" above), then build
   Level 9 ("Circuito") — two emitters, a filter, a blocker, an AND door
   and an OR door sharing four mirrors, all systems already built.
2. When authoring each real level's data: apply the receiver-placement
   constraint from `docs/findings.md` (a receiver must be nearest along
   its beam's path); remember a `blocker` can't gate a mirror-less
   level's puzzle; author a new portal pair's `rotationY` as "outward-
   facing, away from its wall" and verify the *player* landing spot, not
   just the beam trace (`docs/findings.md`'s portal-orientation entry);
   and don't rely on a closed door/blocker to gate mirror *manipulation*
   — only movement is gated (`docs/findings.md`'s newest entry). A
   level-load validation pass (trace each declared beam, flag receivers
   that aren't nearest) would catch the first kind automatically and is
   worth building once there are enough levels that debugging this by
   hand gets painful.

## Known simplifications (not blockers)

- Room geometry (walls) is not level data — every level currently shares
  the same fixed room from `src/core/scene.js` (`docs/decisions/0005`).
- Level 8's non-exit door ("door 1") isn't flanked by walls, so it's a
  soft gate — a player could walk around its 2m width in the open room
  instead of through it, though nothing about the intended solution path
  requires that detour. Only the level's dividing wall (a full room-width
  blocker) is a genuinely unavoidable obstacle.

## How to run

`python3 -m http.server` from the repo root, then open
`http://localhost:8000/` (ES modules don't load from `file://`; see
`docs/decisions/0001-three-via-cdn-import-map.md` for why Three.js is
loaded from a CDN import map instead of npm). Press `R` in-game to
restart the current level.

Run unit tests with `npm test` (Vitest — `npm install` first).
