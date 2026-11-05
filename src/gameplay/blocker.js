import * as THREE from 'three';
import { rotatedRectAABB, segmentFromCenter } from './aabb.js';
import { isBlockerHit } from './door-logic.js';
import { playTrapTone } from '../core/audio.js';

const DEFAULT_WIDTH = 1;
const DEFAULT_HEIGHT = 1.4;
const DEFAULT_THICKNESS = 0.2;
const TRAP_COLOR = 0xff2a2a;
const TRAP_IDLE_INTENSITY = 0.25;
const TRAP_HIT_INTENSITY = 1.6;

// A fixed obstacle that absorbs any beam that hits it (laser.js's 'blocker'
// segment ends the trace) and blocks the player (`collider`). With
// `trap: true` it is spec §7's NOT ("Bloqueador ... se atingido por
// qualquer feixe, fecha uma porta"): a door listing it in `forbidIds` stays
// shut while any beam lands on it. A trap glows red, brighter while hit,
// so the player reads "this must not be lit". Static: its segment is
// computed once from position/rotation.
export function createBlocker({ position, rotationY = 0, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, thickness = DEFAULT_THICKNESS, trap = false }) {
  const geometry = new THREE.BoxGeometry(width, height, thickness);
  const material = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.9,
    emissive: trap ? TRAP_COLOR : 0x000000,
    emissiveIntensity: trap ? TRAP_IDLE_INTENSITY : 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.y = rotationY;

  const segment = { type: 'blocker', ...segmentFromCenter(position, rotationY, width) };
  const collider = rotatedRectAABB(position, rotationY, width, thickness);

  let hit = false;
  // Called by laser-system.js every frame with all beam traces.
  function evaluate(traces) {
    const next = isBlockerHit(traces, segment);
    if (next !== hit) {
      hit = next;
      if (trap) {
        material.emissiveIntensity = hit ? TRAP_HIT_INTENSITY : TRAP_IDLE_INTENSITY;
        if (hit) playTrapTone();
      }
    }
    return hit;
  }

  return { mesh, segment, collider, trap, evaluate, isHit: () => hit };
}
