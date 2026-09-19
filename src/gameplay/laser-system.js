import { traceBeam, MAX_REFLECTIONS, colorToHex } from './laser.js';
import { getReflectiveSegment } from './mirror.js';
import { createBeamRenderer } from './laser-beam.js';

function emitterDirection(emitter) {
  const yaw = emitter.mesh.rotation.y;
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

// Traces every emitter's beam through the level's mirrors and walls each
// frame (spec §4/§6, RF04) and drives their visuals. `mirrors`/`emitters`
// are fixed for the lifetime of this instance — the mirror *segments* are
// mutated in place every frame instead of rebuilding the array, since only
// their endpoints (not their count) change while dragging/rotating.
export function createLaserSystem({ scene, wallSegments, mirrors, emitters }) {
  const mirrorSegments = mirrors.map(() => ({ type: 'mirror', a: { x: 0, z: 0 }, b: { x: 0, z: 0 } }));
  const segments = [...wallSegments, ...mirrorSegments];

  const beams = emitters.map((emitter) => ({ emitter, renderer: createBeamRenderer() }));
  for (const beam of beams) scene.add(beam.renderer.line);

  const traceEmitter = { pos: { x: 0, z: 0 }, dir: { x: 0, z: 0 }, color: null };

  function update() {
    scene.updateMatrixWorld();

    for (let i = 0; i < mirrors.length; i++) {
      getReflectiveSegment(mirrors[i], mirrorSegments[i]);
    }

    for (const beam of beams) {
      traceEmitter.pos.x = beam.emitter.mesh.position.x;
      traceEmitter.pos.z = beam.emitter.mesh.position.z;
      const dir = emitterDirection(beam.emitter);
      traceEmitter.dir.x = dir.x;
      traceEmitter.dir.z = dir.z;
      traceEmitter.color = beam.emitter.color.rgb;

      const trace = traceBeam(segments, traceEmitter, MAX_REFLECTIONS);
      beam.renderer.update(trace.path, beam.emitter.mesh.position.y, colorToHex(trace.color));
    }
  }

  return { update };
}
