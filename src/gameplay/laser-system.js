import { traceBeam, MAX_REFLECTIONS } from './laser.js';
import { getReflectiveSegment } from './mirror.js';
import { getFilterSegment } from './filter.js';
import { createBeamRenderer } from './laser-beam.js';

function emitterDirection(emitter) {
  const yaw = emitter.mesh.rotation.y;
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

// Traces every emitter's beam through the level's mirrors, walls and
// receivers each frame (spec §4/§6/§8, RF04) and drives their visuals,
// then lets each receiver evaluate itself against the full set of traces
// (a receiver needs every beam's result, not just "its own", since two
// beams can converge on it — spec §7). `mirrors`/`emitters`/`receivers`
// are fixed for the lifetime of this instance — the mirror *segments* are
// mutated in place every frame instead of rebuilding the array, since only
// their endpoints (not their count) change while dragging/rotating.
//
// Each beam gets a fresh {x,z} pos/dir object per frame rather than a
// shared scratch object: traces are collected into an array that outlives
// the per-beam loop (receivers read it after all beams are traced), so a
// reused-and-mutated scratch object would leave earlier beams pointing at
// later beams' data by the time receivers read it.
export function createLaserSystem({ scene, wallSegments, mirrors, emitters, receivers = [], filters = [], blockers = [], walls = [], portals = [] }) {
  const mirrorSegments = mirrors.map(() => ({ type: 'mirror', a: { x: 0, z: 0 }, b: { x: 0, z: 0 } }));
  const filterSegments = filters.map((filter) => ({ type: 'filter', a: { x: 0, z: 0 }, b: { x: 0, z: 0 }, primary: filter.primary }));
  const receiverSegments = receivers.map((receiver) => receiver.segment);
  const blockerSegments = blockers.map((blocker) => blocker.segment);
  const interiorWallSegments = walls.map((wall) => wall.segment);
  const portalSegments = portals.map((portal) => portal.segment); // static — a portal never moves or rotates at runtime
  const segments = [...wallSegments, ...mirrorSegments, ...filterSegments, ...receiverSegments, ...blockerSegments, ...interiorWallSegments, ...portalSegments];

  const beams = emitters.map((emitter) => ({ emitter, renderer: createBeamRenderer() }));
  for (const beam of beams) scene.add(beam.renderer.object);

  const traces = [];

  const portalBySegment = new Map(portals.map((portal) => [portal.segment, portal]));

  function update(deltaSeconds = 0) {
    scene.updateMatrixWorld();

    for (let i = 0; i < mirrors.length; i++) {
      getReflectiveSegment(mirrors[i], mirrorSegments[i]);
    }
    for (let i = 0; i < filters.length; i++) {
      getFilterSegment(filters[i], filterSegments[i]);
    }

    traces.length = 0;
    for (const beam of beams) {
      const dir = emitterDirection(beam.emitter);
      const traceEmitter = {
        pos: { x: beam.emitter.mesh.position.x, z: beam.emitter.mesh.position.z },
        dir,
        color: beam.emitter.color.rgb,
      };

      const trace = traceBeam(segments, traceEmitter, MAX_REFLECTIONS);
      beam.renderer.update(trace.pieces, beam.emitter.mesh.position.y, deltaSeconds);
      // Light passing through a portal shows on both ends (portal.js).
      for (const piece of trace.pieces) {
        if (piece.end === 'portal') portalBySegment.get(piece.segment)?.markBeam(piece.color);
      }
      traces.push(trace);
    }

    for (const receiver of receivers) receiver.evaluate(traces);
    for (const blocker of blockers) blocker.evaluate(traces);
  }

  // Called when a level restarts or changes (RF09) — the beam lines are
  // this system's own scene objects, so nothing else will clean them up.
  function dispose() {
    for (const beam of beams) {
      scene.remove(beam.renderer.object);
      beam.renderer.dispose();
    }
  }

  return { update, dispose };
}
