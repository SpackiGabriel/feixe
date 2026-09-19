import * as THREE from 'three';

const FOV_DEGREES = 70;
const NEAR = 0.1;
const FAR = 100;
const EYE_HEIGHT = 1.6;

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    FOV_DEGREES,
    window.innerWidth / window.innerHeight,
    NEAR,
    FAR
  );
  camera.position.set(0, EYE_HEIGHT, 4);
  return camera;
}
