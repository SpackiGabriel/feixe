import * as THREE from 'three';
import { events } from '../core/events.js';

const BASE_WIDTH = 0.6;
const BASE_HEIGHT = 0.3;
const BASE_DEPTH = 0.6;
const BUTTON_RADIUS = 0.2;
const BUTTON_HEIGHT = 0.1;
const INACTIVE_EMISSIVE_INTENSITY = 0.08;
const ACTIVE_EMISSIVE_INTENSITY = 1.1;
const HOVER_INTENSITY_BOOST = 0.35;
// Neutral warm lamp (COL-02): state reads as dark vs lit and as the button
// physically pressed in, not as a green/orange hue.
const LAMP_COLOR = 0xffd9a8; // same hue on and off; only brightness changes
const PRESS_DEPTH = 0.045;

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
    emissive: LAMP_COLOR,
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
    buttonMaterial.emissiveIntensity =
      (active ? ACTIVE_EMISSIVE_INTENSITY : INACTIVE_EMISSIVE_INTENSITY) +
      (hovered ? HOVER_INTENSITY_BOOST : 0);
    button.position.y = BASE_HEIGHT + BUTTON_HEIGHT / 2 - (active ? PRESS_DEPTH : 0);
  }

  // One-shot toggle (spec §11's "mirar e ativar" gesture) — distinct from
  // userData.controller's continuous drag, since a switch has no degree of
  // freedom to manipulate, just a single press/release edge.
  function activate() {
    active = !active;
    refreshVisual();
    events.emit('switch:toggle', { active });
  }

  button.userData.activate = activate;
  button.userData.prompt = 'Clique: ativar';
  // Hovering must not clobber the active/inactive color (interaction.js's
  // generic hover tint would), so it gets its own feedback like emitter.js.
  button.userData.setHovered = (isHovered) => {
    hovered = isHovered;
    refreshVisual();
  };

  return { mesh: group, base, button, isActive: () => active, activate };
}
