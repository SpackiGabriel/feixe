import * as THREE from 'three';
import { dialTexture } from '../gameplay/textures.js';
import { damp } from './motion.js';

// "What can I do with this?" shown in the world, not in a menu
// (docs/presentation.md): a floor dial under anything that rotates, a rail
// under anything that slides, nothing under fixed things. All of them are
// faint while idle (so busy rooms stay calm) and brighten on hover/grab.
const LEVELS = { idle: 0.12, hover: 0.7, grab: 1 };

function createStateful(material, baseOpacity = 1) {
  let state = 'idle';
  let level = LEVELS.idle;
  return {
    setState(next) {
      state = next;
    },
    update(deltaSeconds) {
      level = damp(level, LEVELS[state], 14, deltaSeconds);
      material.opacity = level * baseOpacity;
    },
  };
}

// Floor dial around a rotatable object: 45° ticks and a needle that turns
// with the object, so the angle is readable while rotating.
export function createDial(radius = 0.62) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ map: dialTexture(), transparent: true, depthWrite: false, toneMapped: false, color: 0xe8e2d2 });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), material);
  disc.rotation.x = -Math.PI / 2;
  group.add(disc);

  const needleMaterial = new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, depthWrite: false, toneMapped: false });
  const needleShape = new THREE.Shape();
  needleShape.moveTo(-0.035, 0);
  needleShape.lineTo(0.035, 0);
  needleShape.lineTo(0, radius * 0.92); // +Y here = local -Z on the floor (the object's facing)
  needleShape.closePath();
  const needle = new THREE.Mesh(new THREE.ShapeGeometry(needleShape), needleMaterial);
  needle.rotation.x = -Math.PI / 2;
  const needlePivot = new THREE.Group();
  needlePivot.position.y = 0.002;
  needlePivot.add(needle);
  group.add(needlePivot);
  group.position.y = 0.012;

  const discState = createStateful(material);
  const needleState = createStateful(needleMaterial);
  return {
    object: group,
    // The needle points where the object's local -Z (its facing) points.
    setAngle(rotationY) {
      needlePivot.rotation.y = rotationY;
    },
    setState(state) {
      discState.setState(state);
      needleState.setState(state);
    },
    update(deltaSeconds) {
      discState.update(deltaSeconds);
      needleState.update(deltaSeconds);
    },
  };
}

// Brightness controller for a rail marker (gameplay/rail.js), plus a
// short "bump" flash when the object hits an end of the rail.
export function createRailState(rail) {
  const material = rail.userData.material;
  const base = createStateful(material);
  let bump = 0;
  return {
    setState: base.setState,
    bump() {
      bump = 1;
    },
    update(deltaSeconds) {
      base.update(deltaSeconds);
      bump = Math.max(0, bump - deltaSeconds * 5);
      material.emissiveIntensity = 0.35 + bump * 1.5;
    },
  };
}

const ROTATE_TICK = Math.PI / 12; // a ratchet click every 15°
const GRAB_POP = 0.06;

// Shared hover/grab behaviour for every manipulable device: drives its
// dial and rail, fires ratchet ticks while rotating and a bump at rail
// ends, and gives the grabbed object a small vertical "pop" (vertical only,
// so its beam-tracing width never changes). `target` is the mesh the
// player aims at (holds userData.controller).
export function createManipulable({ target, dial = null, rail = null, events, onHover = () => {} }) {
  let hovered = false;
  let grabbed = false;
  let pop = 0;
  let lastTick = null;

  function refresh() {
    const state = grabbed ? 'grab' : hovered ? 'hover' : 'idle';
    dial?.setState(state);
    rail?.setState(state);
  }
  refresh();

  target.userData.setHovered = (value) => {
    hovered = value;
    onHover(value);
    refresh();
  };
  target.userData.controller.setGrabbed = (value) => {
    grabbed = value;
    if (value) pop = 1;
    refresh();
  };

  return {
    // Call after any rotation change with the new angle (radians).
    rotated(angle) {
      dial?.setAngle(angle);
      const tick = Math.floor(angle / ROTATE_TICK);
      if (lastTick !== null && tick !== lastTick) events.emit('rotate:tick', {});
      lastTick = tick;
    },
    // Call when a slide tried to go past an end of the rail.
    hitLimit() {
      rail?.bump();
      events.emit('rail:limit', {});
    },
    update(deltaSeconds) {
      dial?.update(deltaSeconds);
      rail?.update(deltaSeconds);
      pop = Math.max(0, pop - deltaSeconds / 0.18);
      target.scale.y = 1 + GRAB_POP * pop * pop;
    },
  };
}
