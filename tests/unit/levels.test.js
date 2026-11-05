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
import { applySolution } from '../support/apply-solution.js';

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

describe.each(getLevels().map((data) => [data.id, data]))('%s', (_id, data) => {
  it('test_level_hasExactlyOneExitDoor', () => {
    expect(data.doors.filter((d) => d.exit)).toHaveLength(1);
  });

  it('test_level_hasUniqueObjectIds', () => {
    const ids = ['mirrors', 'emitters', 'receivers', 'switches', 'filters', 'blockers', 'walls', 'portals', 'doors']
      .flatMap((key) => (data[key] ?? []).map((o) => o.id))
      .filter((id) => id !== undefined); // walls have no id
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

  // Shortcut guard: with every mirror/filter left untouched, rotating the
  // emitters alone (all of them together, 1° steps) must never open the exit
  // — otherwise the player can skip the puzzle by aiming the beam directly.
  it('test_level_emitterRotationAlone_cannotOpenExit', () => {
    const loaded = load(data);
    const rotatable = loaded.level.emitters.filter((e) => e.rotationEnabled);
    for (const emitter of rotatable) {
      for (let deg = 0; deg < 360; deg++) {
        emitter.applyRotationDelta(Math.PI / 180);
        tick(loaded);
        expect(loaded.level.exitDoor.isOpen(), `exit opened with emitter at +${deg + 1}°`).toBe(false);
      }
    }
  });

  it('test_level_fixedEmitters_areNotInteractive', () => {
    const loaded = load(data);
    for (const emitter of loaded.level.emitters) {
      expect(loaded.interactiveObjects.includes(emitter.mesh)).toBe(emitter.rotationEnabled);
    }
  });

  it('test_level_dispose_leavesSceneAndInteractiveListClean_andFreesGpuResources', () => {
    const { scene, interactiveObjects, level, laserSystem } = load(data);
    const childrenBefore = createScene().scene.children.length; // room + lights only
    const resources = new Set(); // meshes may share a geometry/material
    for (const root of level.roots) {
      root.traverse((o) => {
        if (o.geometry) resources.add(o.geometry);
        if (o.material && !o.material.userData.shared) resources.add(o.material);
      });
    }
    const pending = new Set(resources);
    for (const resource of resources) resource.addEventListener('dispose', () => pending.delete(resource));

    laserSystem.dispose();
    disposeLevel(level, scene, interactiveObjects);

    expect(interactiveObjects).toHaveLength(0);
    expect(scene.children).toHaveLength(childrenBefore);
    expect(pending.size).toBe(0);
  });
});
