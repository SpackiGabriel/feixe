import * as THREE from 'three';
import { COLOR_NAMES } from './colors.js';
import { composeReceiverColor, isReceiverSatisfied, colorToHex } from './laser.js';
import { playConfirmTone } from '../core/audio.js';

const PANEL_WIDTH = 0.8;
const PANEL_HEIGHT = 0.8;
const PANEL_THICKNESS = 0.05;
const INACTIVE_EMISSIVE_INTENSITY = 0.15;
const ACTIVE_EMISSIVE_INTENSITY = 1.2;

let nextReceiverId = 0;

// Static — a receiver doesn't move, so its world-space segment (for the
// laser tracer) is computed once from position/rotation, not every frame
// from a live matrixWorld like a mirror's.
function computeSegment(position, rotationY) {
  const half = PANEL_WIDTH / 2;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  return {
    a: { x: position.x - half * cos, z: position.z + half * sin },
    b: { x: position.x + half * cos, z: position.z - half * sin },
  };
}

// A receiver activates only while the correct color continuously hits it
// (spec §8) — no memory between activations. `onActivate`/`onDeactivate`
// let a door (or anything else) react to the edge, not just the state.
export function createReceiver({ position, rotationY = 0, colorName }) {
  const targetColor = COLOR_NAMES[colorName];
  const hex = colorToHex(targetColor);

  const geometry = new THREE.BoxGeometry(PANEL_WIDTH, PANEL_HEIGHT, PANEL_THICKNESS);
  const material = new THREE.MeshStandardMaterial({
    color: 0x222222,
    emissive: hex,
    emissiveIntensity: INACTIVE_EMISSIVE_INTENSITY,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.y = rotationY;

  const id = `receiver-${nextReceiverId++}`;
  const { a, b } = computeSegment(position, rotationY);
  const segment = { id, type: 'receiver', a, b };

  let active = false;

  function evaluate(traces) {
    const { composed, hitCount } = composeReceiverColor(traces, id);
    const satisfied = isReceiverSatisfied(composed, targetColor, hitCount);

    if (satisfied !== active) {
      active = satisfied;
      material.emissiveIntensity = active ? ACTIVE_EMISSIVE_INTENSITY : INACTIVE_EMISSIVE_INTENSITY;
      if (active) playConfirmTone();
    }
    return active;
  }

  return { mesh, segment, evaluate, isActive: () => active };
}
