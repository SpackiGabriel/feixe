import * as THREE from 'three';
import { createRenderer } from './core/renderer.js';
import { createScene } from './core/scene.js';
import { createCamera } from './core/camera.js';
import { createInput } from './core/input.js';
import { createLookController } from './core/look.js';
import { createMovementController } from './core/movement.js';
import { createInteraction } from './core/interaction.js';
import { createManipulation } from './core/manipulation.js';
import { createLaserSystem } from './gameplay/laser-system.js';
import { createDemoLevel } from './levels/demo.js';

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

// TEMPORARY until the level loader (RF08/RF09) exists — see src/levels/demo.js.
const { mirrors, emitters } = createDemoLevel(scene, interactiveObjects);
const laserSystem = createLaserSystem({ scene, wallSegments, mirrors, emitters });

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
  laserSystem.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
