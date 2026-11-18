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
import { loadReachedLevelIndex, getLevels } from './levels/level-manager.js';
import { connectSfx, sfx, isMuted, setMuted } from './presentation/sfx.js';
import { createCameraFx } from './presentation/camera-fx.js';
import { setEnvMap } from './presentation/env-map.js';
import { setMirrorReflections, setReflectionQuality, loadReflectionsOn, saveReflectionsOn, showReflections } from './presentation/mirror-reflection.js';
import { loadQuality, saveQuality, pixelRatioFor } from './presentation/quality.js';
import { toggleShadingMode } from './presentation/phong-material.js';
import { createHud, manipulationHint } from './ui/hud.js';
import { createMenu } from './ui/menu.js';
import { createTransitions } from './ui/transitions.js';
import { installDebugTools } from './debug.js';

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

// Construction runs top to bottom. Two things are read from the level
// runtime before it exists, both lazily and only from the frame loop
// (which starts at the end of this file): aim occluders and movement
// colliders. The menu's callbacks and the runtime's onExit/onGameComplete
// only fire after boot, so they may use anything defined in this file.
const interactiveObjects = [];
const interaction = createInteraction(camera, scene, interactiveObjects, () => levelRuntime.getOccluders());
const manipulation = createManipulation({ input, look, interaction, camera });
const movement = createMovementController(camera, input.keys, colliders, () => levelRuntime.getColliders(), sfx.footstep);

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

// The level title waits until the player is actually playing (not behind
// the start menu).
let pendingIntro = null;
let hasPlayed = false;
events.on('level:enter', ({ index, count, data }) => {
  if (!hasPlayed) pendingIntro = [index, count, data.name];
  else transitions.showIntro(index, count, data.name);
});

// Loads the saved level on creation: onLevelLoaded and 'level:enter' fire
// right away, so everything they touch must already exist above.
const levelRuntime = createLevelRuntime({
  scene,
  wallSegments,
  interactiveObjects,
  roomOccluders: occluders,
  onLevelLoaded: ({ index, count, data, level }) => {
    manipulation.exit();
    movement.stop();
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

function levelLabel() {
  const index = levelRuntime.getCurrentIndex();
  const data = getLevels()[index];
  return `NÍVEL ${String(index + 1).padStart(2, '0')} · ${data.name}`;
}

const menu = createMenu(uiRoot, {
  getState: () => ({
    hasProgress: levelRuntime.getCurrentIndex() > 0,
    levelLabel: levelLabel(),
    currentIndex: levelRuntime.getCurrentIndex(),
    reachedIndex: loadReachedLevelIndex(getLevels().length),
    levelName: (index) => getLevels()[index].name,
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
  onSelectLevel: (index) => {
    transitions.blink(() => levelRuntime.loadLevel(index));
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
    movement.stop();
  }
  hud.setVisible(input.isLocked() || debugMode);
});

// `?debug`: window.__feixe, the F3 readout (with the by-hand projection),
// the T wall-order demo and `&level=N` (src/debug.js).
const debugTools = debugMode
  ? installDebugTools({ params, levelRuntime, camera, scene, renderer, hud, menu, transitions, look, interaction, events, cameraFx, input })
  : null;

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
  hud.setDebugText(debugTools?.text() ?? null);
  transitions.update(deltaSeconds);

  cameraFx.apply(deltaSeconds);
  renderer.render(scene, camera);
  cameraFx.restore();
}
renderer.setAnimationLoop(animate);
