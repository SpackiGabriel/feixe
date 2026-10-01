import * as THREE from 'three';
import { segmentFromCenter } from './aabb.js';

const PORTAL_WIDTH = 1.2;
const PORTAL_HEIGHT = 2.2;
const PORTAL_THICKNESS = 0.1;

function createPortalMesh(hex) {
  const geometry = new THREE.BoxGeometry(PORTAL_WIDTH, PORTAL_HEIGHT, PORTAL_THICKNESS);
  // Spec §9: opaque surface with an indicative icon, explicitly *not* a
  // see-through render — a flat tinted color is the icon here, no window
  // into the linked portal's side.
  const material = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: hex, emissiveIntensity: 0.6 });
  return new THREE.Mesh(geometry, material);
}

// Spec §9: a fixed, non-interactive teleport pair, introduced no earlier
// than level 8. A beam or the player entering one portal's face is
// re-emitted from the other's, with direction rotated by the pair's
// orientation difference plus a half-turn (entering *against* a face,
// exiting *along* the other's) — see laser.js's rotateXZ, the same
// transform src/levels/portal-crossing.js applies to the player's
// heading. Static like a receiver's segment — a level never
// repositions or rotates a portal at runtime.
export function createPortalPair({ id, a, b }) {
  const posA = new THREE.Vector3(...a.position);
  const posB = new THREE.Vector3(...b.position);
  const rotA = a.rotationY ?? 0;
  const rotB = b.rotationY ?? 0;

  const meshA = createPortalMesh(0x33aaff);
  meshA.position.copy(posA);
  meshA.rotation.y = rotA;

  const meshB = createPortalMesh(0xff7733);
  meshB.position.copy(posB);
  meshB.rotation.y = rotB;

  const deltaAtoB = rotB - rotA + Math.PI;
  const deltaBtoA = rotA - rotB + Math.PI;

  const portalA = { id: `${id}-a`, mesh: meshA, position: posA, rotationY: rotA, exitRotationDelta: deltaAtoB };
  const portalB = { id: `${id}-b`, mesh: meshB, position: posB, rotationY: rotB, exitRotationDelta: deltaBtoA };
  portalA.linked = portalB;
  portalB.linked = portalA;
  portalA.segment = { type: 'portal', ...segmentFromCenter(posA, rotA, PORTAL_WIDTH), exitPosition: posB, exitRotationDelta: deltaAtoB };
  portalB.segment = { type: 'portal', ...segmentFromCenter(posB, rotB, PORTAL_WIDTH), exitPosition: posA, exitRotationDelta: deltaBtoA };

  return [portalA, portalB];
}
