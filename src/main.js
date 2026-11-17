import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/three/addons/RoomEnvironment.js';
import { createRenderer } from './core/renderer.js';
import { createScene } from './core/scene.js';
import { createCamera, clampFov } from './core/camera.js';
import { createInput, lockPointer } from './core/input.js';
import { createLookController, loadSensitivity, saveSensitivity, stepSensitivity } from './core/look.js';
import { createMovementController } from './core/movement.js';
import { createInteraction } from './core/interaction.js';
import { createManipulation } from './core/manipulation.js';
import { events } from './core/events.js';
import { createLevelRuntime } from './levels/level-runtime.js';
import { loadSavedLevelIndex, getLevels } from './levels/level-manager.js';
import { connectSfx, sfx, isMuted, setMuted } from './presentation/sfx.js';
import { createCameraFx } from './presentation/camera-fx.js';
import { setEnvMap } from './presentation/env-map.js';
import { setMirrorReflections, setReflectionQuality, loadReflectionsOn, saveReflectionsOn, showReflections } from './presentation/mirror-reflection.js';
import { loadQuality, saveQuality, pixelRatioFor } from './presentation/quality.js';
import { toggleShadingMode, setShadingMode, getShadingMode, getPhongMaterials } from './presentation/phong-material.js';
import { perspective, viewMatrix, projectPoint } from './core/matrix.js';
import { createHud, manipulationHint } from './ui/hud.js';
import { createMenu } from './ui/menu.js';
import { createTransitions } from './ui/transitions.js';

const FOV_STEP_DEGREES = 5;
const ENDING_WHITEOUT_SECONDS = 1.1;
const ENDING_FADE_MS = 1500;
const MAX_FRAME_DELTA = 0.1;

const params = new URLSearchParams(location.search);
const debugMode = params.has('debug');
let quality = loadQuality();

const currentPixelRatio = () => pixelRatioFor(quality, window.devicePixelRatio, window.innerWidth, window.innerHeight);
const renderer = createRenderer(currentPixelRatio());
const { scene, colliders, wallSegments, occluders, setAtmosphere } = createScene();
const camera = createCamera();
const cameraFx = createCameraFx(camera);

// Reflection map for metal (high quality only), built the first time it's
// needed and kept. Must be set before a level is instantiated, since
// materials read it then: switching quality applies from the next chamber.
let metalEnvMap = null;
function applyEnvMapForQuality() {
  if (quality === 'high' && !metalEnvMap) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    metalEnvMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  setEnvMap(quality === 'high' ? metalEnvMap : null);
}
applyEnvMapForQuality();
// Real mirror reflections: every mirror gets them; the menu's "Reflexos"
// shows or hides them instantly.
setMirrorReflections(true);
setReflectionQuality(quality);
let reflectionsOn = loadReflectionsOn();
showReflections(camera, reflectionsOn);

const input = createInput(renderer.domElement);
const look = createLookController(camera);
let sensitivity = loadSensitivity();
look.setSensitivity(sensitivity);
input.onMouseMove(look.handleMouseMove);

const interactiveObjects = [];
// Occluders come from the level runtime, created below (read lazily each frame).
const interaction = createInteraction(camera, scene, interactiveObjects, () => levelRuntime.getOccluders());
const manipulation = createManipulation({ input, look, interaction, camera });

const uiRoot = document.createElement('div');
uiRoot.className = 'ui';
document.body.appendChild(uiRoot);
const hud = createHud(uiRoot);
const transitions = createTransitions(uiRoot);

connectSfx(events);

function requestLock() {
  const result = lockPointer(renderer.domElement);
  // Browsers refuse a re-lock right after Esc; say so instead of failing silently.
  result?.catch?.(() => menu.setHint('CLIQUE NA TELA PARA CONTINUAR'));
}

function levelLabel() {
  const index = levelRuntime ? levelRuntime.getCurrentIndex() : loadSavedLevelIndex(getLevels().length);
  const data = getLevels()[index];
  return `NÍVEL ${String(index + 1).padStart(2, '0')} · ${data.name}`;
}

const menu = createMenu(uiRoot, {
  getState: () => ({
    hasProgress: (levelRuntime?.getCurrentIndex() ?? 0) > 0,
    levelLabel: levelLabel(),
    quality,
    muted: isMuted(),
    sensitivity,
    reflectionsOn,
  }),
  onResume: requestLock,
  onNewGame: () => {
    transitions.blink(() => levelRuntime.startNewGame());
    requestLock();
  },
  onRestart: () => {
    transitions.blink(() => levelRuntime.restart());
    requestLock();
  },
  onToggleQuality: () => {
    quality = quality === 'high' ? 'low' : 'high';
    saveQuality(quality);
    renderer.setPixelRatio(currentPixelRatio());
    setReflectionQuality(quality, scene);
    applyEnvMapForQuality(); // started on low and switched up: build it now
    hud.showToast(quality === 'high' ? 'Qualidade alta · brilho metálico na próxima câmara' : 'Qualidade baixa');
  },
  onToggleSound: () => setMuted(!isMuted()),
  onToggleReflections: () => {
    reflectionsOn = !reflectionsOn;
    showReflections(camera, reflectionsOn);
    saveReflectionsOn(reflectionsOn);
  },
  // Enter/click steps up and wraps to the lowest; ← → step either way.
  onAdjustSensitivity: (direction) => {
    const next = stepSensitivity(sensitivity, direction);
    sensitivity = direction > 0 && next === sensitivity ? stepSensitivity(sensitivity, -Infinity) : next;
    look.setSensitivity(sensitivity);
    saveSensitivity(sensitivity);
  },
});

// The level title waits until the player is actually playing (not behind
// the start menu).
let pendingIntro = null;
let hasPlayed = false;
events.on('level:enter', ({ index, count, data }) => {
  if (!hasPlayed) pendingIntro = [index, count, data.name];
  else transitions.showIntro(index, count, data.name);
});
let movement = null;

// Created before movement so its getColliders() can be passed in directly —
// level-runtime.js doesn't depend on movement/camera, so this order is safe.
const levelRuntime = createLevelRuntime({
  scene,
  wallSegments,
  interactiveObjects,
  roomOccluders: occluders,
  onLevelLoaded: ({ index, count, data, level }) => {
    manipulation.exit();
    movement?.stop();
    cameraFx.clearDoors();
    camera.position.x = level.spawn.x;
    camera.position.z = level.spawn.z;
    look.setOrientation(level.spawn.yaw);
    setAtmosphere(index, count);
    hud.setLevel(index, count, data.name);
  },
  // Walking into an open exit: shutter closes, next chamber loads behind
  // it, shutter opens. The last exit fades to white into the ending.
  onExit: (next) => {
    if (next.complete) transitions.whiteout(ENDING_WHITEOUT_SECONDS, () => levelRuntime.advance());
    else transitions.cut(() => levelRuntime.advance());
  },
  onGameComplete: (stats) => {
    manipulation.exit();
    document.exitPointerLock();
    menu.showEnding({ ...stats, levels: levelRuntime.getLevelCount() }, () => {
      transitions.clearWhiteout();
      levelRuntime.startNewGame();
      requestLock();
    });
    setTimeout(() => transitions.clearWhiteout(), ENDING_FADE_MS);
  },
});

events.on('door:moving', ({ door }) => cameraFx.doorMoving(door));
events.on('door:settled', ({ door, opening }) => cameraFx.doorSettled(door, opening));
events.on('portal:player', () => transitions.flash());
events.on('grab', () => cameraFx.setGrabbing(true));
events.on('release', () => cameraFx.setGrabbing(false));

input.onKeyDown('KeyR', () => { // RF09: quick restart of the current level
  if (!levelRuntime.isComplete() && !levelRuntime.isExiting()) transitions.blink(() => levelRuntime.restart());
});
const fovStep = (delta) => () => {
  cameraFx.setBaseFov(clampFov(cameraFx.getBaseFov() + delta));
  hud.showToast(`Campo de visão ${cameraFx.getBaseFov()}°`);
};
for (const code of ['Equal', 'NumpadAdd']) input.onKeyDown(code, fovStep(FOV_STEP_DEGREES));
for (const code of ['Minus', 'NumpadSubtract']) input.onKeyDown(code, fovStep(-FOV_STEP_DEGREES));
// Enunciado §3 III: per-vertex (Gouraud) vs per-fragment (Phong) shading
// of our Blinn-Phong walls and floor, switched live.
input.onKeyDown('KeyL', () => {
  const mode = toggleShadingMode();
  hud.showToast(mode === 'vertex' ? 'Sombreamento por vértice (Gouraud)' : 'Sombreamento por fragmento (Phong)');
});
input.onKeyDown('KeyM', () => {
  setMuted(!isMuted());
  hud.showToast(isMuted() ? 'Som desligado' : 'Som ligado');
});

// Pointer lock is the play state: locked = playing, unlocked = paused.
document.addEventListener('pointerlockchange', () => {
  if (input.isLocked()) {
    menu.hide();
    cameraFx.setDrift(false);
    hasPlayed = true;
    if (pendingIntro) {
      transitions.showIntro(...pendingIntro);
      pendingIntro = null;
    }
  } else if (!menu.isEndingVisible()) {
    menu.show('paused');
    movement?.stop();
  }
  hud.setVisible(input.isLocked() || debugMode);
});

// Dev/level-authoring aid: `?debug` exposes the runtime on window.__feixe,
// shows a live readout (F3 toggles it), lets the player move without
// pointer lock, and `?debug&level=N` jumps straight to level N (1-based).
let debugVisible = debugMode;
let wallOrder = 'TRS'; // debug demo state; a (re)loaded level builds its walls in T·R·S
events.on('level:enter', () => { wallOrder = 'TRS'; });
if (debugMode) {
  window.__feixe = {
    levelRuntime, camera, scene, renderer, hud, menu, transitions, look, interaction, events,
    cameraFx, // FOV from the console: cameraFx.setBaseFov(100) (it rewrites camera.fov every frame)
    wallOrder: (order) => {
      wallOrder = order === 'TSR' ? 'TSR' : 'TRS';
      const walls = levelRuntime.getCurrentLevel().walls;
      let anyChanged = false;
      for (const wall of walls) if (wall.setOrder(wallOrder)) anyChanged = true;
      const label = wallOrder === 'TSR' ? 'T·S·R (ordem errada)' : 'T·R·S (ordem certa)';
      if (walls.length === 0) return `${label} — sem paredes internas neste nível (use L2 ou L6)`;
      if (!anyChanged) return `${label} — aqui R = I, nada muda (use L2 ou L6)`;
      return label;
    },
    phong: { materials: getPhongMaterials, setShadingMode, getShadingMode },
  };
  const jumpTo = parseInt(params.get('level'), 10);
  if (Number.isInteger(jumpTo)) levelRuntime.loadLevel(jumpTo - 1);
  input.onKeyDown('F3', () => { debugVisible = !debugVisible; });
  // Defence demo (enunciado §3 I): interior walls composed in the wrong
  // order, T·S·R, and back to T·R·S. Visual only; R restarts the level.
  input.onKeyDown('KeyT', () => hud.showToast(`Paredes: ${window.__feixe.wallOrder(wallOrder === 'TRS' ? 'TSR' : 'TRS')}`));
}

// Enunciado §3 II: the aimed object's centre projected by hand
// (core/matrix.js: P · V · p, then divide by w) next to Three's own
// Vector3.project, so the defence can show they agree and what w is.
const _aimedPosition = new THREE.Vector3();
const _projected = new THREE.Vector3();
const _eye = [0, 0, 0];
const _target = [0, 0, 0];
const fmt3 = (v) => v.toFixed(3);
function projectionLines(object) {
  object.getWorldPosition(_aimedPosition);
  camera.updateMatrixWorld();
  _eye[0] = camera.position.x;
  _eye[1] = camera.position.y;
  _eye[2] = camera.position.z;
  _target[0] = _aimedPosition.x;
  _target[1] = _aimedPosition.y;
  _target[2] = _aimedPosition.z;
  const projection = perspective(camera.fov, camera.aspect, camera.near, camera.far);
  const view = viewMatrix(_eye, camera.rotation.x, camera.rotation.y, camera.rotation.z);
  const { w, ndc } = projectPoint(projection, view, _target);
  const three = _projected.copy(_aimedPosition).project(camera);
  return [
    `à mão: w=${w.toFixed(2)}  ndc=(${fmt3(ndc[0])}, ${fmt3(ndc[1])}, ${fmt3(ndc[2])})`,
    `Three: ndc=(${fmt3(three.x)}, ${fmt3(three.y)}, ${fmt3(three.z)})`,
  ];
}

function debugText() {
  const level = levelRuntime.getCurrentLevel();
  const yaw = ((camera.rotation.y * 180) / Math.PI).toFixed(1);
  const lines = [
    `nível ${levelRuntime.getCurrentIndex() + 1}  [F3 oculta]`,
    `jogador x=${camera.position.x.toFixed(2)} z=${camera.position.z.toFixed(2)} yaw=${yaw}°`,
    `mira: ${interaction.getHovered()?.userData.debugInfo?.() ?? '-'}`,
  ];
  const aimed = interaction.getHovered();
  if (aimed) lines.push(...projectionLines(aimed));
  for (const r of level.receivers) lines.push(`receptor ${r.levelId} (${r.colorName}): ${r.isActive() ? 'ATIVO' : 'inativo'}`);
  for (const b of level.blockers) if (b.trap) lines.push(`armadilha: ${b.isHit() ? 'ATINGIDA' : 'livre'}`);
  for (const d of level.doors) lines.push(`porta ${d.levelId}: ${d.isOpen() ? 'destravada' : 'travada'} · ${Math.round(d.getOpenness() * 100)}%`);
  return lines.join('\n');
}

movement = createMovementController(camera, input.keys, colliders, levelRuntime.getColliders, sfx.footstep);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(currentPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start on the menu, over the live first chamber, gently drifting.
menu.show('start');
cameraFx.setDrift(!debugMode);
hud.setVisible(debugMode);
document.getElementById('boot')?.remove();

const timer = new THREE.Timer();
timer.connect(document); // avoids a huge delta on refocus after a hidden tab
let lastHovered = null;

function animate(timestamp) {
  timer.update(timestamp);
  const deltaSeconds = Math.min(timer.getDelta(), MAX_FRAME_DELTA);
  // ?debug walks without pointer lock (for e2e and the defence), but not
  // while the menu is open: W/S also move its cursor.
  if (input.isLocked() || (debugMode && !menu.isVisible())) movement.update(deltaSeconds);
  interaction.update();
  levelRuntime.update(deltaSeconds, camera);

  const hovered = interaction.getHovered();
  if (hovered && hovered !== lastHovered && !manipulation.isActive()) sfx.hover();
  lastHovered = hovered;
  const active = manipulation.getActive();
  hud.update(deltaSeconds, {
    hovered,
    active,
    activeObject: active ? manipulation.getActiveObject() : null,
    camera,
    prompt: active ? manipulationHint(active) : hovered?.userData.prompt ?? null,
  });
  hud.setDebugText(debugVisible ? debugText() : null);
  transitions.update(deltaSeconds);

  cameraFx.apply(deltaSeconds);
  renderer.render(scene, camera);
  cameraFx.restore();
}
renderer.setAnimationLoop(animate);
