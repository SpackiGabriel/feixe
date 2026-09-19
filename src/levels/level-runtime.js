import { createLaserSystem } from '../gameplay/laser-system.js';
import { instantiateLevel, disposeLevel } from './level-loader.js';
import { getLevels, loadSavedLevelIndex, saveLevelIndex } from './level-manager.js';
import { isPlayerAtExit } from './exit-trigger.js';

const EXIT_TRIGGER_RADIUS = 1.2; // meters — see exit-trigger.js for why this stands in for physically walking through

// Owns the currently-loaded level's objects and its laser system, and
// handles what RF09 requires: a fixed level sequence, quick restart of
// the current level, and resuming where the player left off.
export function createLevelRuntime({ scene, wallSegments, interactiveObjects }) {
  const levels = getLevels();
  let currentIndex = loadSavedLevelIndex(levels.length);
  let currentLevel = null;
  let laserSystem = null;
  let exitTriggered = false; // guards against re-firing every frame while the player lingers at an open exit

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
    });
    exitTriggered = false;
    saveLevelIndex(currentIndex);
  }

  function restart() {
    load(currentIndex);
  }

  function update(deltaSeconds, playerPosition) {
    laserSystem.update(); // must run before doors, since it updates receivers' active state
    for (const door of currentLevel.doors) door.update(deltaSeconds);

    const exitDoor = currentLevel.exitDoor;
    if (
      !exitTriggered &&
      exitDoor &&
      isPlayerAtExit({
        doorOpen: exitDoor.isOpen(),
        doorX: exitDoor.position.x,
        doorZ: exitDoor.position.z,
        playerX: playerPosition.x,
        playerZ: playerPosition.z,
        radius: EXIT_TRIGGER_RADIUS,
      })
    ) {
      exitTriggered = true;
      load(currentIndex + 1);
    }
  }

  load(currentIndex);

  return { update, restart, loadLevel: load, getCurrentIndex: () => currentIndex };
}
