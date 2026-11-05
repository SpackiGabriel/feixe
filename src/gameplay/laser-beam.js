import * as THREE from 'three';
import { colorToHex } from './laser.js';
import { flareTexture } from './textures.js';

const MAX_PIECES = 32; // generous bound: MAX_REFLECTIONS bounces + filters/portals + the last leg
const CORE_RADIUS = 0.014;
const HALO_RADIUS = 0.07;
const CORE_WHITENESS = 0.45; // a hot near-white core, the color lives in the halo
const LIGHT_INTENSITY = 0.9;
const LIGHT_DISTANCE = 3.2;

// Size and strength of the flare where a beam meets something. Each surface
// answers differently, so the player can read what the beam touched.
const CONTACT = {
  mirror: { size: 0.3, opacity: 1 }, // sharp glint: it carries on
  filter: { size: 0.26, opacity: 0.8 },
  portal: { size: 0.55, opacity: 0.9 },
  receiver: { size: 0.6, opacity: 1 },
  wall: { size: 0.34, opacity: 0.45 }, // dim scorch: it ends here
  glass: { size: 0.8, opacity: 0.55 }, // diffuse bloom on frosted glass
  blocker: { size: 0.45, opacity: 0.8 },
  start: { size: 0.24, opacity: 0.9 },
};

const haloVertex = /* glsl */ `
  uniform float uLength;
  varying float vAlong;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDepth;
  void main() {
    vAlong = (position.z + 0.5) * uLength;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

// Soft edges (fade toward grazing angles) and a slow ripple running in the
// direction of travel — a beam's direction is readable at a glance, which
// matters most through portals and long reflection chains.
const haloFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying float vAlong;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDepth;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float soft = pow(facing, 1.6);
    float flow = 0.78 + 0.22 * sin(vAlong * 7.0 - uTime * 9.0);
    // Fade out right in front of the camera: looking along a beam from
    // close up shouldn't fill the screen with glare.
    float near = smoothstep(0.35, 1.8, vDepth);
    gl_FragColor = vec4(uColor * flow, soft * 0.42 * near);
  }
`;

const _white = new THREE.Color(0xffffff);

// A beam's visual (spec §6: "malha fina emissiva, não sujeita a
// sombreamento padrão"): one thin unlit core + a soft additive halo per
// traced piece, contact flares at every hit, and one point light at the
// beam's end so whatever it lands on visibly lights up (docs/decisions/
// 0003). Everything comes from fixed pools — nothing is allocated per frame.
export function createBeamRenderer() {
  const object = new THREE.Group();

  // Unit-length cylinders along local +Z, centered — scaled per piece.
  const coreGeometry = new THREE.CylinderGeometry(CORE_RADIUS, CORE_RADIUS, 1, 8, 1, true).rotateX(Math.PI / 2);
  const haloGeometry = new THREE.CylinderGeometry(HALO_RADIUS, HALO_RADIUS, 1, 14, 1, true).rotateX(Math.PI / 2);

  const materials = [];
  const pieces = [];
  for (let i = 0; i < MAX_PIECES; i++) {
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false });
    const haloMaterial = new THREE.ShaderMaterial({
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      uniforms: { uColor: { value: new THREE.Color() }, uTime: { value: 0 }, uLength: { value: 1 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materials.push(coreMaterial, haloMaterial);
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    core.add(halo);
    core.visible = false;
    core.frustumCulled = false; // moved every frame
    halo.frustumCulled = false;
    object.add(core);
    pieces.push({ core, coreMaterial, haloMaterial });
  }

  const flares = [];
  for (let i = 0; i < MAX_PIECES + 1; i++) {
    const material = new THREE.SpriteMaterial({
      map: flareTexture(),
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    materials.push(material);
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    object.add(sprite);
    flares.push(sprite);
  }

  const light = new THREE.PointLight(0xffffff, 0, LIGHT_DISTANCE);
  object.add(light);

  let time = 0;

  function placeFlare(index, x, y, z, kind, hex) {
    const spec = CONTACT[kind];
    const sprite = flares[index];
    if (!spec) {
      sprite.visible = false;
      return;
    }
    sprite.visible = true;
    sprite.position.set(x, y, z);
    const flicker = 1 + 0.07 * Math.sin(time * 23 + index * 1.7);
    sprite.scale.setScalar(spec.size * flicker);
    sprite.material.color.setHex(hex);
    sprite.material.opacity = spec.opacity;
  }

  // `pieces`: traceBeam()'s [{a, b, color, end, segment}] list (laser.js).
  function update(tracePieces, heightY, deltaSeconds = 0) {
    time += deltaSeconds;
    let flareCount = 0;
    for (let i = 0; i < pieces.length; i++) {
      const { core, coreMaterial, haloMaterial } = pieces[i];
      const piece = tracePieces[i];
      if (!piece) {
        core.visible = false;
        continue;
      }
      const dx = piece.b.x - piece.a.x;
      const dz = piece.b.z - piece.a.z;
      const length = Math.hypot(dx, dz);
      core.visible = length > 1e-6;
      core.position.set((piece.a.x + piece.b.x) / 2, heightY, (piece.a.z + piece.b.z) / 2);
      core.rotation.set(0, Math.atan2(dx, dz), 0);
      core.scale.set(1, 1, length);
      const hex = colorToHex(piece.color);
      haloMaterial.uniforms.uColor.value.setHex(hex);
      haloMaterial.uniforms.uTime.value = time;
      haloMaterial.uniforms.uLength.value = length;
      coreMaterial.color.setHex(hex).lerp(_white, CORE_WHITENESS);

      if (i === 0) placeFlare(flareCount++, piece.a.x, heightY, piece.a.z, 'start', hex);
      const kind = piece.end === 'wall' && piece.segment?.style === 'glass' ? 'glass' : piece.end;
      placeFlare(flareCount++, piece.b.x, heightY, piece.b.z, kind, hex);
      // Coming out of a portal: flare at the exit too, in the beam's color.
      if (piece.end === 'portal' && tracePieces[i + 1]) {
        const next = tracePieces[i + 1];
        placeFlare(flareCount++, next.a.x, heightY, next.a.z, 'portal', colorToHex(next.color));
      }
    }
    for (let i = flareCount; i < flares.length; i++) flares[i].visible = false;

    const last = tracePieces[tracePieces.length - 1];
    if (last && last.end !== 'escaped') {
      // Just in front of the surface it hit, so that surface lights up.
      const dx = last.b.x - last.a.x;
      const dz = last.b.z - last.a.z;
      const len = Math.hypot(dx, dz) || 1;
      const back = Math.min(0.25, len / 2);
      light.position.set(last.b.x - (dx / len) * back, heightY, last.b.z - (dz / len) * back);
      light.color.setHex(colorToHex(last.color));
      light.intensity = LIGHT_INTENSITY;
    } else {
      light.intensity = 0;
    }
  }

  function dispose() {
    coreGeometry.dispose();
    haloGeometry.dispose();
    for (const material of materials) material.dispose();
  }

  return { object, update, dispose };
}
