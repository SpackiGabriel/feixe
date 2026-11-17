import * as THREE from 'three';
import { rotatedRectAABB, segmentFromCenter } from './aabb.js';
import { isBlockerHit } from './door-logic.js';
import { hazardTexture, concreteTexture, tileUvs } from '../presentation/textures.js';
import { events } from '../core/events.js';
import { damp } from '../presentation/motion.js';

const DEFAULT_WIDTH = 1;
const DEFAULT_HEIGHT = 1.4;
const DEFAULT_THICKNESS = 0.2;
const LENS_RADIUS = 0.17;
const LENS_IDLE = new THREE.Color(0x3a3833);
const LENS_HIT = new THREE.Color(0xfff6e8);

// A fixed obstacle that absorbs any beam that hits it (laser.js's 'blocker'
// segment ends the trace) and blocks the player (`collider`).
//
// With `trap: true` it is spec §7's NOT: a door listing it in `forbidIds`
// stays shut while any beam lands on it. A trap is identified by shape and
// pattern, never by a laser hue: a black slab with off-white hazard
// chevrons and a lens on each face. When a beam lands on it, the lens goes
// white-hot and its floor conduit flashes toward the door it holds shut
// (conduits.js). A plain blocker is just a block of concrete.
export function createBlocker({ position, rotationY = 0, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, thickness = DEFAULT_THICKNESS, trap = false }) {
  const geometry = new THREE.BoxGeometry(width, height, thickness);
  const material = trap
    ? new THREE.MeshStandardMaterial({ color: 0xffffff, map: hazardTexture(), roughness: 0.7, metalness: 0.2 })
    : new THREE.MeshStandardMaterial({ color: 0xffffff, map: concreteTexture(), roughness: 0.95 });
  if (!trap) tileUvs(geometry, width, height, 1.2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.y = rotationY;

  let lensMaterial = null;
  if (trap) {
    lensMaterial = new THREE.MeshBasicMaterial({ color: LENS_IDLE.clone(), toneMapped: false });
    const lensGeometry = new THREE.CylinderGeometry(LENS_RADIUS, LENS_RADIUS, thickness + 0.03, 24).rotateX(Math.PI / 2);
    mesh.add(new THREE.Mesh(lensGeometry, lensMaterial));
  }

  const segment = { type: 'blocker', ...segmentFromCenter(position, rotationY, width) };
  const collider = rotatedRectAABB(position, rotationY, width, thickness);

  let hit = false;
  let heat = 0;
  const blocker = { mesh, segment, collider, trap, evaluate, update, isHit: () => hit };

  // Called by laser-system.js every frame with all beam traces.
  function evaluate(traces) {
    const next = isBlockerHit(traces, segment);
    if (next !== hit) {
      hit = next;
      if (trap) events.emit(hit ? 'trap:on' : 'trap:off', { blocker });
    }
    return hit;
  }

  function update(deltaSeconds) {
    if (!lensMaterial) return;
    heat = damp(heat, hit ? 1 : 0, hit ? 30 : 6, deltaSeconds);
    lensMaterial.color.copy(LENS_IDLE).lerp(LENS_HIT, heat);
  }

  return blocker;
}
