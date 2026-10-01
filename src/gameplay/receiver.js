import * as THREE from 'three';
import { COLOR_NAMES } from './colors.js';
import { composeReceiverColor, isReceiverSatisfied, colorToHex } from './laser.js';
import { playConfirmTone } from '../core/audio.js';
import { segmentFromCenter } from './aabb.js';

const PANEL_WIDTH = 0.8;
const PANEL_HEIGHT = 0.8;
const PANEL_THICKNESS = 0.05;
const INACTIVE_EMISSIVE_INTENSITY = 0.15;
const ACTIVE_EMISSIVE_INTENSITY = 1.2;

let nextReceiverId = 0;

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
  // Static — a receiver doesn't move, so its segment is computed once, not
  // every frame from a live matrixWorld like a mirror's.
  const segment = { id, type: 'receiver', ...segmentFromCenter(position, rotationY, PANEL_WIDTH) };

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
