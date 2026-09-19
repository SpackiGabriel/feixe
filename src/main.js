import * as THREE from 'three';
import { createRenderer } from './core/renderer.js';
import { createScene } from './core/scene.js';
import { createCamera } from './core/camera.js';
import { createInput } from './core/input.js';
import { createLookController } from './core/look.js';
import { createMovementController } from './core/movement.js';
import { createInteraction } from './core/interaction.js';
import { createManipulation } from './core/manipulation.js';
import { createLevelRuntime } from './levels/level-runtime.js';

const renderer = createRenderer();
const { scene, colliders, wallSegments } = createScene();
const camera = createCamera();

const input = createInput(renderer.domElement);
const look = createLookController(camera);
input.onMouseMove(look.handleMouseMove);
const movement = createMovementController(camera, input.keys, colliders);

const interactiveObjects = [];
const interaction = createInteraction(camera, scene, interactiveObjects);
createManipulation({ input, look, interaction });

const levelRuntime = createLevelRuntime({ scene, wallSegments, interactiveObjects });
input.onKeyDown('KeyR', () => levelRuntime.restart()); // RF09: quick restart of the current level

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const timer = new THREE.Timer();
timer.connect(document); // avoids a huge delta on refocus after a hidden tab

function animate(timestamp) {
  timer.update(timestamp);
  const deltaSeconds = timer.getDelta();
  movement.update(deltaSeconds);
  interaction.update();
  levelRuntime.update(deltaSeconds);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
