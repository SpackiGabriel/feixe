import * as THREE from 'three';
import { segmentFromCenter } from './aabb.js';
import { numeralTexture } from './textures.js';
import { colorToHex } from './laser.js';
import { damp } from '../presentation/motion.js';

const PORTAL_WIDTH = 1.2;
const PORTAL_HEIGHT = 2.2;
const PORTAL_THICKNESS = 0.1;
const FRAME = 0.14;
const NUMERALS = ['I', 'II', 'III', 'IV'];

const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x34383b, roughness: 0.45, metalness: 0.7 });
frameMaterial.userData.shared = true;

// One clock for every portal surface, so the two ends of a pair always
// move in step — the clearest "these two are the same opening" cue.
const sharedTime = { value: 0 };
export function advancePortalClock(deltaSeconds) {
  sharedTime.value += deltaSeconds;
}

const surfaceVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Neutral interference pattern (spec §9: opaque surface with an indicative
// pattern, no see-through rendering). Both ends of a pair share uSeed and
// the clock, so their patterns are identical and in phase. uBeam tints the
// surface with whatever light is passing through it right now.
const surfaceFragment = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uBeamColor;
  uniform float uBeam;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(1.2, 2.2);
    float r = length(p);
    float rings = sin(r * 26.0 - uTime * 2.2 + uSeed);
    float sweep = sin((p.x * cos(uSeed) + p.y * sin(uSeed)) * 18.0 + uTime * 0.9);
    float moire = smoothstep(0.2, 1.0, rings * sweep);
    float vignette = smoothstep(1.15, 0.2, r);
    vec3 base = vec3(0.07, 0.075, 0.08) + vec3(0.62, 0.62, 0.57) * moire * vignette * 0.55;
    vec3 color = mix(base, uBeamColor * (0.55 + 0.45 * moire), uBeam * 0.7);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function createPortalMesh(pairIndex) {
  const group = new THREE.Group();
  const material = new THREE.ShaderMaterial({
    vertexShader: surfaceVertex,
    fragmentShader: surfaceFragment,
    uniforms: {
      uTime: sharedTime,
      uSeed: { value: 1.3 + pairIndex * 2.1 },
      uBeamColor: { value: new THREE.Color(0xffffff) },
      uBeam: { value: 0 },
    },
  });
  const surface = new THREE.Mesh(new THREE.BoxGeometry(PORTAL_WIDTH, PORTAL_HEIGHT, PORTAL_THICKNESS), material);
  group.add(surface);

  // Heavy frame: two posts, a header carrying the pair numeral, a sill.
  const postGeometry = new THREE.BoxGeometry(FRAME, PORTAL_HEIGHT + FRAME * 2, PORTAL_THICKNESS * 2.2);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(postGeometry, frameMaterial);
    post.position.x = side * (PORTAL_WIDTH / 2 + FRAME / 2);
    group.add(post);
  }
  const barGeometry = new THREE.BoxGeometry(PORTAL_WIDTH + FRAME * 2, FRAME, PORTAL_THICKNESS * 2.2);
  for (const side of [-1, 1]) {
    const bar = new THREE.Mesh(barGeometry, frameMaterial);
    bar.position.y = side * (PORTAL_HEIGHT / 2 + FRAME / 2);
    group.add(bar);
  }
  const plateMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: numeralTexture(NUMERALS[pairIndex % NUMERALS.length]), roughness: 0.6 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, PORTAL_THICKNESS * 2.4), plateMaterial);
  plate.position.y = PORTAL_HEIGHT / 2 + FRAME / 2;
  group.add(plate);

  return { group, material };
}

// Spec §9: a fixed, non-interactive teleport pair, introduced no earlier
// than level 8. A beam or the player entering one portal's face is
// re-emitted from the other's, with direction rotated by the pair's
// orientation difference plus a half-turn — see laser.js's rotateXZ, the
// same transform src/levels/portal-crossing.js applies to the player's
// heading. Visually neutral (COL-02): identity is the frame, the shared
// numeral and the synchronized pattern; color appears only when a beam is
// actually passing through. `pairIndex` picks the numeral (I, II, ...).
export function createPortalPair({ id, a, b }, pairIndex = 0) {
  const posA = new THREE.Vector3(...a.position);
  const posB = new THREE.Vector3(...b.position);
  const rotA = a.rotationY ?? 0;
  const rotB = b.rotationY ?? 0;

  const viewA = createPortalMesh(pairIndex);
  viewA.group.position.copy(posA);
  viewA.group.rotation.y = rotA;
  const viewB = createPortalMesh(pairIndex);
  viewB.group.position.copy(posB);
  viewB.group.rotation.y = rotB;

  const deltaAtoB = rotB - rotA + Math.PI;
  const deltaBtoA = rotA - rotB + Math.PI;

  // Beam glow on both ends, set every frame a beam enters either side.
  const glow = { level: 0, target: 0, color: new THREE.Color() };
  const views = [viewA, viewB];
  function markBeam(color) {
    glow.target = 1;
    glow.color.setHex(colorToHex(color));
  }
  function update(deltaSeconds) {
    glow.level = damp(glow.level, glow.target, glow.target ? 18 : 8, deltaSeconds);
    glow.target = 0; // must be re-marked next frame to stay lit
    for (const view of views) {
      view.material.uniforms.uBeam.value = glow.level;
      view.material.uniforms.uBeamColor.value.copy(glow.color);
    }
  }

  const portalA = { id: `${id}-a`, mesh: viewA.group, position: posA, rotationY: rotA, exitRotationDelta: deltaAtoB, markBeam, update };
  const portalB = { id: `${id}-b`, mesh: viewB.group, position: posB, rotationY: rotB, exitRotationDelta: deltaBtoA, markBeam, update: () => {} };
  portalA.linked = portalB;
  portalB.linked = portalA;
  portalA.segment = { type: 'portal', ...segmentFromCenter(posA, rotA, PORTAL_WIDTH), exitPosition: posB, exitRotationDelta: deltaAtoB };
  portalB.segment = { type: 'portal', ...segmentFromCenter(posB, rotB, PORTAL_WIDTH), exitPosition: posA, exitRotationDelta: deltaBtoA };

  return [portalA, portalB];
}
