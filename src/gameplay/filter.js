import * as THREE from 'three';
import { COLOR_NAMES } from './colors.js';
import { colorToHex } from './laser.js';

const PANEL_WIDTH = 0.8;
const PANEL_HEIGHT = 0.8;
const PANEL_THICKNESS = 0.05;

const _localA = new THREE.Vector3();
const _localB = new THREE.Vector3();

// Spec §11 level 7 ("Filtro"): a subtractive filter the player slides
// along a rail into a white beam's path to isolate one primary (RF04's
// `filter` segment type ANDs the beam's color with `primary` and keeps
// going, rather than reflecting or stopping it — see laser.js). Position
// only, no rotation — unlike a mirror, a filter doesn't redirect
// anything, it just needs to be standing in the right spot.
export function createFilter({ railStart, railEnd, initialT = 0.5, rotationY = 0, primaryName }) {
  const primary = COLOR_NAMES[primaryName];
  const hex = colorToHex(primary);

  const base = new THREE.Group();

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(PANEL_WIDTH, PANEL_HEIGHT, PANEL_THICKNESS),
    new THREE.MeshStandardMaterial({
      color: hex,
      transparent: true,
      opacity: 0.5,
      emissive: hex,
      emissiveIntensity: 0.3,
    })
  );
  plate.rotation.y = rotationY;
  base.add(plate);

  let t = THREE.MathUtils.clamp(initialT, 0, 1);

  function applyPosition() {
    base.position.lerpVectors(railStart, railEnd, t);
  }
  applyPosition();

  function applyPositionDelta(delta) {
    t = THREE.MathUtils.clamp(t + delta, 0, 1);
    applyPosition();
  }

  plate.userData.interactive = true;
  plate.userData.controller = {
    positionEnabled: true,
    rotationEnabled: false,
    applyPositionDelta,
    applyRotationDelta: () => {},
  };
  plate.userData.prompt = 'Clique: mover filtro';

  return { base, plate, getT: () => t, primary, applyPositionDelta };
}

// World-space XZ segment of the filter's plate, for the laser tracer —
// same matrixWorld-based approach as mirror.js's getReflectiveSegment,
// even though a filter's rotation never changes at runtime, so both
// gameplay objects stay consistent. Writes into `out` in place — called
// every frame, so it must not allocate.
export function getFilterSegment(filter, out) {
  _localA.set(-PANEL_WIDTH / 2, 0, 0).applyMatrix4(filter.plate.matrixWorld);
  _localB.set(PANEL_WIDTH / 2, 0, 0).applyMatrix4(filter.plate.matrixWorld);
  out.a.x = _localA.x;
  out.a.z = _localA.z;
  out.b.x = _localB.x;
  out.b.z = _localB.z;
  return out;
}
