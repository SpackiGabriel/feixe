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

// Pure: one drag step along a rail, t ∈ [0, 1] (0 = start, 1 = end).
// `hitLimit` is true only on the step that *arrives* at an end, so the
// end-stop bump and sound fire once, not on every frame the player keeps
// pushing against it.
export function slideAlongRail(t, delta) {
  const wasAtEnd = t === 0 || t === 1;
  const wanted = t + delta;
  const next = Math.min(1, Math.max(0, wanted));
  return { t: next, hitLimit: wanted !== next && !wasAtEnd };
}

const _localA = new THREE.Vector3();
const _localB = new THREE.Vector3();

// World-space XZ segment of a rail device's plate (mirror, filter), for
// the laser tracer: the plate's two edge points, ±width/2 on its local x
// axis, taken to the world by its matrixWorld — which already includes
// the parent's slide along the rail and the plate's own rotation
// (M_world(plate) = M_world(base) · M_local(plate)). Writes into `out` in
// place — called every frame, so it must not allocate. The caller must
// have brought matrixWorld up to date (laser-system.js does).
export function writePlateSegment(plate, width, out) {
  _localA.set(-width / 2, 0, 0).applyMatrix4(plate.matrixWorld);
  _localB.set(width / 2, 0, 0).applyMatrix4(plate.matrixWorld);
  out.a.x = _localA.x;
  out.a.z = _localA.z;
  out.b.x = _localB.x;
  out.b.z = _localB.z;
  return out;
}
