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
  // Every scene object goes through addToScene() so disposeLevel() can free
  // it without a per-type list — a new gameplay object type only needs to
  // use this helper to be cleaned up on restart/level change.
  const roots = [];
  function addToScene(object) {
    scene.add(object);
    roots.push(object);
  }

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
    addToScene(mirror.base);
    interactiveObjects.push(mirror.plate);
    return mirror;
  });

  const emitters = data.emitters.map((e) => {
    const emitter = createEmitter({
      position: new THREE.Vector3(...e.position),
      colorName: e.colorName,
      initialRotationY: e.initialRotationY ?? 0,
    });
    addToScene(emitter.mesh);
    // A level can lock an emitter's aim (`rotationEnabled: false`) — it then
    // isn't added to the aim-selectable set, so the player can't rotate it.
    // Used where the puzzle is solved purely by the mirrors (e.g. level 9),
    // which also stops a free-aimed emitter from trivially crossing the room
    // straight to a receiver. Defaults to interactive (spec §6).
    if (e.rotationEnabled !== false) interactiveObjects.push(emitter.mesh);
    return emitter;
  });

  const receivers = data.receivers.map((r) => {
    const receiver = createReceiver({
      position: new THREE.Vector3(...r.position),
      rotationY: r.rotationY ?? 0,
      colorName: r.colorName,
    });
    addToScene(receiver.mesh);
    return receiver;
  });
  const receiversById = new Map(data.receivers.map((r, i) => [r.id, receivers[i]]));

  const switches = (data.switches ?? []).map((s) => {
    const sw = createSwitch({
      position: new THREE.Vector3(...s.position),
      rotationY: s.rotationY ?? 0,
    });
    addToScene(sw.mesh);
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
    addToScene(filter.base);
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
    addToScene(blocker.mesh);
    return blocker;
  });

  // Both ends of a pair are flattened into one list — laser-system.js and
  // the player-crossing check (portal-crossing.js, driven from
  // level-runtime.js) just need every portal in the level, not the pairing
  // structure (each portal already carries a `linked` reference).
  const portals = (data.portals ?? []).flatMap((p) => {
    const [portalA, portalB] = createPortalPair(p);
    addToScene(portalA.mesh);
    addToScene(portalB.mesh);
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
    addToScene(door.mesh);
    if (d.exit) exitDoor = door;
    return door;
  });

  return { mirrors, emitters, receivers, switches, filters, blockers, portals, doors, exitDoor, roots };
}

// Reverses instantiateLevel(): removes every object it added to the scene
// (and any of their descendants it registered as interactive) and frees
// their GPU resources. Needed for restart/level-change (RF09) — nothing
// else owns these objects.
export function disposeLevel(loaded, scene, interactiveObjects) {
  for (const root of loaded.roots) {
    scene.remove(root);
    root.traverse((object) => {
      const index = interactiveObjects.indexOf(object);
      if (index !== -1) interactiveObjects.splice(index, 1);
      object.geometry?.dispose();
      object.material?.dispose();
    });
  }
}
