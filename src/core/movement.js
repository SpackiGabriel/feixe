const MOVE_SPEED = 3; // meters/second
const PLAYER_RADIUS = 0.35;

function collidesAt(x, z, colliders) {
  for (const c of colliders) {
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
export function createMovementController(camera, keys, colliders) {
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
      if (!collidesAt(newX, camera.position.z, colliders)) {
        camera.position.x = newX;
      }

      const newZ = camera.position.z + moveZ;
      if (!collidesAt(camera.position.x, newZ, colliders)) {
        camera.position.z = newZ;
      }
    }
  }

  return { update };
}
