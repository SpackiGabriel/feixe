import * as THREE from 'three';
import { createMirror } from '../gameplay/mirror.js';
import { createEmitter } from '../gameplay/emitter.js';
import { createReceiver } from '../gameplay/receiver.js';
import { createDoor } from '../gameplay/door.js';

// TEMPORARY placeholder rig for manually verifying the mirror/emitter/laser/
// receiver/door systems while there's no level loader yet (RF08/RF09,
// build order item 6 — "Level system"). Delete this once real declarative
// level data replaces it; nothing here is meant to ship as an actual level.
const BEAM_HEIGHT = 1.2;
const ROOM_HALF = 5; // must match src/core/scene.js's ROOM_SIZE / 2

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

  // Emitter fires -Z into the 45-degree mirror, which redirects the beam
  // +X toward the right wall (x = ROOM_HALF). The receiver sits slightly
  // in front of that wall so it's unambiguously the nearest segment along
  // the beam's path (docs/findings.md: a receiver behind other geometry
  // never activates).
  const receiver = createReceiver({
    position: new THREE.Vector3(ROOM_HALF - 0.1, BEAM_HEIGHT, 0),
    rotationY: Math.PI / 2,
    colorName: 'red',
  });
  scene.add(receiver.mesh);

  const door = createDoor({
    position: new THREE.Vector3(0, 1.5, -(ROOM_HALF - 0.1)),
    rotationY: Math.PI,
    rule: 'AND',
    receivers: [receiver],
  });
  scene.add(door.mesh);

  return { mirrors: [mirror], emitters: [emitter], receivers: [receiver], doors: [door] };
}
