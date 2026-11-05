import * as THREE from 'three';
import { railAxis } from './rail.js';
import { createSteppedAngle } from './rotation.js';

const PLATE_WIDTH = 1;
const PLATE_HEIGHT = 1;
const PLATE_THICKNESS = 0.05;
const PEDESTAL_RADIUS = 0.06;
const BASE_EMISSIVE = 0x16222a; // faint, so the mirror reads in a dark room without an env map
const HOVER_EMISSIVE = 0x3a4c57;

const _localA = new THREE.Vector3();
const _localB = new THREE.Vector3();

// A mirror is a base/pivot node (parent, moves along the rail) with a
// reflective plate as its child (rotates around the pivot) — spec §5's
// hierarchical parent/child pair. Which of the two degrees of freedom is
// active is decided per level (`positionEnabled` / `rotationEnabled`);
// levels 1-5 (see design/game-concept.md §11) each enable only one at a time.
export function createMirror({
  railStart,
  railEnd,
  initialT = 0.5,
  initialRotationY = 0,
  positionEnabled = false,
  rotationEnabled = false,
  rotationStepDegrees = null, // null = free rotation; otherwise snap increment
}) {
  const base = new THREE.Group();

  // The pedestal belongs to the base (parent): it slides with the rail but
  // never rotates — only the plate (child) does, around the pivot.
  const pivotHeight = railStart.y;
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(PEDESTAL_RADIUS, PEDESTAL_RADIUS * 1.6, pivotHeight - PLATE_HEIGHT / 2, 10),
    new THREE.MeshStandardMaterial({ color: 0x3b4146, metalness: 0.6, roughness: 0.4 })
  );
  pedestal.position.y = -(pivotHeight + PLATE_HEIGHT / 2) / 2;
  base.add(pedestal);

  const plateMaterial = new THREE.MeshStandardMaterial({ color: 0xcfe3ec, metalness: 0.5, roughness: 0.12, emissive: BASE_EMISSIVE });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(PLATE_WIDTH, PLATE_HEIGHT, PLATE_THICKNESS), plateMaterial);
  plate.rotation.y = initialRotationY;
  base.add(plate);
  const angle = createSteppedAngle(initialRotationY, rotationStepDegrees);

  let t = THREE.MathUtils.clamp(initialT, 0, 1);

  function applyPosition() {
    base.position.lerpVectors(railStart, railEnd, t);
  }
  applyPosition();

  function applyPositionDelta(delta) {
    if (!positionEnabled) return;
    t = THREE.MathUtils.clamp(t + delta, 0, 1);
    applyPosition();
  }

  function applyRotationDelta(delta) {
    if (!rotationEnabled) return;
    plate.rotation.y = angle.add(delta);
  }

  plate.userData.interactive = true;
  plate.userData.controller = { positionEnabled, rotationEnabled, rotationStep: angle.step, railAxis: railAxis(railStart, railEnd), applyPositionDelta, applyRotationDelta };
  plate.userData.prompt = promptFor(positionEnabled, rotationEnabled);
  plate.userData.setHovered = (isHovered) => plateMaterial.emissive.setHex(isHovered ? HOVER_EMISSIVE : BASE_EMISSIVE);

  return { base, plate, getT: () => t, applyPositionDelta, applyRotationDelta };
}

// Short Portuguese hint shown under the crosshair while aiming (src/ui/hud.js).
export function promptFor(positionEnabled, rotationEnabled) {
  if (positionEnabled && rotationEnabled) return 'Clique: mover e girar';
  if (positionEnabled) return 'Clique: mover';
  if (rotationEnabled) return 'Clique: girar';
  return null;
}

// World-space XZ segment of the plate's reflective face, for the laser
// tracer (src/gameplay/laser.js). Writes into `out` in place — called
// every frame, so it must not allocate. Requires the plate's matrixWorld
// to already be up to date (caller's responsibility).
export function getReflectiveSegment(mirror, out) {
  _localA.set(-PLATE_WIDTH / 2, 0, 0).applyMatrix4(mirror.plate.matrixWorld);
  _localB.set(PLATE_WIDTH / 2, 0, 0).applyMatrix4(mirror.plate.matrixWorld);
  out.a.x = _localA.x;
  out.a.z = _localA.z;
  out.b.x = _localB.x;
  out.b.z = _localB.z;
  return out;
}
