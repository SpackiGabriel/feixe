import * as THREE from 'three';

const RAIL_WIDTH = 0.12;
const RAIL_HEIGHT = 0.02;

// Floor marking for a sliding object's track (spec §4/§5: "mover apenas em
// trilhos"), so the player can see where a mirror/filter can go before
// grabbing it. Returns null for a zero-length (fixed-position) rail.
export function createRailMesh(start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return null;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(RAIL_WIDTH, RAIL_HEIGHT, length + RAIL_WIDTH),
    new THREE.MeshStandardMaterial({ color: 0x2a2f33, emissive: 0x3fa7c9, emissiveIntensity: 0.35, roughness: 0.5 })
  );
  mesh.position.set((start.x + end.x) / 2, RAIL_HEIGHT / 2, (start.z + end.z) / 2);
  mesh.rotation.y = Math.atan2(dx, dz);
  return mesh;
}
