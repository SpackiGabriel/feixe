import * as THREE from 'three';
import { railAxis, createRailMesh, slideAlongRail, writePlateSegment } from './rail.js';
import { events } from '../core/events.js';
import { createRailState, createManipulable } from '../presentation/affordances.js';
import { COLOR_NAMES } from './colors.js';
import { colorToHex } from './laser.js';
import { symbolFaceTexture } from '../presentation/textures.js';

export const PANEL_WIDTH = 0.8;
const PANEL_HEIGHT = 0.8;
const PANEL_THICKNESS = 0.05;

const steelMaterial = new THREE.MeshStandardMaterial({ color: 0x3b4146, metalness: 0.7, roughness: 0.38 });
steelMaterial.userData.shared = true;

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

  const plateMaterial = new THREE.MeshStandardMaterial({
      color: hex,
      transparent: true,
      opacity: 0.5,
      emissive: hex,
      emissiveIntensity: 0.6,
      emissiveMap: symbolFaceTexture(primaryName),
  });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(PANEL_WIDTH, PANEL_HEIGHT, PANEL_THICKNESS), plateMaterial);
  plate.rotation.y = rotationY;
  base.add(plate);
  // Frame: top/bottom bars and a stand (SHAPE-01 "translucent plate in a
  // frame"), so a filter never reads as a receiver or a mirror.
  const barGeometry = new THREE.BoxGeometry(PANEL_WIDTH + 0.06, 0.05, PANEL_THICKNESS * 2.4);
  for (const side of [-1, 1]) {
    const bar = new THREE.Mesh(barGeometry, steelMaterial);
    bar.position.y = side * (PANEL_HEIGHT / 2 + 0.025);
    plate.add(bar);
  }
  const standHeight = railStart.y - PANEL_HEIGHT / 2;
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, standHeight, 0.06), steelMaterial);
  stand.position.y = -(PANEL_HEIGHT / 2 + standHeight / 2);
  base.add(stand);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.2), steelMaterial);
  foot.position.y = -railStart.y + 0.02;
  foot.rotation.y = rotationY;
  base.add(foot);

  const railMesh = createRailMesh(railStart, railEnd);
  const rail = railMesh ? createRailState(railMesh) : null;

  let t = THREE.MathUtils.clamp(initialT, 0, 1);

  function applyPosition() {
    base.position.lerpVectors(railStart, railEnd, t);
  }
  applyPosition();

  let manipulable = null;
  function applyPositionDelta(delta) {
    const step = slideAlongRail(t, delta);
    t = step.t;
    if (step.hitLimit) manipulable?.hitLimit();
    applyPosition();
  }

  plate.userData.controller = {
    positionEnabled: true,
    rotationEnabled: false,
    railAxis: railAxis(railStart, railEnd),
    applyPositionDelta,
    applyRotationDelta: () => {},
  };
  plate.userData.prompt = 'Clique: mover filtro';
  // Own hover feedback: the generic tint would overwrite the color emissive.
  manipulable = createManipulable({
    target: plate,
    rail,
    events,
    onHover: (isHovered) => { plateMaterial.emissiveIntensity = isHovered ? 1.2 : 0.6; },
  });

  return { base, plate, extras: railMesh ? [railMesh] : [], getT: () => t, primary, applyPositionDelta, update: manipulable.update };
}

// World-space XZ segment of the filter's plate, for the laser tracer — the
// same matrixWorld-based extraction as a mirror's (rail.js
// writePlateSegment), even though a filter never rotates at runtime.
export function getFilterSegment(filter, out) {
  return writePlateSegment(filter.plate, PANEL_WIDTH, out);
}
