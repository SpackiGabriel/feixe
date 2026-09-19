import * as THREE from 'three';

export const ROOM_SIZE = 10;
const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.2;

function createRoom() {
  const room = new THREE.Group();

  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);

  const wallGeometry = new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT);
  const half = ROOM_SIZE / 2;

  const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
  backWall.position.set(0, WALL_HEIGHT / 2, -half);
  room.add(backWall);

  const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
  frontWall.position.set(0, WALL_HEIGHT / 2, half);
  frontWall.rotation.y = Math.PI;
  room.add(frontWall);

  const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
  leftWall.position.set(-half, WALL_HEIGHT / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  room.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
  rightWall.position.set(half, WALL_HEIGHT / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  room.add(rightWall);

  return room;
}

function createLights() {
  const lights = new THREE.Group();

  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  lights.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
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

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);
  scene.add(createRoom());
  scene.add(createLights());
  const colliders = createRoomColliders();
  return { scene, colliders };
}
