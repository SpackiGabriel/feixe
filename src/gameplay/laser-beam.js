import * as THREE from 'three';

const MAX_POINTS = 32; // generous bound; current levels (walls+mirrors only) need MAX_REFLECTIONS+2
const LIGHT_INTENSITY = 0.6;
const LIGHT_DISTANCE = 3;

// A beam's visual: a thin emissive line following the traced path (spec §6:
// "malha fina emissiva, não sujeita a sombreamento padrão"), plus one point
// light that follows its first bounce to read as a dynamic light source
// along its trajectory without the cost of one light per segment (see
// docs/decisions/0003 for why one light, not one per segment).
export function createBeamRenderer() {
  const positions = new Float32Array(MAX_POINTS * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);

  const material = new THREE.LineBasicMaterial({ color: 0xffffff, toneMapped: false });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false; // path changes every frame; a static bounding sphere would be wrong

  const light = new THREE.PointLight(0xffffff, 0, LIGHT_DISTANCE);
  line.add(light);

  function update(path, heightY, colorHex) {
    const count = Math.min(path.length, MAX_POINTS);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = path[i].x;
      positions[i * 3 + 1] = heightY;
      positions[i * 3 + 2] = path[i].z;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.setDrawRange(0, count);
    material.color.setHex(colorHex);

    if (count >= 2) {
      light.position.set(path[1].x, heightY, path[1].z);
      light.color.setHex(colorHex);
      light.intensity = LIGHT_INTENSITY;
    } else {
      light.intensity = 0;
    }
  }

  return { line, update };
}
