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
const PULSE_DECAY = 2.5; // per second — the activation pulse fades in ~0.4 s
const PULSE_EMISSIVE_BOOST = 2.5;
const PULSE_SCALE_BOOST = 0.18;
const LIGHT_INTENSITY = 0.8;
const LIGHT_DISTANCE = 2.5;

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

  // "acende e emite um pulso de luz" (spec §8): a small light in front of
  // the panel, on while active, flaring with the pulse on activation.
  const light = new THREE.PointLight(hex, 0, LIGHT_DISTANCE);
  light.position.set(0, 0, 0.3);
  mesh.add(light);

  const id = `receiver-${nextReceiverId++}`;
  // Static — a receiver doesn't move, so its segment is computed once, not
  // every frame from a live matrixWorld like a mirror's.
  const segment = { id, type: 'receiver', ...segmentFromCenter(position, rotationY, PANEL_WIDTH) };

  let active = false;
  let pulse = 0; // 1 right after activation, decays to 0 (spec §13 IV: "pulso de ativação")

  function evaluate(traces) {
    const { composed, hitCount } = composeReceiverColor(traces, id);
    const satisfied = isReceiverSatisfied(composed, targetColor, hitCount);

    if (satisfied !== active) {
      active = satisfied;
      if (active) {
        pulse = 1;
        playConfirmTone();
      }
    }
    return active;
  }

  // Frame-rate independent animation of the pulse (level-runtime.js).
  function update(deltaSeconds) {
    pulse = Math.max(0, pulse - PULSE_DECAY * deltaSeconds);
    const base = active ? ACTIVE_EMISSIVE_INTENSITY : INACTIVE_EMISSIVE_INTENSITY;
    material.emissiveIntensity = base + pulse * PULSE_EMISSIVE_BOOST;
    mesh.scale.setScalar(1 + pulse * PULSE_SCALE_BOOST);
    light.intensity = active ? LIGHT_INTENSITY * (1 + pulse * 2) : 0;
  }

  return { mesh, segment, evaluate, update, isActive: () => active, colorName };
}
