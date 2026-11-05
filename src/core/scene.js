import * as THREE from 'three';
import { ROOM_SIZE } from '../levels/data/constants.js';
import { floorTexture, wallTexture, ceilingTexture, stencilTexture, glassTexture, flareTexture, tileUvs } from '../gameplay/textures.js';

const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.2;
const FOG_COLOR = 0x0a0c0d;

let wallMaterial = null;
let glassMaterial = null;

// One wall material shared by the room shell and every level's interior
// walls (level-loader.js). Tagged `shared` so disposeLevel() leaves it alone.
export function getWallMaterial() {
  if (!wallMaterial) {
    wallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wallTexture(), roughness: 0.85, metalness: 0.05 });
    wallMaterial.userData.shared = true;
  }
  return wallMaterial;
}

// Frosted glass for `style: 'glass'` walls: light and shapes show through,
// but it still blocks walking, beams and aiming like any wall.
export function getGlassMaterial() {
  if (!glassMaterial) {
    glassMaterial = new THREE.MeshStandardMaterial({
      color: 0xdfe7e9,
      map: glassTexture(),
      roughness: 0.2,
      metalness: 0,
      emissive: 0x1c2224, // a faint sheen so the pane reads as a surface in the dark
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    glassMaterial.userData.shared = true;
  }
  return glassMaterial;
}

function createRoom() {
  const room = new THREE.Group();
  const walls = [];

  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, map: floorTexture(ROOM_SIZE), roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);

  // Closes the black void above the walls; doors slide up into it.
  // Unlit: it's nearly black anyway, and it fills a third of the screen
  // (a lit material here cost ~15% of the frame in software WebGL).
  const ceilingMaterial = new THREE.MeshBasicMaterial({ color: 0x5c5c5c, map: ceilingTexture() });
  const ceiling = new THREE.Mesh(tileUvs(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), ROOM_SIZE, ROOM_SIZE, 1.25), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  room.add(ceiling);

  const wallGeometry = tileUvs(new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT), ROOM_SIZE, WALL_HEIGHT, 1.5, WALL_HEIGHT);
  const half = ROOM_SIZE / 2;
  const material = getWallMaterial();
  const placements = [
    [0, -half, 0],
    [0, half, Math.PI],
    [-half, 0, Math.PI / 2],
    [half, 0, -Math.PI / 2],
  ];
  for (const [x, z, rotationY] of placements) {
    const wall = new THREE.Mesh(wallGeometry, material);
    wall.position.set(x, WALL_HEIGHT / 2, z);
    wall.rotation.y = rotationY;
    room.add(wall);
    walls.push(wall);
  }

  // Stenciled chamber numeral on the south wall, behind the spawn.
  const stencilMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff });
  const stencil = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), stencilMaterial);
  stencil.position.set(-2.6, 1.95, half - 0.01);
  stencil.rotation.y = Math.PI;
  room.add(stencil);

  // Two caged practical lamps high on the side walls: warm, dim, neutral
  // (not a laser hue). Their light on the wall is a painted-on additive
  // glow, not a real light — point lights are the most expensive thing to
  // render here, and the beams need them more (measured: ~12% per lamp in
  // software WebGL).
  const poolMaterial = new THREE.MeshBasicMaterial({ map: flareTexture(), color: 0x6b5a44, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const cageMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2c2d, metalness: 0.6, roughness: 0.5 });
  const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffd7a8, toneMapped: false });
  for (const [x, z, rot] of [[-half + 0.12, 1.5, Math.PI / 2], [half - 0.12, -1.5, -Math.PI / 2]]) {
    const fixture = new THREE.Group();
    fixture.position.set(x, 2.55, z);
    fixture.rotation.y = rot;
    fixture.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.14), cageMaterial));
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.1), bulbMaterial);
    bulb.position.set(0, -0.1, 0.04);
    fixture.add(bulb);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), poolMaterial);
    pool.position.set(0, -0.55, 0.02);
    fixture.add(pool);
    room.add(fixture);
  }

  return { room, walls, stencil, poolMaterial };
}

function createLights() {
  const lights = new THREE.Group();
  // Cool from above, warm bounce from the floor: form without a sun.
  const hemisphere = new THREE.HemisphereLight(0x9fb1bf, 0x2b2620, 0.55);
  lights.add(hemisphere);
  const ambient = new THREE.AmbientLight(0xbfd4e0, 0.12);
  lights.add(ambient);
  const key = new THREE.DirectionalLight(0xdfe6ea, 0.22);
  key.position.set(3, WALL_HEIGHT + 1, 2);
  lights.add(key);
  return { lights, hemisphere, ambient };
}

// Static AABBs (xz-plane rectangles) for the room shell, used by the
// movement collision system (spec §4: AABB vs. static level geometry).
function createRoomColliders() {
  const half = ROOM_SIZE / 2;
  const outer = half + WALL_THICKNESS;
  return [
    { minX: -outer, maxX: outer, minZ: -outer, maxZ: -half }, // back wall
    { minX: -outer, maxX: outer, minZ: half, maxZ: outer }, // front wall
    { minX: -outer, maxX: -half, minZ: -outer, maxZ: outer }, // left wall
    { minX: half, maxX: outer, minZ: -outer, maxZ: outer }, // right wall
  ];
}

// Wall line segments (inner surface) for the laser tracer (spec §4:
// a beam is absorbed by static level geometry) — distinct from the
// colliders above, which are padded rectangles for player collision.
function createRoomWallSegments() {
  const half = ROOM_SIZE / 2;
  return [
    { type: 'wall', a: { x: -half, z: -half }, b: { x: half, z: -half } }, // back
    { type: 'wall', a: { x: -half, z: half }, b: { x: half, z: half } }, // front
    { type: 'wall', a: { x: -half, z: -half }, b: { x: -half, z: half } }, // left
    { type: 'wall', a: { x: half, z: -half }, b: { x: half, z: half } }, // right
  ];
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FOG_COLOR);
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.03);
  const { room, walls, stencil, poolMaterial } = createRoom();
  scene.add(room);
  const { lights, hemisphere, ambient } = createLights();
  scene.add(lights);
  const colliders = createRoomColliders();
  const wallSegments = createRoomWallSegments();

  // Progressive unreality (design-premise.md §7): each chamber is a little
  // darker and hazier than the last. `progress` 0 (first level) .. 1 (last).
  function setAtmosphere(index, count) {
    const progress = count > 1 ? index / (count - 1) : 0;
    scene.fog.density = 0.025 + progress * 0.035;
    hemisphere.intensity = 0.55 - progress * 0.2;
    ambient.intensity = 0.12 - progress * 0.05;
    poolMaterial.color.setHex(0x6b5a44).multiplyScalar(1 - progress * 0.45);
    stencil.material.map = stencilTexture(String(index + 1).padStart(2, '0'));
    stencil.material.needsUpdate = true;
  }

  return { scene, colliders, wallSegments, occluders: walls, setAtmosphere };
}
