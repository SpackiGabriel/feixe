// Applies a level's test-only `solution` through the objects' own player
// controls (so a solution needing a disabled degree of freedom fails).
// Shared by tests/unit/levels.test.js (headless) and tests/e2e/playthrough.mjs
// (imported inside the browser page). Throws on any mismatch.
export function applySolution(levelData, level, solution) {
  const find = (list, id, kind) => {
    const index = (list ?? []).findIndex((o) => o.id === id);
    if (index < 0) throw new Error(`solution: ${kind} "${id}" does not exist`);
    return index;
  };
  for (const [id, target] of Object.entries(solution.mirrors ?? {})) {
    const index = find(levelData.mirrors, id, 'mirror');
    const mirror = level.mirrors[index];
    if (target.t !== undefined) {
      mirror.applyPositionDelta(target.t - mirror.getT());
      if (Math.abs(mirror.getT() - target.t) > 1e-6) throw new Error(`solution: mirror "${id}" cannot slide to t=${target.t}`);
    }
    if (target.rotationY !== undefined) {
      mirror.applyRotationDelta(target.rotationY - mirror.plate.rotation.y);
      if (Math.abs(mirror.plate.rotation.y - target.rotationY) > 1e-5) throw new Error(`solution: mirror "${id}" cannot rotate to ${target.rotationY}`);
    }
  }
  for (const [id, target] of Object.entries(solution.emitters ?? {})) {
    const emitter = level.emitters[find(levelData.emitters, id, 'emitter')];
    emitter.applyRotationDelta(target.rotationY - emitter.mesh.rotation.y);
    if (Math.abs(emitter.mesh.rotation.y - target.rotationY) > 1e-5) throw new Error(`solution: emitter "${id}" cannot rotate to ${target.rotationY}`);
  }
  for (const [id, target] of Object.entries(solution.filters ?? {})) {
    const filter = level.filters[find(levelData.filters, id, 'filter')];
    filter.applyPositionDelta(target.t - filter.getT());
    if (Math.abs(filter.getT() - target.t) > 1e-6) throw new Error(`solution: filter "${id}" cannot slide to t=${target.t}`);
  }
  for (const id of solution.switches ?? []) {
    level.switches[find(levelData.switches, id, 'switch')].activate();
  }
}
