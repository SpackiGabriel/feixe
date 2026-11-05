import * as THREE from 'three';
import { COLOR_NAMES } from './colors.js';
import { colorToHex } from './laser.js';
import { createSteppedAngle } from './rotation.js';
import { symbolFaceTexture } from './textures.js';

const BODY_RADIUS = 0.15;
const BODY_LENGTH = 0.5;
const BASE_EMISSIVE_INTENSITY = 0.4;
const HOVER_EMISSIVE_INTENSITY = 1.0;

// Spec §7: an emitter usually fires one of the three fixed primaries.
// 'white' (their sum) is the one composite an emitter can also fire —
// spec §11 level 7 ("Filtro") requires a white emitter paired with a
// subtractive filter to isolate a primary. No other composite is valid
// here; a receiver's *target* can be any composite (colors.js), but what
// an emitter emits stays restricted to this short list.
const EMITTER_COLOR_NAMES = ['red', 'green', 'blue', 'white'];

// An emitter is fixed in position; its laser color is fixed at creation
// (spec §6). It rotates around the vertical axis only when the level says
// so (`rotationEnabled`, default off) — spec §11's tutorials use "um
// emissor fixo", and a freely rotatable emitter lets the player aim
// straight at the receiver and skip every mirror. The barrel points along
// local -Z by default (matches the camera's forward convention).
export function createEmitter({ position, colorName, initialRotationY = 0, rotationEnabled = false, rotationStepDegrees = null }) {
  if (!EMITTER_COLOR_NAMES.includes(colorName)) {
    throw new Error(`Emitter color must be one of ${EMITTER_COLOR_NAMES.join(', ')}, got "${colorName}"`);
  }
  const rgb = COLOR_NAMES[colorName];
  const color = { rgb, hex: colorToHex(rgb) };

  const geometry = new THREE.CylinderGeometry(BODY_RADIUS, BODY_RADIUS, BODY_LENGTH, 12);
  geometry.rotateX(Math.PI / 2);

  const material = new THREE.MeshStandardMaterial({
    color: 0x333333,
    emissive: color.hex,
    emissiveIntensity: BASE_EMISSIVE_INTENSITY,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.y = initialRotationY;

  // Color-blind symbol badge (accessibility NFR): a small cube riding on top
  // of the barrel, symbol on every face so it reads from any side.
  const badge = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color.hex, emissiveIntensity: 1, emissiveMap: symbolFaceTexture(colorName) })
  );
  badge.position.y = BODY_RADIUS + 0.16;
  mesh.add(badge);

  const angle = createSteppedAngle(initialRotationY, rotationStepDegrees);
  function applyRotationDelta(delta) {
    if (!rotationEnabled) return;
    mesh.rotation.y = angle.add(delta);
  }

  mesh.userData.interactive = true;
  mesh.userData.controller = {
    positionEnabled: false,
    rotationEnabled,
    rotationStep: angle.step,
    applyPositionDelta: () => {},
    applyRotationDelta,
  };
  mesh.userData.prompt = rotationEnabled ? 'Clique: girar emissor' : null;
  // Hovering must not overwrite the emitter's color identity, so it gets
  // its own feedback instead of interaction.js's generic emissive tint.
  mesh.userData.setHovered = (isHovered) => {
    material.emissiveIntensity = isHovered ? HOVER_EMISSIVE_INTENSITY : BASE_EMISSIVE_INTENSITY;
  };

  return { mesh, color, applyRotationDelta, rotationEnabled };
}
