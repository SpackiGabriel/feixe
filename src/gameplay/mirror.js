import * as THREE from 'three';
import { railAxis, createRailMesh } from './rail.js';
import { createSteppedAngle } from './rotation.js';
import { events } from '../core/events.js';
import { getEnvMap } from '../presentation/env-map.js';
import { createDial, createRailState, createManipulable } from '../presentation/affordances.js';

const PLATE_WIDTH = 1;
const PLATE_HEIGHT = 1;
const PLATE_THICKNESS = 0.05;
const PEDESTAL_RADIUS = 0.06;
const BASE_EMISSIVE = 0x10161a; // faint, so the mirror still reads without an env map (low quality)
const HOVER_EMISSIVE = 0x34424a;

const steelMaterial = new THREE.MeshStandardMaterial({ color: 0x3b4146, metalness: 0.7, roughness: 0.38 });
steelMaterial.userData.shared = true;

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
    steelMaterial
  );
  pedestal.position.y = -(pivotHeight + PLATE_HEIGHT / 2) / 2;
  base.add(pedestal);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.05, 20), steelMaterial);
  foot.position.y = -pivotHeight + 0.025;
  base.add(foot);

  const envMap = getEnvMap();
  const plateMaterial = new THREE.MeshStandardMaterial({
    // Darker than white on purpose: a mirror must not outshine the beams
    // it carries (design-system.md PIPE-05: beam > device > room).
    color: envMap ? 0x8e989c : 0xcfe3ec,
    metalness: envMap ? 1 : 0.5,
    roughness: envMap ? 0.07 : 0.12,
    envMap,
    envMapIntensity: 0.7,
    emissive: BASE_EMISSIVE,
  });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(PLATE_WIDTH, PLATE_HEIGHT, PLATE_THICKNESS), plateMaterial);
  plate.rotation.y = initialRotationY;
  base.add(plate);
  // Top and bottom clamps only — no side bars, so nothing visual sits
  // where the tracer says a beam passes the plate's edge.
  const clampGeometry = new THREE.BoxGeometry(PLATE_WIDTH + 0.04, 0.06, PLATE_THICKNESS * 2.2);
  for (const side of [-1, 1]) {
    const clamp = new THREE.Mesh(clampGeometry, steelMaterial);
    clamp.position.y = side * (PLATE_HEIGHT / 2 + 0.03);
    plate.add(clamp);
  }

  const dial = rotationEnabled ? createDial() : null;
  if (dial) {
    dial.object.position.y = -pivotHeight + 0.06;
    base.add(dial.object);
  }
  const railMesh = positionEnabled ? createRailMesh(railStart, railEnd) : null;
  const rail = railMesh ? createRailState(railMesh) : null;
  const angle = createSteppedAngle(initialRotationY, rotationStepDegrees);

  let t = THREE.MathUtils.clamp(initialT, 0, 1);

  function applyPosition() {
    base.position.lerpVectors(railStart, railEnd, t);
  }
  applyPosition();

  let manipulable = null;

  function applyPositionDelta(delta) {
    if (!positionEnabled) return;
    const wasAtEnd = t === 0 || t === 1;
    const wanted = t + delta;
    t = THREE.MathUtils.clamp(wanted, 0, 1);
    if (wanted !== t && !wasAtEnd) manipulable?.hitLimit(); // once, on arriving at an end
    applyPosition();
  }

  function applyRotationDelta(delta) {
    if (!rotationEnabled) return;
    plate.rotation.y = angle.add(delta);
    manipulable?.rotated(plate.rotation.y);
  }

  plate.userData.interactive = true;
  plate.userData.controller = { positionEnabled, rotationEnabled, rotationStep: angle.step, railAxis: railAxis(railStart, railEnd), applyPositionDelta, applyRotationDelta };
  plate.userData.prompt = promptFor(positionEnabled, rotationEnabled);
  manipulable = createManipulable({
    target: plate,
    dial,
    rail,
    events,
    onHover: (isHovered) => plateMaterial.emissive.setHex(isHovered ? HOVER_EMISSIVE : BASE_EMISSIVE),
  });
  manipulable.rotated(plate.rotation.y);

  return { base, plate, extras: railMesh ? [railMesh] : [], getT: () => t, applyPositionDelta, applyRotationDelta, update: manipulable.update };
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
