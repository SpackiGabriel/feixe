import * as THREE from 'three';
import { rotatedRectAABB } from './aabb.js';
import { tileUvs } from './textures.js';
import { composeTRS, composeTSR } from '../core/matrix.js';

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

// A glass wall is drawn as a thin pane inset from the floor, the ceiling
// and its ends. A full-size transparent box would put its bottom face on
// the floor, its top on the ceiling and its end caps on the room walls:
// coplanar faces blended over those surfaces (a pale strip on the floor,
// a smear where it meets a wall) and a doubled 20 cm slab. Visual only:
// beams and collision use the level data (`segment`, `collider`).
export const GLASS_PANE_THICKNESS = 0.04;
export const GLASS_INSET = 0.01;
const GLASS_TILE = 2.5; // metres per frosted bay (vs WALL_TILE_SIZE 1.5 for solid walls)
const SOLID_TILE = 1.5;

// An interior wall from level data (spec §10: "listas de paredes"). Absorbs
// beams exactly like the room shell (a 'wall' trace segment) and blocks the
// player. Authored by its two endpoints, which is easier to lay out than
// center + angle. `style: 'glass'` makes it frosted glass (levels 1, 8).
// Keep walls axis-aligned: the player collider is an AABB,
// so a diagonal wall would block a much larger box than it looks.
export function createWall({ from, to, height = DEFAULT_HEIGHT, thickness = DEFAULT_THICKNESS, material, style = 'solid' }) {
  const a = { x: from[0], z: from[1] };
  const b = { x: to[0], z: to[1] };
  const { center, length, rotationY } = wallPlacement(a, b);

  const glass = style === 'glass';
  const inset = glass ? GLASS_INSET : 0;
  const drawnLength = length - 2 * inset;
  const drawnHeight = height - 2 * inset;
  const mesh = new THREE.Mesh(tileUvs(UNIT_BOX.clone(), drawnLength, drawnHeight, glass ? GLASS_TILE : SOLID_TILE, drawnHeight), material);
  // The model matrix is composed by hand (src/core/matrix.js), not by
  // Three from position/rotation/scale: M = T · R · S — scale the unit box
  // to length × height × thickness in its own axes, rotate it about Y,
  // then move it to the wall's centre. matrixAutoUpdate = false tells
  // Three to use this matrix as is.
  const position = [center.x, height / 2, center.z];
  const size = [drawnLength, drawnHeight, glass ? GLASS_PANE_THICKNESS : thickness];
  const trs = composeTRS(position, rotationY, size);
  const tsr = composeTSR(position, rotationY, size);
  const changesWithOrder = tsr.some((v, i) => Math.abs(v - trs[i]) > 1e-6);

  mesh.matrixAutoUpdate = false;
  function setOrder(order) {
    mesh.matrix.fromArray(order === 'TSR' ? tsr : trs);
    mesh.matrixWorldNeedsUpdate = true;
    return changesWithOrder;
  }
  setOrder('TRS');

  // Aiming stays locked to the real wall (T·R·S) even when the visual
  // mesh is flipped to T·S·R for the defence demo, so a dedicated fixed
  // occluder holds the T·R·S transform for solid walls.
  let occluder = null;
  if (!glass) {
    occluder = new THREE.Mesh(UNIT_BOX);
    occluder.matrixAutoUpdate = false;
    occluder.matrix.fromArray(trs);
    occluder.matrixWorld.fromArray(trs);
  }

  // A glass wall absorbs beams and blocks the player exactly like a solid
  // one, but doesn't block aiming: what you can see through, you can aim
  // through (level 8 playtest: re-aiming the mirror from the strip).
  const segment = { type: 'wall', a, b, style };
  const collider = rotatedRectAABB(center, rotationY, length, thickness);
  // setOrder('TSR') is the defence demo of the wrong order (visual only:
  // beams, collision and aiming keep using the real wall).
  return { mesh, segment, collider, occluder, setOrder };
}
