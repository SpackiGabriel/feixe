import { createRenderer } from './core/renderer.js';
import { createScene } from './core/scene.js';
import { createCamera } from './core/camera.js';

const renderer = createRenderer();
const scene = createScene();
const camera = createCamera();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
