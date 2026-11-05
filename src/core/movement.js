import { damp } from '../presentation/motion.js';

const MOVE_SPEED = 3; // meters/second
const PLAYER_RADIUS = 0.35;
const ACCELERATION = 14; // damping rate toward the wanted velocity (~0.07 s ramp)
const DECELERATION = 18; // stop a little faster than you start: precise positioning
const STRIDE = 0.85; // metres per footstep

function overlaps(x, z, c) {
  return x + PLAYER_RADIUS > c.minX && x - PLAYER_RADIUS < c.maxX && z + PLAYER_RADIUS > c.minZ && z - PLAYER_RADIUS < c.maxZ;
}

// A collider the player is *already* inside (a door that slid shut on them
// while they stood in the doorway) doesn't block — otherwise every move
// would be rejected and the player would be stuck for good.
function collidesAt(x, z, colliders, fromX, fromZ) {
  for (const c of colliders) {
    if (!c) continue; // a `null` slot is an open door — no longer blocking
    if (overlaps(x, z, c) && !overlaps(fromX, fromZ, c)) return true;
  }
  return false;
}

// First-person translation on the floor plane, relative to camera yaw, with
// axis-separated AABB collision against static level geometry (spec §4).
// `roomColliders` is the fixed room shell (src/core/scene.js, shared by
// every level — docs/decisions/0005); `getLevelColliders` is a callback
// returning the *current* level's live colliders (blockers, and closed
// doors — see level-runtime.js's getColliders()), called fresh each frame
// since which doors are open changes at runtime.
export function createMovementController(camera, keys, roomColliders, getLevelColliders = () => [], onStep = () => {}) {
  let velocityX = 0;
  let velocityZ = 0;
  let stride = 0;

  function blockedAt(x, z) {
    const fromX = camera.position.x;
    const fromZ = camera.position.z;
    return collidesAt(x, z, roomColliders, fromX, fromZ) || collidesAt(x, z, getLevelColliders(), fromX, fromZ);
  }

  function update(deltaSeconds) {
    const yaw = camera.rotation.y;
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);
    const forwardX = -sinYaw;
    const forwardZ = -cosYaw;
    const rightX = cosYaw;
    const rightZ = -sinYaw;

    let moveX = 0;
    let moveZ = 0;
    if (keys.has('KeyW')) { moveX += forwardX; moveZ += forwardZ; }
    if (keys.has('KeyS')) { moveX -= forwardX; moveZ -= forwardZ; }
    if (keys.has('KeyA')) { moveX -= rightX; moveZ -= rightZ; }
    if (keys.has('KeyD')) { moveX += rightX; moveZ += rightZ; }

    const length = Math.hypot(moveX, moveZ);
    const wantX = length > 0 ? (moveX / length) * MOVE_SPEED : 0;
    const wantZ = length > 0 ? (moveZ / length) * MOVE_SPEED : 0;
    const rate = length > 0 ? ACCELERATION : DECELERATION;
    velocityX = damp(velocityX, wantX, rate, deltaSeconds);
    velocityZ = damp(velocityZ, wantZ, rate, deltaSeconds);
    if (Math.abs(velocityX) < 1e-3 && Math.abs(velocityZ) < 1e-3) {
      velocityX = 0;
      velocityZ = 0;
      return;
    }

    const startX = camera.position.x;
    const startZ = camera.position.z;
    const newX = camera.position.x + velocityX * deltaSeconds;
    if (!blockedAt(newX, camera.position.z)) camera.position.x = newX;
    else velocityX = 0;

    const newZ = camera.position.z + velocityZ * deltaSeconds;
    if (!blockedAt(camera.position.x, newZ)) camera.position.z = newZ;
    else velocityZ = 0;

    stride += Math.hypot(camera.position.x - startX, camera.position.z - startZ);
    if (stride >= STRIDE) {
      stride -= STRIDE;
      onStep();
    }
  }

  function stop() {
    velocityX = 0;
    velocityZ = 0;
  }

  return { update, stop };
}
