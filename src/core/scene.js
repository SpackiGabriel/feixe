import * as THREE from 'three';
import { ROOM_SIZE } from '../levels/data/constants.js';
import { floorTexture, wallTexture, tileUvs } from '../gameplay/textures.js';

const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.2;

let wallMaterial = null;

// One wall material shared by the room shell and every level's interior
// walls (level-loader.js). Tagged `shared` so disposeLevel() leaves it alone.
export function getWallMaterial() {
  if (!wallMaterial) {
    wallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wallTexture(), roughness: 0.75, metalness: 0.2 });
    wallMaterial.userData.shared = true;
  }
  return wallMaterial;
}

function createRoom() {
  const room = new THREE.Group();
  const walls = [];

  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: floorTexture(ROOM_SIZE), roughness: 0.9 });
  const wallMaterial = getWallMaterial();

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);

  const wallGeometry = tileUvs(new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT), ROOM_SIZE, WALL_HEIGHT);
  const half = ROOM_SIZE / 2;

  const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
  backWall.position.set(0, WALL_HEIGHT / 2, -half);
  room.add(backWall);
  walls.push(backWall);

  const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
  frontWall.position.set(0, WALL_HEIGHT / 2, half);
  frontWall.rotation.y = Math.PI;
  room.add(frontWall);
  walls.push(frontWall);

  const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
  leftWall.position.set(-half, WALL_HEIGHT / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  room.add(leftWall);
  walls.push(leftWall);

  const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
  rightWall.position.set(half, WALL_HEIGHT / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  room.add(rightWall);
  walls.push(rightWall);

  return { room, walls };
}

function createLights() {
  const lights = new THREE.Group();

  // Deliberately dim (spec §13 III, design-premise.md): low ambient fill so
  // the room stays navigable, while the beams and receivers carry the scene.
  const ambient = new THREE.AmbientLight(0xbfd4e0, 0.35);
  lights.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.45);
  directional.position.set(3, WALL_HEIGHT + 1, 2);
  lights.add(directional);

  return lights;
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
  scene.background = new THREE.Color(0x1a1a1a);
  const { room, walls } = createRoom();
  scene.add(room);
  scene.add(createLights());
  const colliders = createRoomColliders();
  const wallSegments = createRoomWallSegments();
  return { scene, colliders, wallSegments, occluders: walls };
}
