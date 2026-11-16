import * as THREE from 'three';
import { doorTexture, glassTexture } from '../gameplay/textures.js';
import { damp } from './motion.js';
import { CHAIN_DELAY } from './conduits.js';

export const DOOR_WIDTH = 2;
const PANEL_HEIGHT = 2.8;
const PANEL_THICKNESS = 0.15;
const FRAME = 0.16; // jamb width
const LINTEL_HEIGHT = 0.2;
const DEPTH = 0.3; // frame depth, through both faces

const PIP_OFF = 0x24221e;
const PIP_ON = new THREE.Color(0xffd9a8); // warm incandescent: brightness, not hue, carries state (COL-02)
const PIP_DIM = new THREE.Color(PIP_OFF);
const LAMP_OFF = new THREE.Color(0x1d1c1a);
const LAMP_ON = new THREE.Color(0xffe2b8);
const TRAP_FLASH_HZ = 2; // ACC-02: never faster than ~2 Hz

const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3033, roughness: 0.55, metalness: 0.6 });
frameMaterial.userData.shared = true;

// Visual for one door: frame (jambs + lintel, so even a free-standing door
// reads as a doorway), the sliding panel, one indicator pip per input on
// the lintel (filled = that input is satisfied, a hollow diamond per trap
// that must stay dark), lamp strips that light when the way is open, and —
// for exit doors — a warm glow behind the panel and a light spill.
// It only *reads* state; door.js and door-motion.js own the logic.
// `style: 'glass'`: a framed glass pane instead of the metal slab (level 8's
// door in the glass partition), so it reads as part of that wall. It has an
// open square hatch spanning beam and eye height: it shows why the beam
// and the player's aim pass the closed door (level 8 playtest), while the
// door still blocks walking (door.js) — there's no jumping. Visual only:
// beams never stop at doors (laser-system.js doesn't trace them) and a
// glass door has no aim occluder (door.js).
const HATCH_WIDTH = 1.2;
const HATCH_BOTTOM = 1.0; // above the floor, with the panel closed
const HATCH_TOP = 2.2;

function glassPanel() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xd4e2e6,
    map: glassTexture(),
    roughness: 0.15,
    metalness: 0,
    emissive: 0x18242a,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Group();
  const bottom = HATCH_BOTTOM - PANEL_HEIGHT / 2; // panel-local y (origin at the panel's centre)
  const top = HATCH_TOP - PANEL_HEIGHT / 2;
  const side = (DOOR_WIDTH - HATCH_WIDTH) / 2;
  const box = (w, h, d, x, y, mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, 0);
    panel.add(mesh);
    return mesh;
  };
  // Glass around the hatch: below, above, and the two sides.
  const glass = [
    box(DOOR_WIDTH, bottom + PANEL_HEIGHT / 2, 0.05, 0, (bottom - PANEL_HEIGHT / 2) / 2, material),
    box(DOOR_WIDTH, PANEL_HEIGHT / 2 - top, 0.05, 0, (top + PANEL_HEIGHT / 2) / 2, material),
    box(side, top - bottom, 0.05, -(HATCH_WIDTH + side) / 2, (top + bottom) / 2, material),
    box(side, top - bottom, 0.05, (HATCH_WIDTH + side) / 2, (top + bottom) / 2, material),
  ];
  for (const g of glass) g.renderOrder = 1; // after the opaque rim, so the rim isn't washed out
  // Outer rim, then the hatch's own frame (so it reads as a cut, not a gap).
  const rim = 0.07;
  for (const s of [-1, 1]) {
    box(rim, PANEL_HEIGHT, PANEL_THICKNESS, s * (DOOR_WIDTH / 2 - rim / 2), 0, frameMaterial);
    box(DOOR_WIDTH, rim, PANEL_THICKNESS, 0, s * (PANEL_HEIGHT / 2 - rim / 2), frameMaterial);
    box(rim, top - bottom + rim, PANEL_THICKNESS, s * (HATCH_WIDTH / 2 + rim / 2), (top + bottom) / 2, frameMaterial);
  }
  box(HATCH_WIDTH + rim * 2, rim, PANEL_THICKNESS, 0, bottom - rim / 2, frameMaterial);
  box(HATCH_WIDTH + rim * 2, rim, PANEL_THICKNESS, 0, top + rim / 2, frameMaterial);
  return panel;
}

export function createDoorView({ position, rotationY, inputCount, trapCount, exit, style }) {
  const root = new THREE.Group();
  root.position.set(position.x, 0, position.z);
  root.rotation.y = rotationY;

  const panel = style === 'glass'
    ? glassPanel()
    : new THREE.Mesh(
      new THREE.BoxGeometry(DOOR_WIDTH, PANEL_HEIGHT, PANEL_THICKNESS),
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: doorTexture(), roughness: 0.6, metalness: 0.45 }),
    );
  panel.position.y = PANEL_HEIGHT / 2;
  root.add(panel);

  const jambGeometry = new THREE.BoxGeometry(FRAME, PANEL_HEIGHT + LINTEL_HEIGHT, DEPTH);
  for (const side of [-1, 1]) {
    const jamb = new THREE.Mesh(jambGeometry, frameMaterial);
    jamb.position.set(side * (DOOR_WIDTH / 2 + FRAME / 2), (PANEL_HEIGHT + LINTEL_HEIGHT) / 2, 0);
    root.add(jamb);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_WIDTH + FRAME * 2, LINTEL_HEIGHT, DEPTH), frameMaterial);
  lintel.position.y = PANEL_HEIGHT + LINTEL_HEIGHT / 2;
  root.add(lintel);

  // Lamp strips on the inner faces of both jambs.
  const lampMaterial = new THREE.MeshBasicMaterial({ color: LAMP_OFF.clone(), toneMapped: false });
  const lampGeometry = new THREE.BoxGeometry(0.03, PANEL_HEIGHT * 0.85, DEPTH + 0.02);
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
    lamp.position.set(side * (DOOR_WIDTH / 2 + 0.02), PANEL_HEIGHT * 0.5, 0);
    root.add(lamp);
  }

  // Pips: cylinders through the lintel so they read from both sides.
  const pips = [];
  const total = inputCount + trapCount;
  const spacing = 0.22;
  for (let i = 0; i < total; i++) {
    const isTrap = i >= inputCount;
    const material = new THREE.MeshBasicMaterial({ color: PIP_OFF, toneMapped: false });
    const geometry = isTrap
      ? new THREE.BoxGeometry(0.075, 0.075, DEPTH + 0.04).rotateZ(Math.PI / 4)
      : new THREE.CylinderGeometry(0.05, 0.05, DEPTH + 0.04, 16).rotateX(Math.PI / 2);
    const pip = new THREE.Mesh(geometry, material);
    pip.position.set((i - (total - 1) / 2) * spacing, PANEL_HEIGHT + LINTEL_HEIGHT / 2, 0);
    root.add(pip);
    pips.push({ material, isTrap, level: 0, since: null });
  }

  // Exit: warm glow plane on the wall side, revealed as the panel lifts.
  let glowMaterial = null;
  let spill = null;
  if (exit) {
    const localZ = { x: Math.sin(rotationY), z: Math.cos(rotationY) };
    const away = localZ.x * position.x + localZ.z * position.z > 0 ? 1 : -1; // side facing away from the room centre
    glowMaterial = new THREE.MeshBasicMaterial({ color: 0xd9c7a6, transparent: true, opacity: 0, toneMapped: false, fog: false });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_WIDTH, PANEL_HEIGHT), glowMaterial);
    glow.position.set(0, PANEL_HEIGHT / 2, away * (PANEL_THICKNESS / 2 + 0.015)); // between panel and wall
    if (away < 0) glow.rotation.y = 0;
    else glow.rotation.y = Math.PI; // face the room
    root.add(glow);
    spill = new THREE.PointLight(0xffdcb0, 0, 4.5, 1.6);
    spill.position.set(0, 1.4, -away * 0.7);
    root.add(spill);
  }

  let time = 0;
  let lampLevel = 0;

  // inputStates/trapStates: current booleans; motion: door-motion.js.
  function update(deltaSeconds, inputStates, trapStates, motion) {
    time += deltaSeconds;
    panel.position.y = PANEL_HEIGHT / 2 + motion.getOpenness() * PANEL_HEIGHT + motion.visualOffset();

    for (let i = 0; i < pips.length; i++) {
      const pip = pips[i];
      const on = pip.isTrap ? trapStates[i - inputCount] : inputStates[i];
      if (on && pip.since === null) pip.since = time;
      if (!on) pip.since = null;
      // An input pip fills once the conduit pulse has had time to arrive;
      // a trap pip flashes (≤ 2 Hz) while its trap is lit.
      const target = pip.isTrap
        ? (on ? (Math.sin(time * Math.PI * 2 * TRAP_FLASH_HZ) > 0 ? 1 : 0.35) : 0)
        : (on && time - pip.since >= CHAIN_DELAY ? 1 : 0);
      pip.level = on ? damp(pip.level, target, 25, deltaSeconds) : damp(pip.level, 0, 12, deltaSeconds);
      pip.material.color.copy(PIP_DIM).lerp(PIP_ON, pip.level);
    }

    const open = motion.getPhase() === 'rising' || motion.getPhase() === 'open';
    lampLevel = damp(lampLevel, open ? 1 : 0, open ? 6 : 14, deltaSeconds);
    lampMaterial.color.copy(LAMP_OFF).lerp(LAMP_ON, lampLevel);

    if (glowMaterial) {
      glowMaterial.opacity = Math.min(0.9, motion.getOpenness() * 1.2);
      spill.intensity = motion.getOpenness() * 1.4;
    }
  }

  return { root, panel, update };
}
