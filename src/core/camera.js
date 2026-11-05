import * as THREE from 'three';

const FOV_DEGREES = 70;
const FOV_MIN = 55;
const FOV_MAX = 100;
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

// Spec §13 II: "ajuste de campo de visão". Returns the new FOV in degrees.
export function adjustFov(camera, deltaDegrees) {
  camera.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, camera.fov + deltaDegrees));
  camera.updateProjectionMatrix();
  return camera.fov;
}
