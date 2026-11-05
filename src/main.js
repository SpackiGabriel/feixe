import * as THREE from 'three';
import { createRenderer } from './core/renderer.js';
import { createScene } from './core/scene.js';
import { createCamera, adjustFov } from './core/camera.js';
import { createInput } from './core/input.js';
import { createLookController } from './core/look.js';
import { createMovementController } from './core/movement.js';
import { createInteraction } from './core/interaction.js';
import { createManipulation } from './core/manipulation.js';
import { createLevelRuntime } from './levels/level-runtime.js';
import { createHud, manipulationHint } from './ui/hud.js';

const params = new URLSearchParams(location.search);
const debugMode = params.has('debug');

const renderer = createRenderer();
const { scene, colliders, wallSegments, occluders } = createScene();
const camera = createCamera();

const input = createInput(renderer.domElement);
const look = createLookController(camera);
input.onMouseMove(look.handleMouseMove);

const interactiveObjects = [];
// Occluders come from the level runtime, created below (read lazily each frame).
const interaction = createInteraction(camera, scene, interactiveObjects, () => levelRuntime.getOccluders());
const manipulation = createManipulation({ input, look, interaction });

const hud = createHud({
  onPlay: () => renderer.domElement.requestPointerLock(),
  onNewGame: () => {
    levelRuntime.startNewGame();
    hud.resetToStart();
    renderer.domElement.requestPointerLock();
  },
});

// Created before movement so its getColliders() can be passed in directly —
// level-runtime.js doesn't depend on movement/camera, so this order is safe.
const levelRuntime = createLevelRuntime({
  scene,
  wallSegments,
  interactiveObjects,
  roomOccluders: occluders,
  onLevelLoaded: ({ index, count, data, level }) => {
    manipulation.exit();
    camera.position.x = level.spawn.x;
    camera.position.z = level.spawn.z;
    look.setOrientation(level.spawn.yaw);
    hud.showLevel(index, count, data.name);
  },
  onGameComplete: () => {
    manipulation.exit();
    hud.showComplete();
    document.exitPointerLock();
  },
});

input.onKeyDown('KeyR', () => { // RF09: quick restart of the current level
  if (!levelRuntime.isComplete()) levelRuntime.restart();
});
const fovStep = (delta) => () => hud.showToast(`Campo de visão: ${adjustFov(camera, delta)}°`);
for (const code of ['Equal', 'NumpadAdd']) input.onKeyDown(code, fovStep(5));
for (const code of ['Minus', 'NumpadSubtract']) input.onKeyDown(code, fovStep(-5));

document.addEventListener('pointerlockchange', () => hud.setPlaying(input.isLocked()));

// Dev/level-authoring aid: `?debug` exposes the runtime on window.__feixe,
// shows a live readout (F3 toggles it), lets the player move without
// pointer lock, and `?debug&level=N` jumps straight to level N (1-based).
let debugVisible = debugMode;
if (debugMode) {
  window.__feixe = { levelRuntime, camera, scene, hud, look, interaction };
  const jumpTo = parseInt(params.get('level'), 10);
  if (Number.isInteger(jumpTo)) levelRuntime.loadLevel(jumpTo - 1);
  input.onKeyDown('F3', () => { debugVisible = !debugVisible; });
}

function debugText() {
  const level = levelRuntime.getCurrentLevel();
  const yaw = ((camera.rotation.y * 180) / Math.PI).toFixed(1);
  const lines = [
    `nível ${levelRuntime.getCurrentIndex() + 1}  [F3 oculta]`,
    `jogador x=${camera.position.x.toFixed(2)} z=${camera.position.z.toFixed(2)} yaw=${yaw}°`,
    `mira: ${interaction.getHovered()?.userData.debugInfo?.() ?? '-'}`,
  ];
  for (const r of level.receivers) lines.push(`receptor ${r.levelId} (${r.colorName}): ${r.isActive() ? 'ATIVO' : 'inativo'}`);
  for (const b of level.blockers) if (b.trap) lines.push(`armadilha: ${b.isHit() ? 'ATINGIDA' : 'livre'}`);
  for (const d of level.doors) lines.push(`porta ${d.levelId}: ${d.isOpen() ? 'aberta' : 'fechada'}`);
  return lines.join('\n');
}

const movement = createMovementController(camera, input.keys, colliders, levelRuntime.getColliders);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const timer = new THREE.Timer();
timer.connect(document); // avoids a huge delta on refocus after a hidden tab

function animate(timestamp) {
  timer.update(timestamp);
  const deltaSeconds = Math.min(timer.getDelta(), 0.1);
  if (input.isLocked() || debugMode) movement.update(deltaSeconds);
  interaction.update();
  levelRuntime.update(deltaSeconds, camera);

  const active = manipulation.getActive();
  hud.setPrompt(active ? manipulationHint(active) : interaction.getHovered()?.userData.prompt ?? null);
  hud.setDebugText(debugVisible ? debugText() : null);
  hud.update(deltaSeconds);

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
