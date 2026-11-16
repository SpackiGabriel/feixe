import * as THREE from 'three';
import { rotatedRectAABB } from './aabb.js';
import { tileUvs } from './textures.js';

const DEFAULT_HEIGHT = 3;
const DEFAULT_THICKNESS = 0.2;

// The base mesh every interior wall is instanced from: a 1 m cube, centred
// on its origin. Each wall's size is a scale transform read from the level
// data (spec §13, axis I: "escala aplicada às malhas-base ao instanciar
// variantes de tamanho a partir da definição do nível"). Each wall clones
// it only to carry its own texture tiling; a box's UVs are 0..1 per face
// at any size, so tiling for the scaled size looks exactly as before.
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

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
// center + angle. `style: 'glass'` makes it frosted glass (level 8).
// Keep walls axis-aligned: the player collider is an AABB,
// so a diagonal wall would block a much larger box than it looks.
export function createWall({ from, to, height = DEFAULT_HEIGHT, thickness = DEFAULT_THICKNESS, material, style = 'solid' }) {
  const a = { x: from[0], z: from[1] };
  const b = { x: to[0], z: to[1] };
  const { center, length, rotationY } = wallPlacement(a, b);

  const mesh = new THREE.Mesh(tileUvs(UNIT_BOX.clone(), length, height, style === 'glass' ? 2.5 : 1.5, height), material);
  // Scale, rotate, translate (Three applies them in that order: T·R·S).
  mesh.scale.set(length, height, thickness);
  mesh.rotation.y = rotationY;
  mesh.position.set(center.x, height / 2, center.z);

  // A glass wall absorbs beams and blocks the player exactly like a solid
  // one, but doesn't block aiming: what you can see through, you can aim
  // through (level 8 playtest: re-aiming the mirror from the strip).
  const segment = { type: 'wall', a, b, style };
  const collider = rotatedRectAABB(center, rotationY, length, thickness);
  return { mesh, segment, collider, occluder: style === 'glass' ? null : mesh };
}
