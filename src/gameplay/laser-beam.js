import * as THREE from 'three';

const MAX_POINTS = 32; // generous bound: MAX_REFLECTIONS bounces + filters/portals + endpoints
const CORE_RADIUS = 0.018;
const GLOW_RADIUS = 0.055;
const GLOW_OPACITY = 0.22;
const LIGHT_INTENSITY = 0.6;
const LIGHT_DISTANCE = 3;

// A beam's visual: a "malha fina emissiva, não sujeita a sombreamento
// padrão" (spec §6) — one thin unlit cylinder per path segment plus a
// wider additive glow around it, drawn from a fixed pool so nothing is
// allocated per frame. One point light follows the first bounce so the
// beam reads as a light source without one light per segment (docs/
// decisions/0003). A plain THREE.Line was used before, but WebGL ignores
// line width, so it rendered 1 px wide and was hard to read.
export function createBeamRenderer() {
  const object = new THREE.Group();

  // Unit-length cylinder along local +Z, centered — scaled to each segment.
  const coreGeometry = new THREE.CylinderGeometry(CORE_RADIUS, CORE_RADIUS, 1, 8, 1, true).rotateX(Math.PI / 2);
  const glowGeometry = new THREE.CylinderGeometry(GLOW_RADIUS, GLOW_RADIUS, 1, 10, 1, true).rotateX(Math.PI / 2);
  const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: GLOW_OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const pieces = [];
  for (let i = 0; i < MAX_POINTS - 1; i++) {
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    core.add(glow);
    core.visible = false;
    core.frustumCulled = false; // moved every frame
    glow.frustumCulled = false;
    object.add(core);
    pieces.push(core);
  }

  const light = new THREE.PointLight(0xffffff, 0, LIGHT_DISTANCE);
  object.add(light);

  function update(path, heightY, colorHex) {
    const count = Math.min(path.length, MAX_POINTS);
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      if (i >= count - 1) {
        piece.visible = false;
        continue;
      }
      const a = path[i];
      const b = path[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      piece.visible = length > 1e-6;
      piece.position.set((a.x + b.x) / 2, heightY, (a.z + b.z) / 2);
      piece.rotation.set(0, Math.atan2(dx, dz), 0);
      piece.scale.set(1, 1, length);
    }
    coreMaterial.color.setHex(colorHex);
    glowMaterial.color.setHex(colorHex);

    if (count >= 2) {
      light.position.set(path[1].x, heightY, path[1].z);
      light.color.setHex(colorHex);
      light.intensity = LIGHT_INTENSITY;
    } else {
      light.intensity = 0;
    }
  }

  function dispose() {
    coreGeometry.dispose();
    glowGeometry.dispose();
    coreMaterial.dispose();
    glowMaterial.dispose();
  }

  return { object, update, dispose };
}
