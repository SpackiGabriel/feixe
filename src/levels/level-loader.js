import * as THREE from 'three';
import { createMirror } from '../gameplay/mirror.js';
import { createEmitter } from '../gameplay/emitter.js';
import { createReceiver } from '../gameplay/receiver.js';
import { createDoor } from '../gameplay/door.js';

// The "construtor de cena comum" from spec §10: interprets a level's
// declarative data into the scene graph, reusing the same small set of
// gameplay-object factories for every level instead of hand-building each
// one — this is the whole point of RF08.
export function instantiateLevel(data, scene, interactiveObjects) {
  const mirrors = data.mirrors.map((m) => {
    const mirror = createMirror({
      railStart: new THREE.Vector3(...m.rail.start),
      railEnd: new THREE.Vector3(...m.rail.end),
      initialT: m.initialT,
      initialRotationY: m.initialRotationY,
      positionEnabled: m.positionEnabled,
      rotationEnabled: m.rotationEnabled,
      rotationStepDegrees: m.rotationStepDegrees ?? null,
    });
    scene.add(mirror.base);
    interactiveObjects.push(mirror.plate);
    return mirror;
  });

  const emitters = data.emitters.map((e) => {
    const emitter = createEmitter({
      position: new THREE.Vector3(...e.position),
      colorName: e.colorName,
      initialRotationY: e.initialRotationY ?? 0,
    });
    scene.add(emitter.mesh);
    interactiveObjects.push(emitter.mesh);
    return emitter;
  });

  const receivers = data.receivers.map((r) => {
    const receiver = createReceiver({
      position: new THREE.Vector3(...r.position),
      rotationY: r.rotationY ?? 0,
      colorName: r.colorName,
    });
    scene.add(receiver.mesh);
    return receiver;
  });
  const receiversById = new Map(data.receivers.map((r, i) => [r.id, receivers[i]]));

  const doors = data.doors.map((d) => {
    const doorReceivers = d.receiverIds.map((id) => {
      const receiver = receiversById.get(id);
      if (!receiver) throw new Error(`Level "${data.id}": door "${d.id}" references unknown receiver "${id}"`);
      return receiver;
    });
    const door = createDoor({
      position: new THREE.Vector3(...d.position),
      rotationY: d.rotationY ?? 0,
      rule: d.rule,
      receivers: doorReceivers,
    });
    scene.add(door.mesh);
    return door;
  });

  return { mirrors, emitters, receivers, doors };
}

// Reverses instantiateLevel(): removes every object it added to the scene
// and interactiveObjects, and frees their GPU resources. Needed for
// restart/level-change (RF09) — nothing else owns these objects.
export function disposeLevel(loaded, scene, interactiveObjects) {
  function removeInteractive(object) {
    const index = interactiveObjects.indexOf(object);
    if (index !== -1) interactiveObjects.splice(index, 1);
  }

  for (const mirror of loaded.mirrors) {
    scene.remove(mirror.base);
    removeInteractive(mirror.plate);
    mirror.plate.geometry.dispose();
    mirror.plate.material.dispose();
  }
  for (const emitter of loaded.emitters) {
    scene.remove(emitter.mesh);
    removeInteractive(emitter.mesh);
    emitter.mesh.geometry.dispose();
    emitter.mesh.material.dispose();
  }
  for (const receiver of loaded.receivers) {
    scene.remove(receiver.mesh);
    receiver.mesh.geometry.dispose();
    receiver.mesh.material.dispose();
  }
  for (const door of loaded.doors) {
    scene.remove(door.mesh);
    door.mesh.geometry.dispose();
    door.mesh.material.dispose();
  }
}
