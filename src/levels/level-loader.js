import * as THREE from 'three';
import { createMirror } from '../gameplay/mirror.js';
import { createEmitter } from '../gameplay/emitter.js';
import { createReceiver } from '../gameplay/receiver.js';
import { createSwitch } from '../gameplay/switch.js';
import { createFilter } from '../gameplay/filter.js';
import { createBlocker } from '../gameplay/blocker.js';
import { createPortalPair } from '../gameplay/portal.js';
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

  const switches = (data.switches ?? []).map((s) => {
    const sw = createSwitch({
      position: new THREE.Vector3(...s.position),
      rotationY: s.rotationY ?? 0,
    });
    scene.add(sw.mesh);
    interactiveObjects.push(sw.button);
    return sw;
  });
  const switchesById = new Map((data.switches ?? []).map((s, i) => [s.id, switches[i]]));

  const filters = (data.filters ?? []).map((f) => {
    const filter = createFilter({
      railStart: new THREE.Vector3(...f.rail.start),
      railEnd: new THREE.Vector3(...f.rail.end),
      initialT: f.initialT,
      rotationY: f.rotationY ?? 0,
      primaryName: f.primaryName,
    });
    scene.add(filter.base);
    interactiveObjects.push(filter.plate);
    return filter;
  });

  const blockers = (data.blockers ?? []).map((b) => {
    const blocker = createBlocker({
      position: new THREE.Vector3(...b.position),
      rotationY: b.rotationY ?? 0,
      width: b.width,
      height: b.height,
      thickness: b.thickness,
    });
    scene.add(blocker.mesh);
    return blocker;
  });

  // Both ends of a pair are flattened into one list — laser-system.js and
  // the player-crossing check (portal-crossing.js, driven from
  // level-runtime.js) just need every portal in the level, not the pairing
  // structure (each portal already carries a `linked` reference).
  const portals = (data.portals ?? []).flatMap((p) => {
    const [portalA, portalB] = createPortalPair(p);
    scene.add(portalA.mesh);
    scene.add(portalB.mesh);
    return [portalA, portalB];
  });

  // A door doesn't care whether it's watching a receiver or a switch — both
  // expose isActive() (spec §11: level 1's switch reuses RF07 door logic
  // as-is, no laser/color involved).
  let exitDoor = null;
  const doors = data.doors.map((d) => {
    const doorReceivers = d.receiverIds.map((id) => {
      const activatable = receiversById.get(id) ?? switchesById.get(id);
      if (!activatable) throw new Error(`Level "${data.id}": door "${d.id}" references unknown receiver/switch "${id}"`);
      return activatable;
    });
    const door = createDoor({
      position: new THREE.Vector3(...d.position),
      rotationY: d.rotationY ?? 0,
      rule: d.rule,
      receivers: doorReceivers,
    });
    scene.add(door.mesh);
    if (d.exit) exitDoor = door;
    return door;
  });

  return { mirrors, emitters, receivers, switches, filters, blockers, portals, doors, exitDoor };
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
  for (const sw of loaded.switches) {
    scene.remove(sw.mesh);
    removeInteractive(sw.button);
    sw.base.geometry.dispose();
    sw.base.material.dispose();
    sw.button.geometry.dispose();
    sw.button.material.dispose();
  }
  for (const filter of loaded.filters) {
    scene.remove(filter.base);
    removeInteractive(filter.plate);
    filter.plate.geometry.dispose();
    filter.plate.material.dispose();
  }
  for (const blocker of loaded.blockers) {
    scene.remove(blocker.mesh);
    blocker.mesh.geometry.dispose();
    blocker.mesh.material.dispose();
  }
  for (const portal of loaded.portals) {
    scene.remove(portal.mesh);
    portal.mesh.geometry.dispose();
    portal.mesh.material.dispose();
  }
  for (const door of loaded.doors) {
    scene.remove(door.mesh);
    door.mesh.geometry.dispose();
    door.mesh.material.dispose();
  }
}
