import * as THREE from 'three';

const WIDTH = 1;
const HEIGHT = 1.4;
const THICKNESS = 0.2;

// Spec §11 level 7 ("Filtro"): a fixed obstacle that absorbs any beam
// that hits it (RF04's `blocker` segment type ends the trace, see
// laser.js) — not interactive, not movable; the player routes/filters
// around it instead. Static, like a receiver's segment (computed once
// from position/rotation, not recomputed from a live matrixWorld).
export function createBlocker({ position, rotationY = 0 }) {
  const geometry = new THREE.BoxGeometry(WIDTH, HEIGHT, THICKNESS);
  const material = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.y = rotationY;

  const half = WIDTH / 2;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const segment = {
    type: 'blocker',
    a: { x: position.x - half * cos, z: position.z + half * sin },
    b: { x: position.x + half * cos, z: position.z - half * sin },
  };

  return { mesh, segment };
}
