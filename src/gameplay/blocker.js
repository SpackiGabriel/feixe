import * as THREE from 'three';
import { rotatedRectAABB } from './aabb.js';

const DEFAULT_WIDTH = 1;
const DEFAULT_HEIGHT = 1.4;
const DEFAULT_THICKNESS = 0.2;

// Spec §11 level 7 ("Filtro"): a fixed obstacle that absorbs any beam
// that hits it (RF04's `blocker` segment type ends the trace, see
// laser.js) — not interactive, not movable. Also blocks the *player*
// (via `collider`, fed into movement.js's collision check by
// level-runtime.js) — the closest thing this project has to a genuine
// interior obstacle, since room walls are shared/fixed (docs/decisions/
// 0005). `width` is configurable (default is a small standalone obstacle)
// so a level can also build a full room-spanning divider out of one wide
// blocker (spec §11 level 8's "parede divisória"). Static, like a
// receiver's segment (computed once from position/rotation, not
// recomputed from a live matrixWorld).
export function createBlocker({ position, rotationY = 0, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, thickness = DEFAULT_THICKNESS }) {
  const geometry = new THREE.BoxGeometry(width, height, thickness);
  const material = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.y = rotationY;

  const half = width / 2;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const segment = {
    type: 'blocker',
    a: { x: position.x - half * cos, z: position.z + half * sin },
    b: { x: position.x + half * cos, z: position.z - half * sin },
  };

  const collider = rotatedRectAABB(position, rotationY, width, thickness);

  return { mesh, segment, collider };
}
