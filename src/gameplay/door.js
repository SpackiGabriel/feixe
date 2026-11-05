import * as THREE from 'three';
import { evaluateDoorRule } from './door-logic.js';
import { rotatedRectAABB } from './aabb.js';

const DOOR_WIDTH = 2;
const DOOR_HEIGHT = 3;
const DOOR_THICKNESS = 0.15;
const SLIDE_SPEED = 2; // meters/second — "animação de deslizamento" (spec §8), not an instant snap

// A door watches a set of receivers and slides open/closed based on an
// AND/OR rule over their active state (spec §8, RF07). `position` is the
// door's closed (blocking) center; it slides straight up into the ceiling
// void when open.
export function createDoor({ position, rotationY = 0, rule, receivers, forbidden = [] }) {
  const geometry = new THREE.BoxGeometry(DOOR_WIDTH, DOOR_HEIGHT, DOOR_THICKNESS);
  const material = new THREE.MeshStandardMaterial({ color: 0x666666 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.y = rotationY;

  const states = new Array(receivers.length); // reused every update() — see .claude/rules/code-conventions.md
  const forbiddenStates = new Array(forbidden.length);
  const collider = rotatedRectAABB(position, rotationY, DOOR_WIDTH, DOOR_THICKNESS); // static — the closed footprint never changes
  const closedY = position.y;
  const openY = position.y + DOOR_HEIGHT;
  let open = false;

  function update(deltaSeconds) {
    for (let i = 0; i < receivers.length; i++) states[i] = receivers[i].isActive();
    for (let i = 0; i < forbidden.length; i++) forbiddenStates[i] = forbidden[i].isHit();
    open = evaluateDoorRule(states, rule, forbiddenStates);

    const targetY = open ? openY : closedY;
    const step = SLIDE_SPEED * deltaSeconds;
    const remaining = targetY - mesh.position.y;
    mesh.position.y += Math.abs(remaining) <= step ? remaining : Math.sign(remaining) * step;
  }

  // `position` is the door's fixed closed-position anchor (unlike
  // mesh.position, which animates while sliding) — used by the exit
  // trigger (src/levels/exit-trigger.js) to check player proximity.
  //
  // getCollider() gates *movement*, not just the visual slide (spec §11
  // level 8's "open door 1, then reconfigure" puzzle only matters if a
  // closed door actually blocks the player) — it follows `open`'s live
  // logical state immediately, the same signal isOpen()/the exit trigger
  // already use, not the slide animation's progress.
  return {
    mesh,
    update,
    isOpen: () => open,
    position: position.clone(),
    getCollider: () => (open ? null : collider),
  };
}
