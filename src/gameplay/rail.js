import * as THREE from 'three';

const GAUGE = 0.1; // distance between the two bars
const BAR = 0.025;
const HEIGHT = 0.02;

// Floor track for a sliding object (spec §4/§5: "mover apenas em
// trilhos"): two thin bars with end stops, so the player sees where a
// mirror/filter can go — and where it stops — before grabbing it. Neutral
// warm white (no laser hue, COL-02); brightness follows hover/grab
// (presentation/affordances.js). Returns null for a zero-length rail.
export function createRailMesh(start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return null;
  const material = new THREE.MeshStandardMaterial({ color: 0x2a2c2e, emissive: 0xd9d2c0, emissiveIntensity: 0.35, roughness: 0.5, transparent: true });
  const group = new THREE.Group();
  const barGeometry = new THREE.BoxGeometry(BAR, HEIGHT, length);
  for (const side of [-1, 1]) {
    const bar = new THREE.Mesh(barGeometry, material);
    bar.position.set(side * (GAUGE / 2), HEIGHT / 2, 0);
    group.add(bar);
  }
  const stopGeometry = new THREE.BoxGeometry(GAUGE + BAR * 3, HEIGHT * 3, BAR * 2);
  for (const side of [-1, 1]) {
    const stop = new THREE.Mesh(stopGeometry, material);
    stop.position.set(0, (HEIGHT * 3) / 2, side * (length / 2 + BAR));
    group.add(stop);
  }
  group.position.set((start.x + end.x) / 2, 0, (start.z + end.z) / 2);
  group.rotation.y = Math.atan2(dx, dz);
  group.userData.material = material;
  return group;
}

// Pure: a rail's unit XZ direction (start → end) and its length, for the
// screen-relative drag (core/manipulation.js). Zero-length rails get a dummy axis.
export function railAxis(start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return { x: 1, z: 0, length: 1 };
  return { x: dx / length, z: dz / length, length };
}
