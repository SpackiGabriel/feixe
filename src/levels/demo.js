import * as THREE from 'three';
import { createMirror } from '../gameplay/mirror.js';
import { createEmitter } from '../gameplay/emitter.js';

// TEMPORARY placeholder rig for manually verifying the mirror/emitter/laser
// systems while there's no level loader yet (RF08/RF09, build order item
// 6 — "Level system"). Delete this once real declarative level data
// replaces it; nothing here is meant to ship as an actual level.
const BEAM_HEIGHT = 1.2;

export function createDemoLevel(scene, interactiveObjects) {
  const mirror = createMirror({
    railStart: new THREE.Vector3(0, BEAM_HEIGHT, 0),
    railEnd: new THREE.Vector3(0, BEAM_HEIGHT, 0),
    initialRotationY: Math.PI / 4,
    rotationEnabled: true,
  });
  scene.add(mirror.base);
  interactiveObjects.push(mirror.plate);

  const emitter = createEmitter({
    position: new THREE.Vector3(0, BEAM_HEIGHT, 4),
    colorName: 'red',
  });
  scene.add(emitter.mesh);
  interactiveObjects.push(emitter.mesh);

  return { mirrors: [mirror], emitters: [emitter] };
}
