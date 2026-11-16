import * as THREE from 'three';
import { createMirror } from '../gameplay/mirror.js';
import { createEmitter } from '../gameplay/emitter.js';
import { createReceiver } from '../gameplay/receiver.js';
import { createSwitch } from '../gameplay/switch.js';
import { createFilter } from '../gameplay/filter.js';
import { createBlocker } from '../gameplay/blocker.js';
import { createPortalPair } from '../gameplay/portal.js';
import { createDoor } from '../gameplay/door.js';
import { createWall } from '../gameplay/wall.js';
import { getWallMaterial, getGlassMaterial } from '../core/scene.js';
import { routeConduit, createConduit } from '../presentation/conduits.js';

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
    for (const extra of mirror.extras) addToScene(extra);
    // Like emitters: a mirror with no degree of freedom (level 1's display
    // piece, now aimable through its glass) isn't selectable.
    if (m.positionEnabled || m.rotationEnabled) interactiveObjects.push(mirror.plate);
    mirror.plate.userData.debugInfo = () => `espelho ${m.id}  t=${mirror.getT().toFixed(3)}  rot=${degrees(mirror.plate.rotation.y)}°`;
    return mirror;
  });

  const emitters = data.emitters.map((e) => {
    const emitter = createEmitter({
      position: new THREE.Vector3(...e.position),
      colorName: e.colorName,
      initialRotationY: e.initialRotationY ?? 0,
      rotationEnabled: e.rotationEnabled ?? false,
      rotationStepDegrees: e.rotationStepDegrees ?? null,
    });
    addToScene(emitter.mesh);
    for (const extra of emitter.extras) addToScene(extra);
    if (emitter.rotationEnabled) interactiveObjects.push(emitter.mesh);
    emitter.mesh.userData.debugInfo = () => `emissor ${e.id}  rot=${degrees(emitter.mesh.rotation.y)}°`;
    return emitter;
  });

  const receivers = data.receivers.map((r) => {
    const receiver = createReceiver({
      position: new THREE.Vector3(...r.position),
      rotationY: r.rotationY ?? 0,
      colorName: r.colorName,
    });
    addToScene(receiver.mesh);
    receiver.levelId = r.id;
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
    sw.button.userData.debugInfo = () => `interruptor ${s.id}  ${sw.isActive() ? 'ligado' : 'desligado'}`;
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
    for (const extra of filter.extras) addToScene(extra);
    interactiveObjects.push(filter.plate);
    filter.plate.userData.debugInfo = () => `filtro ${f.id}  t=${filter.getT().toFixed(3)}`;
    return filter;
  });

  const blockers = (data.blockers ?? []).map((b) => {
    const blocker = createBlocker({
      position: new THREE.Vector3(...b.position),
      rotationY: b.rotationY ?? 0,
      width: b.width,
      height: b.height,
      thickness: b.thickness,
      trap: b.trap ?? false,
    });
    addToScene(blocker.mesh);
    return blocker;
  });
  const blockersById = new Map((data.blockers ?? []).map((b, i) => [b.id, blockers[i]]));

  // Interior walls (spec §10's "paredes"). They share the room's wall
  // material, which disposeLevel() must not free (see isShared()).
  const walls = (data.walls ?? []).map((w) => {
    const wall = createWall({ ...w, material: w.style === 'glass' ? getGlassMaterial() : getWallMaterial() });
    addToScene(wall.mesh);
    return wall;
  });

  // Both ends of a pair are flattened into one list — laser-system.js and
  // the player-crossing check (portal-crossing.js, driven from
  // level-runtime.js) just need every portal in the level, not the pairing
  // structure (each portal already carries a `linked` reference).
  const portals = (data.portals ?? []).flatMap((p, pairIndex) => {
    const [portalA, portalB] = createPortalPair(p, pairIndex);
    addToScene(portalA.mesh);
    addToScene(portalB.mesh);
    return [portalA, portalB];
  });

  // A door doesn't care whether it's watching a receiver or a switch — both
  // expose isActive() (spec §11: level 1's switch reuses RF07 door logic
  // as-is, no laser/color involved).
  let exitDoor = null;
  const conduits = [];
  const doors = data.doors.map((d) => {
    const lookup = (id) => {
      const activatable = receiversById.get(id) ?? switchesById.get(id);
      if (!activatable) throw new Error(`Level "${data.id}": door "${d.id}" references unknown receiver/switch "${id}"`);
      return activatable;
    };
    // An entry may be `{ any: [ids] }` — satisfied when at least one is
    // active — so one door can require "A AND (B OR C)" (spec §11 level 10).
    const doorReceivers = d.receiverIds.map((entry) => {
      if (typeof entry === 'string') return lookup(entry);
      const group = entry.any.map(lookup);
      return { isActive: () => group.some((r) => r.isActive()) };
    });
    // Every individual input (group members included) gets a conduit.
    const conduitSources = d.receiverIds.flatMap((entry) => (typeof entry === 'string' ? [entry] : entry.any)).map(lookup);
    const forbidden = (d.forbidIds ?? []).map((id) => {
      const blocker = blockersById.get(id);
      if (!blocker?.trap) throw new Error(`Level "${data.id}": door "${d.id}" forbidIds "${id}" must be a blocker with trap: true`);
      return blocker;
    });
    const door = createDoor({
      position: new THREE.Vector3(...d.position),
      rotationY: d.rotationY ?? 0,
      rule: d.rule,
      receivers: doorReceivers,
      forbidden,
      exit: d.exit ?? false,
      style: d.style,
    });
    addToScene(door.mesh);
    door.levelId = d.id;

    // Floor conduits from each input (and trap) to this door's base.
    const sources = [...conduitSources.map((src) => ({ src, trap: false })), ...forbidden.map((src) => ({ src, trap: true }))];
    sources.forEach(({ src, trap }, i) => {
      const from = src.mesh.position;
      const route = routeConduit({ x: from.x, z: from.z }, { x: door.position.x, z: door.position.z }, i - (sources.length - 1) / 2);
      const conduit = createConduit(route, { trap });
      addToScene(conduit.mesh);
      conduits.push({ conduit, isActive: trap ? () => src.isHit() : () => src.isActive() });
    });
    if (d.exit) exitDoor = door;
    return door;
  });

  // Where the player stands on load/restart: XZ position + yaw (radians,
  // 0 = facing -Z, the same rotationY convention as every object).
  const spawn = { x: data.spawn?.position?.[0] ?? 0, z: data.spawn?.position?.[1] ?? 4.5, yaw: data.spawn?.yaw ?? 0 };

  return { spawn, mirrors, emitters, receivers, switches, filters, blockers, walls, portals, doors, exitDoor, conduits, roots };
}

function degrees(radians) {
  return ((radians * 180) / Math.PI).toFixed(1);
}

// Materials/textures cached across levels (src/core/scene.js, textures.js)
// are tagged userData.shared and outlive any single level.
function isShared(material) {
  return material.userData?.shared === true;
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
      if (object.isReflector) object.dispose(); // its render target
      object.geometry?.dispose();
      if (object.material && !isShared(object.material)) object.material.dispose();
    });
  }
}
