import { createLaserSystem } from '../gameplay/laser-system.js';
import { instantiateLevel, disposeLevel } from './level-loader.js';
import { getLevels, loadSavedLevelIndex, saveLevelIndex } from './level-manager.js';

// Owns the currently-loaded level's objects and its laser system, and
// handles what RF09 requires: a fixed level sequence, quick restart of
// the current level, and resuming where the player left off.
export function createLevelRuntime({ scene, wallSegments, interactiveObjects }) {
  const levels = getLevels();
  let currentIndex = loadSavedLevelIndex(levels.length);
  let currentLevel = null;
  let laserSystem = null;

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
    });
    saveLevelIndex(currentIndex);
  }

  function restart() {
    load(currentIndex);
  }

  function update(deltaSeconds) {
    laserSystem.update(); // must run before doors, since it updates receivers' active state
    for (const door of currentLevel.doors) door.update(deltaSeconds);
  }

  load(currentIndex);

  return { update, restart, loadLevel: load, getCurrentIndex: () => currentIndex };
}
