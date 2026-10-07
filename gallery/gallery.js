// Grey-box gallery — a throwaway visual-evaluation page, NOT game code and
// NOT final assets. It reuses the game's real room, factories, laser system,
// camera and controls so scale, lighting and readability are judged under
// real conditions. Everything it overrides (lighting rig, neutral palette,
// symbol decals, thick beams) is local to this page; nothing here changes
// src/. Every value below is a knob for visual evaluation, not a decision
// (see design/visual/design-system-discovery.md).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRenderer } from '../src/core/renderer.js';
import { createScene } from '../src/core/scene.js';
import { createCamera } from '../src/core/camera.js';
import { createInput } from '../src/core/input.js';
import { createLookController } from '../src/core/look.js';
import { createMovementController } from '../src/core/movement.js';
import { createInteraction } from '../src/core/interaction.js';
import { createManipulation } from '../src/core/manipulation.js';
import { createMirror } from '../src/gameplay/mirror.js';
import { createEmitter } from '../src/gameplay/emitter.js';
import { createReceiver } from '../src/gameplay/receiver.js';
import { createFilter } from '../src/gameplay/filter.js';
import { createSwitch } from '../src/gameplay/switch.js';
import { createBlocker } from '../src/gameplay/blocker.js';
import { createPortalPair } from '../src/gameplay/portal.js';
import { createDoor } from '../src/gameplay/door.js';
import { createLaserSystem } from '../src/gameplay/laser-system.js';
import { colorToHex } from '../src/gameplay/laser.js';
import { COLOR_NAMES } from '../src/gameplay/colors.js';
import { getLevels } from '../src/levels/level-manager.js';
import { instantiateLevel, disposeLevel } from '../src/levels/level-loader.js';
import { BEAM_HEIGHT, ROOM_HALF } from '../src/levels/data/constants.js';

// ---------------------------------------------------------------- settings

const LIGHTING_PRESETS = {
  // "current" = what src/core/scene.js does today.
  current: { ambient: 0.4, hemi: 0, dir: 0.8, env: false, envIntensity: 0 },
  // "premise" = starting point for design-premise.md §6; tune with the sliders.
  premise: { ambient: 0.02, hemi: 0.06, dir: 0, env: true, envIntensity: 0.06 },
};

// Candidate neutral grades taken from the colour families in design-premise.md §5.
// Hexes are for visual comparison only.
const ROOM_PALETTES = {
  'concrete gray': { floor: 0x3b3b3a, wall: 0x6f6f6c },
  'dark painted steel': { floor: 0x24282c, wall: 0x3d444b },
  'muted industrial green': { floor: 0x2c322c, wall: 0x4b574a },
  'aged off-white': { floor: 0x3d3a34, wall: 0x9d9889 },
  'faded beige': { floor: 0x3a352c, wall: 0x8a7f69 },
  'near black': { floor: 0x1a1a1a, wall: 0x2a2a2a },
};
const NEUTRAL_SWATCHES = [0x6b6b68, 0xb9b4a3, 0x2e3338, 0x4d5a4a, 0x9a8f78, 0x141414, 0x5b5148];
const HUE_NAMES = ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan', 'white'];

const SYMBOL_MAPS = [
  { label: 'red ○  green △  blue ◇', shapes: ['circle', 'triangle', 'diamond'] },
  { label: 'red △  green ◇  blue ○', shapes: ['triangle', 'diamond', 'circle'] },
  { label: 'red ◇  green ○  blue △', shapes: ['diamond', 'circle', 'triangle'] },
];
const COMPOSITES = { yellow: [0, 1], magenta: [0, 2], cyan: [1, 2], white: [0, 1, 2] }; // indices into red/green/blue
const NEW_SYMBOLS = { yellow: ['square', false], magenta: ['hexagon', false], cyan: ['cross', false], white: ['hexagon', true] };

const settings = {
  scene: 'lineup',
  lighting: 'premise',
  ...LIGHTING_PRESETS.premise,
  beamLight: 1,
  tone: 'none',
  beams: true,
  doorOpen: false,
  thick: false,
  thickness: 0.02,
  roomPalette: 'concrete gray',
  ceiling: false,
  figure: true,
  view: 'normal',
  symbols: true,
  symbolMap: 0,
  symbolStyle: 'side',
  symbolSize: 0.3,
  symbolActive: 'dark', // symbol colour while the receiver is lit: 'dark' (cut-out look) or 'same' hue
};

// ------------------------------------------------------------------- setup

const renderer = createRenderer();
const { scene, colliders, wallSegments } = createScene();
const camera = createCamera();

// The game's own lights are replaced by this page's rig.
const gameLights = [];
scene.traverse((o) => { if (o.isLight) gameLights.push(o); });
for (const light of gameLights) light.parent.remove(light);

const roomMeshes = [];
scene.traverse((o) => { if (o.isMesh) roomMeshes.push(o); });
const floorMaterial = roomMeshes[0].material;
const wallMaterial = roomMeshes[1].material;

const ambient = new THREE.AmbientLight(0xffffff, 0);
const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0);
const directional = new THREE.DirectionalLight(0xffffff, 0);
directional.position.set(3, 4, 2);
scene.add(ambient, hemi, directional);

const pmrem = new THREE.PMREMGenerator(renderer);
const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_HALF * 2, ROOM_HALF * 2), wallMaterial);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 3;
scene.add(ceiling);

// Floor ticks every 2 m across the room — distance reference for readability.
const ticks = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([-4, -2, 0, 2, 4].flatMap((z) => [new THREE.Vector3(-ROOM_HALF, 0.01, z), new THREE.Vector3(ROOM_HALF, 0.01, z)])),
  new THREE.LineBasicMaterial({ color: 0x555555 })
);
ticks.userData.decor = true;
scene.add(ticks);

const figure = new THREE.Group();
{
  const mat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 1.45, 16), mat);
  body.position.y = 0.725;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat);
  head.position.y = 1.58;
  figure.add(body, head);
  figure.position.set(1.9, 0, -3.8); // next to the back-wall door/receivers, for scale
  scene.add(figure);
}

// Palette board on the front wall (behind the player's start): candidate
// neutrals, then the 7 reserved gameplay hues as lit paint, then as emissive.
{
  const board = new THREE.Group();
  const swatch = (hex, x, y, emissive) => {
    const mat = new THREE.MeshStandardMaterial(emissive ? { color: 0x111111, emissive: hex, emissiveIntensity: 1 } : { color: hex, roughness: 0.8 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), mat);
    mesh.position.set(x, y, 0);
    board.add(mesh);
  };
  NEUTRAL_SWATCHES.forEach((hex, i) => swatch(hex, (i - 3) * 0.65, 2.0, false));
  HUE_NAMES.forEach((name, i) => swatch(colorToHex(COLOR_NAMES[name]), (i - 3) * 0.65, 1.35, false));
  HUE_NAMES.forEach((name, i) => swatch(colorToHex(COLOR_NAMES[name]), (i - 3) * 0.65, 0.7, true));
  board.position.set(0, 0, ROOM_HALF - 0.02);
  board.rotation.y = Math.PI;
  scene.add(board);
}

const input = createInput(renderer.domElement);
let lookController = createLookController(camera);
let lookEnabled = true;
const look = {
  handleMouseMove: (dx, dy) => lookController.handleMouseMove(dx, dy),
  setEnabled: (value) => { lookEnabled = value; lookController.setEnabled(value); },
};
input.onMouseMove(look.handleMouseMove);

const interactiveObjects = [];
const interaction = createInteraction(camera, scene, interactiveObjects);
createManipulation({ input, look, interaction });

let levelColliders = [];
const movement = createMovementController(camera, input.keys, colliders, () => levelColliders);

// Stations are yaw-only (pitch 0) because look.js keeps its pitch private.
const STATIONS = {
  'start (4.5 m)': { x: 0, z: 4.5, yaw: 0 },
  'mid': { x: 0, z: 0.6, yaw: 0 },
  'far corner (≈10 m)': { x: 4.4, z: 4.4, yaw: Math.atan2(6.4, 8.4) },
  'at receivers': { x: 0, z: -3.2, yaw: 0 },
  'palette board': { x: 0, z: 0, yaw: Math.PI },
};
function gotoStation(s) {
  camera.position.set(s.x, 1.6, s.z);
  lookController = createLookController(camera);
  lookController.setEnabled(lookEnabled);
  camera.rotation.set(0, s.yaw, 0, 'YXZ');
}
gotoStation(STATIONS['start (4.5 m)']);

// ----------------------------------------------------------------- content

let content = null; // { roots, parts, decorations, dispose }
let laser = null;
const decals = []; // { group, mats, isOn }

const emptyParts = () => ({ mirrors: [], emitters: [], receivers: [], filters: [], blockers: [], portals: [], doors: [], switches: [] });

function disposeObject(root) {
  root.traverse((o) => {
    const i = interactiveObjects.indexOf(o);
    if (i !== -1) interactiveObjects.splice(i, 1);
    if (o.userData.originalMaterial) o.material = o.userData.originalMaterial;
    o.geometry?.dispose();
    o.material?.dispose();
  });
}

function clearContent() {
  if (laser) laser.dispose();
  laser = null;
  decals.length = 0;
  if (content) content.dispose();
  content = null;
  levelColliders = [];
}

function v3(x, y, z) { return new THREE.Vector3(x, y, z); }

function buildLineup() {
  const parts = emptyParts();
  const roots = [];
  const deco = []; // { kind: 'receiver'|'emitter', obj, colorName }
  const add = (o) => { scene.add(o); roots.push(o); return o; };

  // Beam vignettes (real laser tracing): emitter → [filter] → receiver on the back wall.
  const columns = [
    { x: -3.9, emitter: 'red', receiver: 'red' },
    { x: -2.2, emitter: 'white', filter: 'green', receiver: 'green' },
    { x: 2.2, emitter: 'blue', receiver: 'blue' },
    { x: 3.9, emitter: 'white', filter: 'blue', receiver: 'blue' },
  ];
  for (const c of columns) {
    const emitter = createEmitter({ position: v3(c.x, BEAM_HEIGHT, 0.5), colorName: c.emitter });
    add(emitter.mesh); interactiveObjects.push(emitter.mesh); parts.emitters.push(emitter);
    deco.push({ kind: 'emitter', obj: emitter, colorName: c.emitter });
    const receiver = createReceiver({ position: v3(c.x, BEAM_HEIGHT, -(ROOM_HALF - 0.1)), rotationY: 0, colorName: c.receiver });
    add(receiver.mesh); parts.receivers.push(receiver);
    deco.push({ kind: 'receiver', obj: receiver, colorName: c.receiver });
    if (c.filter) {
      const filter = createFilter({ railStart: v3(c.x, BEAM_HEIGHT, -2.2), railEnd: v3(c.x, BEAM_HEIGHT, -2.2), primaryName: c.filter });
      add(filter.base); interactiveObjects.push(filter.plate); parts.filters.push(filter);
    }
  }

  // Door on the back wall (toggle with O) and a portal pair on the side walls.
  const doorState = { isActive: () => settings.doorOpen };
  const door = createDoor({ position: v3(0, 1.5, -(ROOM_HALF - 0.1)), rotationY: Math.PI, rule: 'AND', receivers: [doorState] });
  add(door.mesh); parts.doors.push(door);
  const portals = createPortalPair({ id: 'g', a: { position: [-(ROOM_HALF - 0.1), BEAM_HEIGHT, 0.8], rotationY: -Math.PI / 2 }, b: { position: [ROOM_HALF - 0.1, BEAM_HEIGHT, 0.8], rotationY: Math.PI / 2 } });
  for (const p of portals) { add(p.mesh); parts.portals.push(p); }

  return { roots, parts, deco, portals, dispose: () => roots.forEach((r) => { scene.remove(r); disposeObject(r); }) };
}

function buildDevices() {
  const parts = emptyParts();
  const roots = [];
  const deco = [];
  const add = (o) => { scene.add(o); roots.push(o); return o; };
  const z = -2.5;
  const at = (i) => -4.2 + i * 1.2;
  const mirror = createMirror({ railStart: v3(at(0), BEAM_HEIGHT, z), railEnd: v3(at(0), BEAM_HEIGHT, z), initialRotationY: Math.PI / 4, rotationEnabled: true, rotationStepDegrees: 15 });
  add(mirror.base); interactiveObjects.push(mirror.plate); parts.mirrors.push(mirror);
  ['red', 'green', 'blue'].forEach((primaryName, i) => {
    const filter = createFilter({ railStart: v3(at(i + 1), BEAM_HEIGHT, z), railEnd: v3(at(i + 1), BEAM_HEIGHT, z), primaryName });
    add(filter.base); interactiveObjects.push(filter.plate); parts.filters.push(filter);
  });
  const switchIdle = createSwitch({ position: v3(at(4), 0, z) });
  const switchActive = createSwitch({ position: v3(at(5), 0, z) });
  switchActive.activate();
  for (const sw of [switchIdle, switchActive]) { add(sw.mesh); interactiveObjects.push(sw.button); parts.switches.push(sw); }
  const blocker = createBlocker({ position: v3(at(6), 0.7, z) });
  add(blocker.mesh); parts.blockers.push(blocker);
  const emitter = createEmitter({ position: v3(at(7), BEAM_HEIGHT, z), colorName: 'white' });
  add(emitter.mesh); interactiveObjects.push(emitter.mesh); parts.emitters.push(emitter);
  deco.push({ kind: 'emitter', obj: emitter, colorName: 'white' });
  levelColliders = [blocker.collider];
  return { roots, parts, deco, portals: [], noLaser: true, dispose: () => roots.forEach((r) => { scene.remove(r); disposeObject(r); }) };
}

function buildSymbols() {
  const parts = emptyParts();
  const roots = [];
  const deco = [];
  const add = (o) => { scene.add(o); roots.push(o); return o; };
  HUE_NAMES.forEach((name, i) => {
    const receiver = createReceiver({ position: v3((i - 3) * 1.2, BEAM_HEIGHT, -(ROOM_HALF - 0.1)), colorName: name });
    add(receiver.mesh); parts.receivers.push(receiver);
    deco.push({ kind: 'receiver', obj: receiver, colorName: name, forced: true });
  });
  ['red', 'green', 'blue', 'white'].forEach((name, i) => {
    const emitter = createEmitter({ position: v3((i - 1.5) * 1.2, BEAM_HEIGHT, -1.5), colorName: name });
    add(emitter.mesh); parts.emitters.push(emitter);
    deco.push({ kind: 'emitter', obj: emitter, colorName: name });
  });
  return { roots, parts, deco, portals: [], noLaser: true, dispose: () => roots.forEach((r) => { scene.remove(r); disposeObject(r); }) };
}

let currentLevelData = null;
function buildLevel(index) {
  const data = getLevels()[index];
  currentLevelData = data;
  const loaded = instantiateLevel(data, scene, interactiveObjects);
  const deco = [
    ...loaded.receivers.map((obj, i) => ({ kind: 'receiver', obj, colorName: data.receivers[i].colorName })),
    ...loaded.emitters.map((obj, i) => ({ kind: 'emitter', obj, colorName: data.emitters[i].colorName })),
  ];
  levelColliders = [...loaded.blockers.map((b) => b.collider), ...loaded.doors.map((d) => d.getCollider())];
  return { roots: loaded.roots, parts: loaded, deco, portals: loaded.portals, level: loaded, dispose: () => disposeLevel(loaded, scene, interactiveObjects) };
}

function applySolution() {
  if (!content?.level || !currentLevelData?.solution) return;
  const { solution } = currentLevelData;
  const { level } = content;
  for (const [id, t] of Object.entries(solution.mirrors ?? {})) {
    const i = currentLevelData.mirrors.findIndex((m) => m.id === id);
    if (t.t !== undefined) level.mirrors[i].applyPositionDelta(t.t - currentLevelData.mirrors[i].initialT);
    if (t.rotationY !== undefined) level.mirrors[i].applyRotationDelta(t.rotationY - level.mirrors[i].plate.rotation.y);
  }
  for (const [id, t] of Object.entries(solution.filters ?? {})) {
    const i = currentLevelData.filters.findIndex((f) => f.id === id);
    level.filters[i].applyPositionDelta(t.t - currentLevelData.filters[i].initialT);
  }
  for (const id of solution.switches ?? []) {
    const i = currentLevelData.switches.findIndex((s) => s.id === id);
    if (!level.switches[i].isActive()) level.switches[i].activate();
  }
}

function rebuildLaser() {
  if (laser) laser.dispose();
  laser = null;
  if (!content || content.noLaser) return;
  const p = content.parts;
  laser = createLaserSystem({ scene, wallSegments, ...p, emitters: settings.beams ? p.emitters : [] });
}

function loadContent() {
  clearContent();
  if (settings.scene === 'lineup') content = buildLineup();
  else if (settings.scene === 'devices') content = buildDevices();
  else if (settings.scene === 'symbols') content = buildSymbols();
  else content = buildLevel(parseInt(settings.scene.replace('level-', ''), 10) - 1);
  figure.position.x = settings.scene === 'symbols' ? 4.5 : 1.9;
  rebuildLaser();
  rebuildDecals();
  applySettings();
}

// ------------------------------------------------------- symbol decal study

function poly(points) { return new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))); }
const SHAPES = {
  circle: (r) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; },
  triangle: (r) => poly([[0, r], [-0.87 * r, -0.5 * r], [0.87 * r, -0.5 * r]]),
  diamond: (r) => poly([[0, r], [0.65 * r, 0], [0, -r], [-0.65 * r, 0]]),
  square: (r) => poly([[-0.8 * r, -0.8 * r], [0.8 * r, -0.8 * r], [0.8 * r, 0.8 * r], [-0.8 * r, 0.8 * r]]),
  hexagon: (r) => poly([0, 1, 2, 3, 4, 5].map((i) => [r * Math.cos(i * Math.PI / 3), r * Math.sin(i * Math.PI / 3)])),
  cross: (r) => { const a = r * 0.3, b = r; return poly([[-a, b], [a, b], [a, a], [b, a], [b, -a], [a, -a], [a, -b], [-a, -b], [-a, -a], [-b, -a], [-b, a], [-a, a]]); },
};
function outlined(name, r, t) { const s = SHAPES[name](r); s.holes.push(SHAPES[name](r - t)); return s; }

function buildSymbol(colorName, size) {
  const group = new THREE.Group();
  const mats = [];
  const hex = colorToHex(COLOR_NAMES[colorName]);
  const mk = (shape, x = 0) => {
    const mat = new THREE.MeshBasicMaterial({ color: hex, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    mesh.position.x = x;
    group.add(mesh); mats.push(mat);
  };
  const shapes = SYMBOL_MAPS[settings.symbolMap].shapes;
  const primaryIndex = ['red', 'green', 'blue'].indexOf(colorName);
  if (primaryIndex !== -1) {
    mk(SHAPES[shapes[primaryIndex]](size / 2));
  } else if (settings.symbolStyle === 'side') {
    const comps = COMPOSITES[colorName];
    const s = size * (comps.length === 2 ? 0.62 : 0.5);
    comps.forEach((c, i) => mk(SHAPES[shapes[c]](s / 2), (i - (comps.length - 1) / 2) * s * 1.2));
  } else if (settings.symbolStyle === 'overlay') {
    for (const c of COMPOSITES[colorName]) mk(outlined(shapes[c], size / 2, size * 0.09));
  } else {
    const [name, hollow] = NEW_SYMBOLS[colorName];
    mk(hollow ? outlined(name, size / 2, size * 0.09) : SHAPES[name](size / 2));
  }
  return { group, mats, hex };
}

function rebuildDecals() {
  for (const d of decals) { d.group.parent?.remove(d.group); d.group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); }
  decals.length = 0;
  if (!content || !settings.symbols) return;
  for (const item of content.deco) {
    const size = item.kind === 'emitter' ? Math.min(settings.symbolSize, 0.22) : settings.symbolSize;
    const { group, mats, hex } = buildSymbol(item.colorName, size);
    // Receiver: on the +Z face (the side facing the room for wall-mounted ones). Emitter: on the rear cap.
    group.position.z = item.kind === 'emitter' ? 0.256 : 0.028;
    item.obj.mesh.add(group);
    const isOn = item.forced ? () => settings.beams : () => (item.kind === 'receiver' ? item.obj.isActive() : settings.beams);
    decals.push({ group, mats, hex, isOn });
  }
}

// -------------------------------------------------------- per-frame helpers

const thickPool = [];
const thickMaterials = [];
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
function syncBeams() {
  let used = 0;
  const hideLines = settings.view === 'silhouette';
  scene.traverse((o) => {
    if (o.isPointLight) o.intensity *= settings.beamLight; // laser-beam.js resets it every frame
    if (!o.isLine || o.userData.decor) return;
    o.visible = !hideLines && !settings.thick;
    if (!settings.thick || hideLines) return;
    const pos = o.geometry.attributes.position;
    const count = o.geometry.drawRange.count;
    for (let i = 0; i + 1 < count; i++) {
      _a.fromBufferAttribute(pos, i); _b.fromBufferAttribute(pos, i + 1);
      const len = _a.distanceTo(_b);
      if (len < 1e-4) continue;
      if (used >= thickPool.length) {
        const geo = new THREE.CylinderGeometry(1, 1, 1, 8);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData.decor = true;
        scene.add(mesh);
        thickPool.push(mesh); thickMaterials.push(mat);
      }
      const mesh = thickPool[used];
      mesh.visible = true;
      mesh.position.copy(_a).add(_b).multiplyScalar(0.5);
      mesh.scale.set(settings.thickness / 2, settings.thickness / 2, len);
      mesh.lookAt(_b);
      mesh.material.color.copy(o.material.color);
      used++;
    }
  });
  for (let i = used; i < thickPool.length; i++) thickPool[i].visible = false;
}

function updateDecals() {
  for (const d of decals) {
    const on = d.isOn();
    for (const m of d.mats) {
      if (on && settings.symbolActive === 'dark') m.color.setHex(0x0c0c0c);
      else m.color.setHex(d.hex);
    }
  }
}

// -------------------------------------------------------------------- apply

// Silhouette view: devices flat black against a flat light room, to judge outlines.
const silhouetteDark = new THREE.MeshBasicMaterial({ color: 0x000000 });
const silhouetteLight = new THREE.MeshBasicMaterial({ color: 0xdddddd });
function applySilhouette(on) {
  scene.traverse((o) => {
    if (!o.isMesh || o.userData.decor) return;
    if (on && !o.userData.originalMaterial) {
      o.userData.originalMaterial = o.material;
      o.material = roomMeshes.includes(o) || o === ceiling ? silhouetteLight : silhouetteDark;
    } else if (!on && o.userData.originalMaterial) {
      o.material = o.userData.originalMaterial;
      delete o.userData.originalMaterial;
    }
  });
}
function applySettings() {
  ambient.intensity = settings.ambient;
  hemi.intensity = settings.hemi;
  directional.intensity = settings.dir;
  scene.environment = settings.env ? envTexture : null;
  scene.environmentIntensity = settings.envIntensity;
  renderer.toneMapping = { none: THREE.NoToneMapping, neutral: THREE.NeutralToneMapping, aces: THREE.ACESFilmicToneMapping }[settings.tone];
  const palette = ROOM_PALETTES[settings.roomPalette];
  floorMaterial.color.setHex(palette.floor);
  wallMaterial.color.setHex(palette.wall);
  ceiling.visible = settings.ceiling;
  figure.visible = settings.figure;
  const silhouette = settings.view === 'silhouette';
  applySilhouette(silhouette);
  scene.background = new THREE.Color(silhouette ? 0xdddddd : 0x1a1a1a);
  renderer.domElement.style.filter = { normal: '', silhouette: '', gray: 'grayscale(1)', protan: 'url(#protan)', deutan: 'url(#deutan)', tritan: 'url(#tritan)' }[settings.view];
  document.getElementById('readout').textContent = JSON.stringify(settings, null, 1).replace(/\n\s*/g, ' ');
}

// -------------------------------------------------------------------- panel

const $ = (id) => document.getElementById(id);
function bind(id, { onChange } = {}) {
  const el = $(id);
  const isCheck = el.type === 'checkbox';
  const isRange = el.type === 'range';
  const read = () => (isCheck ? el.checked : isRange ? parseFloat(el.value) : el.value);
  const write = () => { if (isCheck) el.checked = settings[id]; else el.value = settings[id]; };
  write();
  el.addEventListener('change', () => { settings[id] = read(); onChange?.(); applySettings(); el.blur(); });
  el.addEventListener('input', () => { if (isRange) { settings[id] = read(); applySettings(); } });
  return write;
}

const sceneSelect = $('scene');
sceneSelect.innerHTML = ['lineup', 'devices', 'symbols', ...getLevels().map((l) => l.id)].map((s) => `<option>${s}</option>`).join('');
$('roomPalette').innerHTML = Object.keys(ROOM_PALETTES).map((p) => `<option>${p}</option>`).join('');
$('symbolMap').innerHTML = SYMBOL_MAPS.map((m, i) => `<option value="${i}">${m.label}</option>`).join('');
for (const [name, s] of Object.entries(STATIONS)) {
  const b = document.createElement('button');
  b.textContent = name;
  b.addEventListener('click', () => { gotoStation(s); b.blur(); });
  $('stations').appendChild(b);
}

const syncers = [
  bind('scene', { onChange: loadContent }),
  bind('beams', { onChange: rebuildLaser }),
  bind('doorOpen'),
  bind('lighting', { onChange: () => { Object.assign(settings, LIGHTING_PRESETS[settings.lighting]); syncers.forEach((f) => f()); } }),
  bind('ambient'), bind('hemi'), bind('dir'), bind('env'), bind('envIntensity'), bind('beamLight'), bind('tone'),
  bind('thick'), bind('thickness'),
  bind('roomPalette'), bind('ceiling'), bind('figure'), bind('view'),
  bind('symbols', { onChange: rebuildDecals }),
  bind('symbolMap', { onChange: () => { settings.symbolMap = parseInt(settings.symbolMap, 10); rebuildDecals(); } }),
  bind('symbolStyle', { onChange: rebuildDecals }),
  bind('symbolActive'),
  bind('symbolSize', { onChange: rebuildDecals }),
];
$('symbolSize').addEventListener('input', rebuildDecals);
$('solve').addEventListener('click', () => { applySolution(); $('solve').blur(); });
$('copy').addEventListener('click', () => navigator.clipboard?.writeText(JSON.stringify(settings, null, 2)));

function toggle(key, after) { settings[key] = !settings[key]; after?.(); syncers.forEach((f) => f()); applySettings(); }
input.onKeyDown('KeyB', () => toggle('beams', rebuildLaser));
input.onKeyDown('KeyO', () => toggle('doorOpen'));
input.onKeyDown('KeyL', () => {
  settings.lighting = settings.lighting === 'premise' ? 'current' : 'premise';
  Object.assign(settings, LIGHTING_PRESETS[settings.lighting]);
  syncers.forEach((f) => f()); applySettings();
});
input.onKeyDown('KeyV', () => {
  const views = ['normal', 'silhouette', 'gray', 'protan', 'deutan', 'tritan'];
  settings.view = views[(views.indexOf(settings.view) + 1) % views.length];
  syncers.forEach((f) => f()); applySettings();
});
input.onKeyDown('KeyH', () => $('panel').classList.toggle('hidden'));
Object.values(STATIONS).forEach((s, i) => input.onKeyDown(`Digit${i + 1}`, () => gotoStation(s)));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ----------------------------------------------------------------- main loop

const params = new URLSearchParams(location.search);
for (const key of Object.keys(settings)) {
  if (!params.has(key)) continue;
  const raw = params.get(key);
  const current = settings[key];
  settings[key] = typeof current === 'boolean' ? raw === '1' || raw === 'true' : typeof current === 'number' ? parseFloat(raw) : raw;
}
if (params.has('lighting') && LIGHTING_PRESETS[settings.lighting]) {
  for (const [k, v] of Object.entries(LIGHTING_PRESETS[settings.lighting])) if (!params.has(k)) settings[k] = v;
}
if (params.has('station') && STATIONS[params.get('station')]) gotoStation(STATIONS[params.get('station')]);
syncers.forEach((f) => f());
window.__gallery = { settings, gotoStation, applySettings, loadContent, STATIONS, camera, scene, renderer };

const timer = new THREE.Timer();
timer.connect(document);
loadContent();
applySettings();

function animate(timestamp) {
  timer.update(timestamp);
  const dt = timer.getDelta();
  movement.update(dt);
  interaction.update();
  scene.updateMatrixWorld();
  laser?.update();
  for (const door of content?.parts.doors ?? []) door.update(dt);
  if (content?.noLaser) {
    for (const item of content.deco) if (item.kind === 'receiver' && item.obj.mesh.material.emissive) item.obj.mesh.material.emissiveIntensity = settings.beams ? 1.2 : 0.15; // mirrors receiver.js's constants
  }
  // Neutral stand-ins for the switch's hardcoded hues (design decision: non-laser devices stay neutral).
  for (const sw of content?.parts.switches ?? []) sw.button.material.emissive?.setHex(sw.isActive() ? 0xd8d4c8 : 0x2a2a28);
  // Neutral stand-ins for the portal pair's hardcoded blue/orange.
  for (const p of content?.portals ?? []) p.mesh.material.emissive?.setHex(0x8a8a84);
  syncBeams();
  updateDecals();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
