import * as THREE from 'three';
import { evaluateDoorRule } from './door-logic.js';
import { rotatedRectAABB } from './aabb.js';
import { createDoorMotion } from '../presentation/door-motion.js';
import { createDoorView, DOOR_WIDTH } from '../presentation/door-view.js';
import { events } from '../core/events.js';

const DOOR_THICKNESS = 0.15;

// A door watches a set of inputs (receivers, switches, or { any } groups)
// and an optional set of trap blockers, and applies an AND/OR rule (spec
// §8, RF07; door-logic.js). Two separate states:
//   - unlocked (isOpen): the puzzle rule, immediate — what tests check;
//   - passable: where the panel physically is (door-motion.js) — what
//     blocks the player and what the exit trigger uses, so the player is
//     never stopped by, or let through, something that doesn't match what
//     they see.
// The visuals (frame, pips, lamps, glow) live in door-view.js and only
// read these states, so a modelled door can replace them later.
export function createDoor({ position, rotationY = 0, rule, inputs, forbidden = [], exit = false, style }) {
  const motion = createDoorMotion();
  const view = createDoorView({ position, rotationY, inputCount: inputs.length, trapCount: forbidden.length, exit, style });

  const states = new Array(inputs.length); // reused every update() — see .claude/rules/code-conventions.md
  const forbiddenStates = new Array(forbidden.length);
  const collider = rotatedRectAABB(position, rotationY, DOOR_WIDTH, DOOR_THICKNESS); // static closed footprint
  let open = false;
  const door = {
    mesh: view.root,
    occluder: style === 'glass' ? null : view.panel, // aim passes through glass (see wall.js)
    update,
    isOpen: () => open,
    isPassable: () => motion.isPassable(),
    getOpenness: () => motion.getOpenness(),
    // `position` is the door's fixed anchor (the panel itself animates) —
    // used by the exit trigger and by sound/camera effects.
    position: new THREE.Vector3(position.x, 0, position.z),
    getCollider: () => (motion.isPassable() ? null : collider),
  };

  function update(deltaSeconds) {
    for (let i = 0; i < inputs.length; i++) states[i] = inputs[i].isActive();
    for (let i = 0; i < forbidden.length; i++) forbiddenStates[i] = forbidden[i].isHit();
    const next = evaluateDoorRule(states, rule, forbiddenStates);
    if (next !== open) {
      open = next;
      if (!open) events.emit('door:lock', { door });
    }

    const wasMoving = motion.isMoving();
    const transition = motion.update(open, deltaSeconds);
    if (transition === 'released') events.emit('door:unlock', { door });
    if (!wasMoving && motion.isMoving()) events.emit('door:moving', { door, opening: open });
    if (transition === 'opened' || transition === 'closed') events.emit('door:settled', { door, opening: transition === 'opened' });

    view.update(deltaSeconds, states, forbiddenStates, motion);
  }

  return door;
}
