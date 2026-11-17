import * as THREE from 'three';
import { COLOR_NAMES } from './colors.js';
import { colorToHex } from './laser.js';
import { createSteppedAngle } from './rotation.js';
import { symbolFaceTexture } from '../presentation/textures.js';
import { events } from '../core/events.js';
import { createDial, createManipulable } from '../presentation/affordances.js';

const housingMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3e40, roughness: 0.55, metalness: 0.55 });
housingMaterial.userData.shared = true;

const BODY_RADIUS = 0.15;
const BODY_LENGTH = 0.5;
const BASE_EMISSIVE_INTENSITY = 0.04;
const HOVER_EMISSIVE_INTENSITY = 0.4;

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

  // Barrel: dark steel, its color shows only at the muzzle and the badge.
  const material = new THREE.MeshStandardMaterial({ color: 0x2e3133, roughness: 0.45, metalness: 0.65, emissive: color.hex, emissiveIntensity: 0.04 });

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

  // Rear housing, cooling fins and a stand to the floor: a machine bolted
  // in place, not a floating tube.
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.3), housingMaterial);
  housing.position.z = BODY_LENGTH / 2 + 0.12;
  mesh.add(housing);
  for (let i = -1; i <= 1; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.22), housingMaterial);
    fin.position.set(0, i * 0.09, BODY_LENGTH / 2 + 0.12);
    mesh.add(fin);
  }
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, position.y - 0.18, 10), housingMaterial);
  stand.position.set(0, -(position.y - 0.18) / 2 - 0.18, BODY_LENGTH / 2 + 0.12);
  mesh.add(stand);

  // Muzzle: a lit ring in the beam's color at the barrel's mouth.
  const muzzleMaterial = new THREE.MeshBasicMaterial({ color: color.hex, toneMapped: false });
  const muzzle = new THREE.Mesh(new THREE.TorusGeometry(BODY_RADIUS * 0.7, 0.025, 8, 24), muzzleMaterial);
  muzzle.position.z = -BODY_LENGTH / 2 - 0.005;
  mesh.add(muzzle);

  const dial = rotationEnabled ? createDial(0.55) : null;
  if (dial) {
    // Not a child of the rotating barrel: the dial stays put, its needle turns.
    dial.object.position.set(position.x, 0.012, position.z);
  }
  const angle = createSteppedAngle(initialRotationY, rotationStepDegrees);
  let manipulable = null;
  function applyRotationDelta(delta) {
    if (!rotationEnabled) return;
    mesh.rotation.y = angle.add(delta);
    manipulable?.rotated(mesh.rotation.y);
  }

  mesh.userData.controller = {
    positionEnabled: false,
    rotationEnabled,
    rotationStep: angle.step,
    applyPositionDelta: () => {},
    applyRotationDelta,
  };
  mesh.userData.prompt = rotationEnabled ? 'Clique: girar emissor' : null;
  manipulable = createManipulable({
    target: mesh,
    dial,
    events,
    onHover: (isHovered) => { material.emissiveIntensity = isHovered ? HOVER_EMISSIVE_INTENSITY : BASE_EMISSIVE_INTENSITY; },
  });
  manipulable.rotated(mesh.rotation.y);

  return { mesh, color, applyRotationDelta, rotationEnabled, extras: dial ? [dial.object] : [], update: manipulable.update };
}
