const MOVE_SPEED = 3; // meters/second
const PLAYER_RADIUS = 0.35;

function collidesAt(x, z, colliders) {
  for (const c of colliders) {
    if (!c) continue; // a `null` slot is an open door — no longer blocking
    if (
      x + PLAYER_RADIUS > c.minX &&
      x - PLAYER_RADIUS < c.maxX &&
      z + PLAYER_RADIUS > c.minZ &&
      z - PLAYER_RADIUS < c.maxZ
    ) {
      return true;
    }
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
export function createMovementController(camera, keys, roomColliders, getLevelColliders = () => []) {
  function blockedAt(x, z) {
    return collidesAt(x, z, roomColliders) || collidesAt(x, z, getLevelColliders());
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
    if (length > 0) {
      const step = (MOVE_SPEED * deltaSeconds) / length;
      moveX *= step;
      moveZ *= step;

      const newX = camera.position.x + moveX;
      if (!blockedAt(newX, camera.position.z)) {
        camera.position.x = newX;
      }

      const newZ = camera.position.z + moveZ;
      if (!blockedAt(camera.position.x, newZ)) {
        camera.position.z = newZ;
      }
    }
  }

  return { update };
}
