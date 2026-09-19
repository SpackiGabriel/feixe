import { createLaserSystem } from '../gameplay/laser-system.js';
import { instantiateLevel, disposeLevel } from './level-loader.js';
import { getLevels, loadSavedLevelIndex, saveLevelIndex } from './level-manager.js';
import { isPlayerAtExit } from './exit-trigger.js';
import { isPlayerAtPortal, computePortalLanding } from './portal-crossing.js';

const EXIT_TRIGGER_RADIUS = 1.2; // meters — see exit-trigger.js for why this stands in for physically walking through
const PORTAL_TRIGGER_RADIUS = 0.8; // meters
const PORTAL_CLEARANCE = 0.8; // meters pushed out from the landing portal's face, so the player doesn't land inside a wall

// Owns the currently-loaded level's objects and its laser system, and
// handles what RF09 requires: a fixed level sequence, quick restart of
// the current level, and resuming where the player left off.
export function createLevelRuntime({ scene, wallSegments, interactiveObjects }) {
  const levels = getLevels();
  let currentIndex = loadSavedLevelIndex(levels.length);
  let currentLevel = null;
  let laserSystem = null;
  let exitTriggered = false; // guards against re-firing every frame while the player lingers at an open exit
  let portalCooldownId = null; // id of the portal the player must move away from before any portal can retrigger

  // Movement colliders for this level (src/core/movement.js reads this via
  // getColliders() each frame). Blockers are static, so their slots are
  // filled once per load(); doors change at runtime, so their slots are
  // *indices reserved* here and overwritten in place every update() —
  // never reallocated, per the render-loop no-allocation rule
  // (.claude/rules/code-conventions.md).
  let levelColliders = [];
  let doorColliderStart = 0;

  function teardown() {
    if (currentLevel) disposeLevel(currentLevel, scene, interactiveObjects);
    if (laserSystem) laserSystem.dispose();
  }

  function load(index) {
    teardown();
    currentIndex = Math.max(0, Math.min(index, levels.length - 1));
    currentLevel = instantiateLevel(levels[currentIndex], scene, interactiveObjects);
    laserSystem = createLaserSystem({
      scene,
      wallSegments,
      mirrors: currentLevel.mirrors,
      emitters: currentLevel.emitters,
      receivers: currentLevel.receivers,
      filters: currentLevel.filters,
      blockers: currentLevel.blockers,
      portals: currentLevel.portals,
    });
    levelColliders = currentLevel.blockers.map((blocker) => blocker.collider);
    doorColliderStart = levelColliders.length;
    for (const door of currentLevel.doors) levelColliders.push(door.getCollider());
    exitTriggered = false;
    portalCooldownId = null;
    saveLevelIndex(currentIndex);
  }

  function restart() {
    load(currentIndex);
  }

  function update(deltaSeconds, camera) {
    laserSystem.update(); // must run before doors, since it updates receivers' active state
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
        doorOpen: exitDoor.isOpen(),
        doorX: exitDoor.position.x,
        doorZ: exitDoor.position.z,
        playerX: camera.position.x,
        playerZ: camera.position.z,
        radius: EXIT_TRIGGER_RADIUS,
      })
    ) {
      exitTriggered = true;
      load(currentIndex + 1);
      return;
    }

    for (const portal of currentLevel.portals) {
      const atPortal = isPlayerAtPortal({
        playerX: camera.position.x,
        playerZ: camera.position.z,
        portalX: portal.position.x,
        portalZ: portal.position.z,
        radius: PORTAL_TRIGGER_RADIUS,
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
        break; // at most one teleport per frame
      }
    }
  }

  load(currentIndex);

  return {
    update,
    restart,
    loadLevel: load,
    getCurrentIndex: () => currentIndex,
    getColliders: () => levelColliders,
  };
}
