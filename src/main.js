import * as THREE from 'three';
import { createRenderer } from './core/renderer.js';
import { createScene } from './core/scene.js';
import { createCamera } from './core/camera.js';
import { createInput } from './core/input.js';
import { createMovementController } from './core/movement.js';
import { createInteraction } from './core/interaction.js';

const renderer = createRenderer();
const { scene, colliders } = createScene();
const camera = createCamera();

const keys = createInput(camera, renderer.domElement);
const movement = createMovementController(camera, keys, colliders);

// Populated by later systems (mirrors, emitters) as they're added to the scene.
const interactiveObjects = [];
const interaction = createInteraction(camera, scene, interactiveObjects);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  const deltaSeconds = clock.getDelta();
  movement.update(deltaSeconds);
  interaction.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
