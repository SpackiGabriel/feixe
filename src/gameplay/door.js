import * as THREE from 'three';
import { evaluateDoorRule } from './door-logic.js';

const DOOR_WIDTH = 2;
const DOOR_HEIGHT = 3;
const DOOR_THICKNESS = 0.15;
const SLIDE_SPEED = 2; // meters/second — "animação de deslizamento" (spec §8), not an instant snap

// A door watches a set of receivers and slides open/closed based on an
// AND/OR rule over their active state (spec §8, RF07). `position` is the
// door's closed (blocking) center; it slides straight up into the ceiling
// void when open.
export function createDoor({ position, rotationY = 0, rule, receivers }) {
  const geometry = new THREE.BoxGeometry(DOOR_WIDTH, DOOR_HEIGHT, DOOR_THICKNESS);
  const material = new THREE.MeshStandardMaterial({ color: 0x666666 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.y = rotationY;

  const closedY = position.y;
  const openY = position.y + DOOR_HEIGHT;
  let open = false;

  function update(deltaSeconds) {
    const states = receivers.map((receiver) => receiver.isActive());
    open = evaluateDoorRule(states, rule);

    const targetY = open ? openY : closedY;
    const step = SLIDE_SPEED * deltaSeconds;
    const remaining = targetY - mesh.position.y;
    mesh.position.y += Math.abs(remaining) <= step ? remaining : Math.sign(remaining) * step;
  }

  // `position` is the door's fixed closed-position anchor (unlike
  // mesh.position, which animates while sliding) — used by the exit
  // trigger (src/levels/exit-trigger.js) to check player proximity.
  return { mesh, update, isOpen: () => open, position: position.clone() };
}
