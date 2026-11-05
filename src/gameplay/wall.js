import * as THREE from 'three';
import { rotatedRectAABB } from './aabb.js';

const DEFAULT_HEIGHT = 3;
const DEFAULT_THICKNESS = 0.2;

// Pure: center, length and rotationY of a wall running from `from` to `to`
// (XZ points), in the same rotation convention as aabb.js's
// segmentFromCenter (a panel's local +X ends up at `to`).
export function wallPlacement(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return {
    center: { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 },
    length: Math.hypot(dx, dz),
    rotationY: Math.atan2(-dz, dx),
  };
}

// An interior wall from level data (spec §10: "listas de paredes"). Absorbs
// beams exactly like the room shell (a 'wall' trace segment) and blocks the
// player. Authored by its two endpoints, which is easier to lay out than
// center + angle. Keep walls axis-aligned: the player collider is an AABB,
// so a diagonal wall would block a much larger box than it looks.
export function createWall({ from, to, height = DEFAULT_HEIGHT, thickness = DEFAULT_THICKNESS, material }) {
  const a = { x: from[0], z: from[1] };
  const b = { x: to[0], z: to[1] };
  const { center, length, rotationY } = wallPlacement(a, b);

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, height, thickness), material);
  mesh.position.set(center.x, height / 2, center.z);
  mesh.rotation.y = rotationY;

  const segment = { type: 'wall', a, b };
  const collider = rotatedRectAABB(center, rotationY, length, thickness);
  return { mesh, segment, collider };
}
