import { createLaserSystem } from '../gameplay/laser-system.js';
import { instantiateLevel, disposeLevel } from './level-loader.js';
import { getLevels, loadSavedLevelIndex, saveLevelIndex, resetProgress, nextAfterExit } from './level-manager.js';
import { events } from '../core/events.js';
import { isPlayerAtExit } from './exit-trigger.js';
import { isPlayerAtPortal, computePortalLanding } from './portal-crossing.js';
import { advancePortalClock } from '../gameplay/portal.js';

const EXIT_TRIGGER_RADIUS = 1.2; // meters — see exit-trigger.js for why this stands in for physically walking through
// Portal crossing is a doorway, not a point (portal-crossing.js): the panel
// is 1.2 m wide, so half-width 0.9 = the panel's 0.6 half plus a 0.3 margin
// so an off-centre approach still crosses instead of hitting the divider.
const PORTAL_DOOR_HALF_WIDTH = 0.9; // meters, across the portal face
const PORTAL_DOOR_DEPTH = 0.7; // meters, along the portal's facing normal
const PORTAL_CLEARANCE = 0.8; // meters pushed out from the landing portal's face (> DOOR_DEPTH, so the player lands clear of the doorway)

// What blocks aiming (interaction.js): the room shell, solid doors and
// walls, and blockers. Glass doors and walls have no occluder (null) —
// what you can see through, you can aim through (level 8 playtest).
export function collectAimOccluders(roomOccluders, level) {
  return [
    ...roomOccluders,
    ...level.doors.map((d) => d.occluder),
    ...level.blockers.map((b) => b.mesh),
    ...level.walls.map((w) => w.occluder),
  ].filter(Boolean);
}

// Owns the currently-loaded level's objects and its laser system, and
// handles what RF09 requires: a fixed level sequence, quick restart of
// the current level, and resuming where the player left off.
// `onLevelLoaded({ index, count, data, level })` fires after every load/restart (HUD title,
// player spawn); `onGameComplete(stats)` fires when the last level's exit is
// reached — the runtime then idles until startNewGame()/loadLevel().
// `onExit(next)`, if given, is called when the player walks into an open
// exit and the runtime waits for advance() — so main.js can close the
// transition shutter first. Without it the next level loads immediately.
export function createLevelRuntime({ scene, wallSegments, interactiveObjects, roomOccluders = [], onLevelLoaded = () => {}, onGameComplete = () => {}, onExit = null }) {
  const levels = getLevels();
  let currentIndex = loadSavedLevelIndex(levels.length);
  let currentLevel = null;
  let laserSystem = null;
  let exitTriggered = false; // guards against re-firing every frame while the player lingers at an open exit
  let portalCooldownId = null; // id of the portal the player must move away from before any portal can retrigger
  let complete = false;
  let pendingExit = null; // set while waiting for advance()
  // For the ending screen: play time (paused while complete) and restarts.
  const stats = { seconds: 0, restarts: 0 };

  // Movement colliders for this level (src/core/movement.js reads this via
  // getColliders() each frame). Blockers are static, so their slots are
  // filled once per load(); doors change at runtime, so their slots are
  // *indices reserved* here and overwritten in place every update() —
  // never reallocated, per the render-loop no-allocation rule
  // (.claude/rules/code-conventions.md).
  let levelColliders = [];
  let levelOccluders = []; // solid meshes that block aiming (interaction.js)
  let devices = []; // everything with a per-frame presentation update
  let doorColliderStart = 0;

  function teardown() {
    if (currentLevel) disposeLevel(currentLevel, scene, interactiveObjects);
    if (laserSystem) laserSystem.dispose();
  }

  function load(index) {
    teardown();
    currentIndex = Math.max(0, Math.min(index, levels.length - 1));
    currentLevel = instantiateLevel(levels[currentIndex], scene, interactiveObjects);
    laserSystem = createLaserSystem({ scene, wallSegments, ...currentLevel });
    levelColliders = [...currentLevel.blockers, ...currentLevel.walls].map((o) => o.collider);
    doorColliderStart = levelColliders.length;
    for (const door of currentLevel.doors) levelColliders.push(door.getCollider());
    devices = [...currentLevel.mirrors, ...currentLevel.filters, ...currentLevel.emitters];
    levelOccluders = collectAimOccluders(roomOccluders, currentLevel);
    exitTriggered = false;
    portalCooldownId = null;
    complete = false;
    pendingExit = null;
    saveLevelIndex(currentIndex);
    onLevelLoaded({ index: currentIndex, count: levels.length, data: levels[currentIndex], level: currentLevel });
    events.emit('level:enter', { index: currentIndex, count: levels.length, data: levels[currentIndex] });
  }

  function startNewGame() {
    resetProgress();
    stats.seconds = 0;
    stats.restarts = 0;
    load(0);
  }

  // Finish what an exit started: next level, or the end of the game.
  function advance() {
    const next = pendingExit ?? nextAfterExit(currentIndex, levels.length);
    pendingExit = null;
    if (next.complete) {
      complete = true;
      resetProgress();
      events.emit('game:complete', { stats });
      onGameComplete(stats);
    } else {
      load(next.index);
    }
  }

  function restart() {
    stats.restarts++;
    load(currentIndex);
  }

  function update(deltaSeconds, camera) {
    if (complete) return;
    stats.seconds += deltaSeconds;
    laserSystem.update(deltaSeconds); // must run before doors, since it updates receivers' active state
    for (const receiver of currentLevel.receivers) receiver.update(deltaSeconds);
    advancePortalClock(deltaSeconds); // shared by every portal surface (was never called before)
    for (const portal of currentLevel.portals) portal.update(deltaSeconds); // after the laser marked beams
    for (const device of devices) device.update(deltaSeconds);
    for (const blocker of currentLevel.blockers) blocker.update(deltaSeconds);
    for (const { conduit, isActive } of currentLevel.conduits) conduit.update(deltaSeconds, isActive());
    for (let i = 0; i < currentLevel.doors.length; i++) {
      const door = currentLevel.doors[i];
      door.update(deltaSeconds);
      levelColliders[doorColliderStart + i] = door.getCollider();
    }

    const exitDoor = currentLevel.exitDoor;
    if (
      !exitTriggered &&
      exitDoor &&
      isPlayerAtExit({
        doorOpen: exitDoor.isPassable(), // the visible panel, not just the unlock
        doorX: exitDoor.position.x,
        doorZ: exitDoor.position.z,
        playerX: camera.position.x,
        playerZ: camera.position.z,
        radius: EXIT_TRIGGER_RADIUS,
      })
    ) {
      exitTriggered = true;
      events.emit('level:exit', { index: currentIndex });
      pendingExit = nextAfterExit(currentIndex, levels.length);
      if (onExit) onExit(pendingExit);
      else advance();
      return;
    }

    for (const portal of currentLevel.portals) {
      const atPortal = isPlayerAtPortal({
        playerX: camera.position.x,
        playerZ: camera.position.z,
        portalX: portal.position.x,
        portalZ: portal.position.z,
        portalRotationY: portal.rotationY,
        halfWidth: PORTAL_DOOR_HALF_WIDTH,
        depth: PORTAL_DOOR_DEPTH,
      });
      if (portal.id === portalCooldownId) {
        if (!atPortal) portalCooldownId = null; // player left the landing zone, re-arm
        continue;
      }
      if (atPortal) {
        const landing = computePortalLanding({
          linkedX: portal.linked.position.x,
          linkedZ: portal.linked.position.z,
          linkedRotationY: portal.linked.rotationY,
          exitRotationDelta: portal.exitRotationDelta,
          playerYaw: camera.rotation.y,
          clearance: PORTAL_CLEARANCE,
        });
        camera.position.x = landing.x;
        camera.position.z = landing.z;
        camera.rotation.y = landing.yaw;
        portalCooldownId = portal.linked.id; // suppress re-trigger at the landing portal until the player leaves
        events.emit('portal:player', { portal });
        break; // at most one teleport per frame
      }
    }
  }

  load(currentIndex);

  return {
    update,
    restart,
    startNewGame,
    advance,
    getStats: () => stats,
    isExiting: () => pendingExit !== null,
    loadLevel: load,
    getCurrentIndex: () => currentIndex,
    getCurrentLevel: () => currentLevel,
    getLevelCount: () => levels.length,
    isComplete: () => complete,
    getColliders: () => levelColliders,
    getOccluders: () => levelOccluders,
  };
}
