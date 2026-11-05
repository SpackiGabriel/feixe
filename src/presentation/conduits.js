import * as THREE from 'three';
import { damp } from './motion.js';

// The cause→effect chain (docs/presentation.md): a receiver charges
// (CHARGE), then a pulse runs down its floor conduit to the door (TRAVEL),
// then the door's pip fills. Doors' clamp release (door-motion.js) is
// timed to land right after.
export const CHAIN = { charge: 0.18, travel: 0.3 };
export const CHAIN_DELAY = CHAIN.charge + CHAIN.travel;

const WIDTH = 0.07;
const FLOOR_Y = 0.006;
const LANE_SPACING = 0.12;

// Pure: an L-shaped floor route from an input (x, z) to a door, made of
// axis-aligned legs (first along x, then along z). `lane` offsets the
// last leg sideways so several conduits into one door don't overlap.
// Returns points [{x, z}] and the total length.
export function routeConduit(from, to, lane = 0) {
  const end = { x: to.x + lane * LANE_SPACING, z: to.z };
  const corner = { x: end.x, z: from.z };
  const points = [{ x: from.x, z: from.z }];
  if (Math.abs(corner.x - from.x) > 1e-6) points.push(corner);
  if (Math.abs(end.z - corner.z) > 1e-6) points.push(end);
  if (points.length === 1) points.push(end);
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  return { points, length };
}

const vertexShader = /* glsl */ `
  attribute float distance;
  varying float vDistance;
  varying vec2 vUv;
  void main() {
    vDistance = distance;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// uHead: how far (metres) the energy has travelled from the input; uLit:
// steady glow behind it; uWarn: trap conduits flash instead of filling.
const fragmentShader = /* glsl */ `
  uniform float uHead;
  uniform float uLit;
  uniform float uWarn;
  uniform float uTime;
  uniform vec3 uIdle;
  uniform vec3 uOn;
  varying float vDistance;
  varying vec2 vUv;
  void main() {
    float edge = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
    float filled = step(vDistance, uHead) * uLit;
    float front = exp(-abs(vDistance - uHead) * 6.0) * step(vDistance, uHead + 0.4) * uLit;
    float warn = uWarn * (0.55 + 0.45 * step(0.0, sin(uTime * 12.566)));
    float glow = max(filled * 0.75 + front * 0.9, warn);
    vec3 color = mix(uIdle, uOn, clamp(glow, 0.0, 1.0)) * (0.6 + 0.4 * edge);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// A conduit mesh along a route: a flat strip with a per-vertex distance
// attribute so the shader can draw the travelling pulse.
export function createConduit(route, { trap = false } = {}) {
  const positions = [];
  const distances = [];
  const uvs = [];
  const indices = [];
  let travelled = 0;
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1];
    const b = route.points[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    // Extend each leg by half a width so corners join without a gap.
    const ex = ((b.x - a.x) / len) * (WIDTH / 2);
    const ez = ((b.z - a.z) / len) * (WIDTH / 2);
    const base = positions.length / 3;
    const corners = [
      [a.x - ex + nx * (WIDTH / 2), a.z - ez + nz * (WIDTH / 2), travelled, 0],
      [a.x - ex - nx * (WIDTH / 2), a.z - ez - nz * (WIDTH / 2), travelled, 1],
      [b.x + ex + nx * (WIDTH / 2), b.z + ez + nz * (WIDTH / 2), travelled + len, 0],
      [b.x + ex - nx * (WIDTH / 2), b.z + ez - nz * (WIDTH / 2), travelled + len, 1],
    ];
    for (const [x, z, d, v] of corners) {
      positions.push(x, FLOOR_Y + i * 0.0005, z);
      distances.push(d);
      uvs.push(0, v);
    }
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    travelled += len;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('distance', new THREE.Float32BufferAttribute(distances, 1));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uHead: { value: 0 },
      uLit: { value: 0 },
      uWarn: { value: 0 },
      uTime: { value: 0 },
      uIdle: { value: new THREE.Color(0x15171a) },
      uOn: { value: new THREE.Color(0xffd9a8) },
    },
    polygonOffset: true,
    polygonOffsetFactor: -2,
    side: THREE.DoubleSide, // winding depends on leg direction; never cull
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;

  const speed = route.length / CHAIN.travel; // the pulse always takes CHAIN.travel to arrive
  let head = 0;
  let lit = 0;
  let since = null;
  let time = 0;

  // `active`: the input's current state, read every frame.
  function update(deltaSeconds, active) {
    time += deltaSeconds;
    material.uniforms.uTime.value = time;
    if (trap) {
      material.uniforms.uWarn.value = active ? 1 : 0;
      return;
    }
    if (active) {
      if (since === null) since = time;
      // Wait for the receiver's charge, then race to the door.
      if (time - since >= CHAIN.charge) head = Math.min(route.length + 0.5, head + speed * deltaSeconds);
      lit = damp(lit, 1, 20, deltaSeconds);
    } else {
      since = null;
      lit = damp(lit, 0, 10, deltaSeconds);
      if (lit < 0.02) head = 0;
    }
    material.uniforms.uHead.value = head;
    material.uniforms.uLit.value = lit;
  }

  return { mesh, update };
}
