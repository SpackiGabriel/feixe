import * as THREE from 'three';
import { COLOR_NAMES } from './colors.js';
import { composeReceiverColor, isReceiverSatisfied, colorToHex } from './laser.js';
import { segmentFromCenter } from './aabb.js';
import { symbolFaceTexture } from './textures.js';
import { events } from '../core/events.js';
import { CHAIN } from '../presentation/conduits.js';
import { clamp01, damp, easeOutCubic } from '../presentation/motion.js';

const PANEL_WIDTH = 0.8;
const PANEL_HEIGHT = 0.8;
const PANEL_THICKNESS = 0.05;
const IDLE_INTENSITY = 0.3;
const ACTIVE_INTENSITY = 1.3;
const LOCK_FLASH = 2.2; // extra emissive right at lock, decays
const LOCK_DECAY = 3; // per second
const LOCK_SCALE = 0.12;
const REJECT_HZ = 2; // ACC-02: ≤ 2 Hz

const housingMaterial = new THREE.MeshStandardMaterial({ color: 0x2e3236, roughness: 0.6, metalness: 0.5 });
housingMaterial.userData.shared = true;

let nextReceiverId = 0;

// A receiver activates only while the correct color continuously hits it
// (spec §8) — no memory between activations. The *logic* (isActive) is
// immediate; the presentation tells it as a short sequence:
//   charge — a ring around the face fills in the target color (CHAIN.charge)
//   lock   — the face flares and the panel kicks
//   hold   — steady glow; the conduit carries the signal to the door
// A beam of the wrong color makes the face flicker: "something arrived,
// but not this". Losing the beam drops everything at once.
export function createReceiver({ position, rotationY = 0, colorName }) {
  const targetColor = COLOR_NAMES[colorName];
  const hex = colorToHex(targetColor);

  const material = new THREE.MeshStandardMaterial({
    color: 0x1c1c1c,
    emissive: hex,
    emissiveIntensity: IDLE_INTENSITY,
    emissiveMap: symbolFaceTexture(colorName), // color-blind symbol(s) of the target color
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(PANEL_WIDTH, PANEL_HEIGHT, PANEL_THICKNESS), material);
  mesh.position.copy(position);
  mesh.rotation.y = rotationY;

  // Housing: a deeper frame around the face, so the receiver reads as an
  // instrument mounted in the wall rather than a floating tile.
  const housing = new THREE.Mesh(new THREE.BoxGeometry(PANEL_WIDTH + 0.16, PANEL_HEIGHT + 0.16, PANEL_THICKNESS * 0.6), housingMaterial);
  housing.position.z = 0;
  mesh.add(housing);

  // Charge ring on both faces (a receiver can be hit from either side).
  const ringMaterial = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide });
  const initialRingGeometry = new THREE.RingGeometry(0.47, 0.52, 48, 1, Math.PI / 2, 0.0001);
  const rings = [0.03, -0.03].map((z) => {
    const r = new THREE.Mesh(initialRingGeometry, ringMaterial);
    r.position.z = z;
    mesh.add(r);
    return r;
  });

  const id = `receiver-${nextReceiverId++}`;
  // Static — a receiver doesn't move, so its segment is computed once.
  const segment = { id, type: 'receiver', ...segmentFromCenter(position, rotationY, PANEL_WIDTH) };

  let active = false;
  let rejected = false; // hit, but by the wrong color
  let charge = 0; // 0..1 ring fill
  let flash = 0; // lock flare, decays
  let lastRingArc = -1;
  let time = 0;
  // No point light of its own: the beam's light already sits on whatever
  // it hits (laser-beam.js), so a lit receiver is lit by its beam.
  const receiver = { mesh, segment, evaluate, update, isActive: () => active, colorName };

  function evaluate(traces) {
    const { composed, hitCount } = composeReceiverColor(traces, id);
    const satisfied = isReceiverSatisfied(composed, targetColor, hitCount);
    rejected = hitCount > 0 && !satisfied;
    if (satisfied !== active) {
      active = satisfied;
      if (active) {
        charge = 0;
        flash = 0;
        events.emit('receiver:on', { receiver });
      } else {
        events.emit('receiver:off', { receiver });
      }
    }
    return active;
  }

  function setRingArc(fraction) {
    const arc = Math.round(fraction * 48);
    if (arc === lastRingArc) return;
    lastRingArc = arc;
    rings[0].geometry.dispose();
    const geometry = new THREE.RingGeometry(0.47, 0.52, 48, 1, Math.PI / 2, Math.max(0.0001, fraction * Math.PI * 2));
    for (const r of rings) r.geometry = geometry;
  }

  function update(deltaSeconds) {
    time += deltaSeconds;
    let intensity = IDLE_INTENSITY;
    if (active) {
      const before = charge;
      charge = clamp01(charge + deltaSeconds / CHAIN.charge);
      if (before < 1 && charge >= 1) flash = 1; // lock
      flash = Math.max(0, flash - LOCK_DECAY * deltaSeconds);
      intensity = IDLE_INTENSITY + (ACTIVE_INTENSITY - IDLE_INTENSITY) * easeOutCubic(charge) + flash * LOCK_FLASH;
      setRingArc(easeOutCubic(charge));
      ringMaterial.opacity = charge >= 1 ? 0.55 + flash * 0.45 : 0.9;
    } else {
      charge = damp(charge, 0, 18, deltaSeconds);
      flash = 0;
      setRingArc(charge);
      ringMaterial.opacity = charge * 0.9;
      if (rejected) intensity = IDLE_INTENSITY * (Math.sin(time * Math.PI * 2 * REJECT_HZ) > 0 ? 2.2 : 0.4);
    }
    material.emissiveIntensity = intensity;
    mesh.scale.setScalar(1 + flash * LOCK_SCALE);
  }

  return receiver;
}
