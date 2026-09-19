import * as THREE from 'three';
import { playConfirmTone } from '../core/audio.js';

const BASE_WIDTH = 0.6;
const BASE_HEIGHT = 0.3;
const BASE_DEPTH = 0.6;
const BUTTON_RADIUS = 0.2;
const BUTTON_HEIGHT = 0.1;
const INACTIVE_EMISSIVE_INTENSITY = 0.15;
const ACTIVE_EMISSIVE_INTENSITY = 1.2;
const HOVER_INTENSITY_BOOST = 0.5;
const INACTIVE_COLOR = 0x883300;
const ACTIVE_COLOR = 0x33ff33;

// Level 1's laser-free interactive object (spec §11, "Primeiros passos"):
// a pedestal with a button that toggles on aim+confirm alone, no laser or
// color involved. Exposes the same isActive() shape as a receiver so
// door.js/door-logic.js can treat it identically without any change.
export function createSwitch({ position, rotationY = 0 }) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = rotationY;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(BASE_WIDTH, BASE_HEIGHT, BASE_DEPTH),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  base.position.y = BASE_HEIGHT / 2;
  group.add(base);

  const buttonMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    emissive: INACTIVE_COLOR,
    emissiveIntensity: INACTIVE_EMISSIVE_INTENSITY,
  });
  const button = new THREE.Mesh(
    new THREE.CylinderGeometry(BUTTON_RADIUS, BUTTON_RADIUS, BUTTON_HEIGHT, 16),
    buttonMaterial
  );
  button.position.y = BASE_HEIGHT + BUTTON_HEIGHT / 2;
  group.add(button);

  let active = false;
  let hovered = false;

  function refreshVisual() {
    buttonMaterial.emissive.setHex(active ? ACTIVE_COLOR : INACTIVE_COLOR);
    buttonMaterial.emissiveIntensity =
      (active ? ACTIVE_EMISSIVE_INTENSITY : INACTIVE_EMISSIVE_INTENSITY) +
      (hovered ? HOVER_INTENSITY_BOOST : 0);
  }

  // One-shot toggle (spec §11's "mirar e ativar" gesture) — distinct from
  // userData.controller's continuous drag, since a switch has no degree of
  // freedom to manipulate, just a single press/release edge.
  function activate() {
    active = !active;
    refreshVisual();
    playConfirmTone();
  }

  button.userData.interactive = true;
  button.userData.activate = activate;
  // Hovering must not clobber the active/inactive color (interaction.js's
  // generic hover tint would), so it gets its own feedback like emitter.js.
  button.userData.setHovered = (isHovered) => {
    hovered = isHovered;
    refreshVisual();
  };

  return { mesh: group, base, button, isActive: () => active, activate };
}
