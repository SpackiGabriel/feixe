// Headless validation of every level's data: builds the real scene objects
// and laser system (no renderer needed) and checks the level starts
// unsolved and that its declared `solution` actually opens the exit door.
// Catches the recurring authoring bugs in docs/findings.md (receiver not
// nearest, unreachable blocker, ...) without a human playing each level.
import { describe, it, expect } from 'vitest';
import { getLevels } from '../../src/levels/level-manager.js';
import { instantiateLevel, disposeLevel } from '../../src/levels/level-loader.js';
import { createLaserSystem } from '../../src/gameplay/laser-system.js';
import { createScene } from '../../src/core/scene.js';

function load(levelData) {
  const { scene, wallSegments } = createScene();
  const interactiveObjects = [];
  const level = instantiateLevel(levelData, scene, interactiveObjects);
  const laserSystem = createLaserSystem({ scene, wallSegments, ...level });
  return { scene, interactiveObjects, level, laserSystem };
}

// One frame in the order level-runtime.js runs them: lasers, then doors.
function tick({ level, laserSystem }) {
  laserSystem.update();
  for (const door of level.doors) door.update(0.016);
}

function applySolution(levelData, level, solution) {
  for (const [id, target] of Object.entries(solution.mirrors ?? {})) {
    const index = levelData.mirrors.findIndex((m) => m.id === id);
    expect(index, `mirror "${id}" exists`).toBeGreaterThanOrEqual(0);
    const mirror = level.mirrors[index];
    if (target.t !== undefined) mirror.applyPositionDelta(target.t - levelData.mirrors[index].initialT);
    if (target.rotationY !== undefined) {
      mirror.applyRotationDelta(target.rotationY - mirror.plate.rotation.y);
      // Goes through the player's own controls, so it fails if that degree of freedom is disabled.
      expect(mirror.plate.rotation.y, `mirror "${id}" reaches rotationY`).toBeCloseTo(target.rotationY, 5);
    }
  }
  for (const [id, target] of Object.entries(solution.filters ?? {})) {
    const index = levelData.filters.findIndex((f) => f.id === id);
    expect(index, `filter "${id}" exists`).toBeGreaterThanOrEqual(0);
    level.filters[index].applyPositionDelta(target.t - levelData.filters[index].initialT);
  }
  for (const id of solution.switches ?? []) {
    const index = levelData.switches.findIndex((s) => s.id === id);
    expect(index, `switch "${id}" exists`).toBeGreaterThanOrEqual(0);
    level.switches[index].activate();
  }
}

describe.each(getLevels().map((data) => [data.id, data]))('%s', (_id, data) => {
  it('test_level_hasExactlyOneExitDoor', () => {
    expect(data.doors.filter((d) => d.exit)).toHaveLength(1);
  });

  it('test_level_hasUniqueObjectIds', () => {
    const ids = ['mirrors', 'emitters', 'receivers', 'switches', 'filters', 'blockers', 'portals', 'doors']
      .flatMap((key) => (data[key] ?? []).map((o) => o.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('test_level_atStart_exitDoorIsClosed', () => {
    const loaded = load(data);
    tick(loaded);
    expect(loaded.level.exitDoor.isOpen()).toBe(false);
  });

  it('test_level_declaredSolution_opensExitDoor', () => {
    expect(data.solution, 'level declares a `solution`').toBeDefined();
    const loaded = load(data);
    applySolution(data, loaded.level, data.solution);
    tick(loaded);
    expect(loaded.level.exitDoor.isOpen()).toBe(true);
  });

  it('test_level_dispose_leavesSceneAndInteractiveListClean', () => {
    const { scene, interactiveObjects, level, laserSystem } = load(data);
    const childrenBefore = createScene().scene.children.length; // room + lights only
    laserSystem.dispose();
    disposeLevel(level, scene, interactiveObjects);
    expect(interactiveObjects).toHaveLength(0);
    expect(scene.children).toHaveLength(childrenBefore);
  });
});
