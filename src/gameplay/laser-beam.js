import * as THREE from 'three';
import { colorToHex } from './laser.js';

const MAX_PIECES = 32; // generous bound: MAX_REFLECTIONS bounces + filters/portals + the last leg
const CORE_RADIUS = 0.018;
const GLOW_RADIUS = 0.055;
const GLOW_OPACITY = 0.22;
const LIGHT_INTENSITY = 0.6;
const LIGHT_DISTANCE = 3;

// A beam's visual: a "malha fina emissiva, não sujeita a sombreamento
// padrão" (spec §6) — one thin unlit cylinder per path segment plus a
// wider additive glow around it, drawn from a fixed pool so nothing is
// allocated per frame. Each piece has its own color, so a white beam turns
// red after a red filter. One point light follows the first bounce so the
// beam reads as a light source without one light per segment (docs/
// decisions/0003). A plain THREE.Line was used before, but WebGL ignores
// line width, so it rendered 1 px wide and was hard to read.
export function createBeamRenderer() {
  const object = new THREE.Group();

  // Unit-length cylinder along local +Z, centered — scaled to each segment.
  const coreGeometry = new THREE.CylinderGeometry(CORE_RADIUS, CORE_RADIUS, 1, 8, 1, true).rotateX(Math.PI / 2);
  const glowGeometry = new THREE.CylinderGeometry(GLOW_RADIUS, GLOW_RADIUS, 1, 10, 1, true).rotateX(Math.PI / 2);
  const materials = [];
  const meshes = [];
  for (let i = 0; i < MAX_PIECES; i++) {
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: GLOW_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    materials.push(coreMaterial, glowMaterial);
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    core.add(glow);
    core.visible = false;
    core.frustumCulled = false; // moved every frame
    glow.frustumCulled = false;
    object.add(core);
    meshes.push({ core, coreMaterial, glowMaterial });
  }

  const light = new THREE.PointLight(0xffffff, 0, LIGHT_DISTANCE);
  object.add(light);

  // `pieces`: traceBeam()'s [{a, b, color}] list (laser.js).
  function update(pieces, heightY) {
    for (let i = 0; i < meshes.length; i++) {
      const { core, coreMaterial, glowMaterial } = meshes[i];
      const piece = pieces[i];
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
      coreMaterial.color.setHex(hex);
      glowMaterial.color.setHex(hex);
    }

    if (pieces.length > 0) {
      light.position.set(pieces[0].b.x, heightY, pieces[0].b.z);
      light.color.setHex(colorToHex(pieces[0].color));
      light.intensity = LIGHT_INTENSITY;
    } else {
      light.intensity = 0;
    }
  }

  function dispose() {
    coreGeometry.dispose();
    glowGeometry.dispose();
    for (const material of materials) material.dispose();
  }

  return { object, update, dispose };
}
