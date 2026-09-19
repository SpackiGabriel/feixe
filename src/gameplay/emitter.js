import * as THREE from 'three';

const BODY_RADIUS = 0.15;
const BODY_LENGTH = 0.5;
const BASE_EMISSIVE_INTENSITY = 0.4;
const HOVER_EMISSIVE_INTENSITY = 1.0;

// An emitter is fixed in position but rotates around the vertical axis;
// its laser color is fixed at creation (spec §6). The barrel points along
// local -Z by default (matches the camera's forward convention).
export function createEmitter({ position, color, initialRotationY = 0 }) {
  const geometry = new THREE.CylinderGeometry(BODY_RADIUS, BODY_RADIUS, BODY_LENGTH, 12);
  geometry.rotateX(Math.PI / 2);

  const material = new THREE.MeshStandardMaterial({
    color: 0x333333,
    emissive: color,
    emissiveIntensity: BASE_EMISSIVE_INTENSITY,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.y = initialRotationY;

  function applyRotationDelta(delta) {
    mesh.rotation.y += delta;
  }

  mesh.userData.interactive = true;
  mesh.userData.controller = {
    positionEnabled: false,
    rotationEnabled: true,
    applyPositionDelta: () => {},
    applyRotationDelta,
  };
  // Hovering must not overwrite the emitter's color identity, so it gets
  // its own feedback instead of interaction.js's generic emissive tint.
  mesh.userData.setHovered = (isHovered) => {
    material.emissiveIntensity = isHovered ? HOVER_EMISSIVE_INTENSITY : BASE_EMISSIVE_INTENSITY;
  };

  return { mesh, color, applyRotationDelta };
}
