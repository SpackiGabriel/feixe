import { damp, reducedMotion } from './motion.js';

const GRAB_FOV_OFFSET = -4; // degrees: a slight "lean in" while holding an object
const RUMBLE_AMPLITUDE = 0.006; // metres, at the door
const RUMBLE_RANGE = 7; // metres
const THUD_AMPLITUDE = 0.012;
const DRIFT_SPEED = 0.07; // rad/s, menu background
const DRIFT_RANGE = 0.35; // rad

// Camera presentation that must never fight precision (docs/presentation.md):
//   - only *translation* shake (a few millimetres, from moving doors and
//     closing thuds), never rotation, so the crosshair stays on target;
//   - an eased FOV "lean in" while grabbing an object;
//   - a slow yaw drift behind the start menu.
// Everything is applied right before rendering and removed right after,
// so movement, aiming and raycasts always see the real camera. All off
// under prefers-reduced-motion.
export function createCameraFx(camera) {
  const movingDoors = new Set();
  let baseFov = camera.fov;
  let fovOffset = 0;
  let grabbing = false;
  let thud = 0;
  let time = 0;
  let drift = false;
  let driftPhase = 0;
  const saved = { x: 0, y: 0, z: 0, yaw: 0 };

  return {
    setBaseFov(fov) {
      baseFov = fov;
    },
    getBaseFov: () => baseFov,
    setGrabbing(value) {
      grabbing = value;
    },
    setDrift(value) {
      drift = value;
    },
    doorMoving(door) {
      movingDoors.add(door);
    },
    doorSettled(door, opening) {
      movingDoors.delete(door);
      if (!opening) thud = Math.max(thud, falloff(door));
    },
    clearDoors() {
      movingDoors.clear();
    },

    // Before renderer.render().
    apply(deltaSeconds) {
      time += deltaSeconds;
      saved.x = camera.position.x;
      saved.y = camera.position.y;
      saved.z = camera.position.z;
      saved.yaw = camera.rotation.y;

      const targetOffset = grabbing && !reducedMotion ? GRAB_FOV_OFFSET : 0;
      fovOffset = damp(fovOffset, targetOffset, 10, deltaSeconds);
      const fov = baseFov + fovOffset;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }

      if (reducedMotion) return;
      let rumble = 0;
      for (const door of movingDoors) rumble = Math.max(rumble, falloff(door) * RUMBLE_AMPLITUDE);
      thud = Math.max(0, thud - deltaSeconds * 4);
      const shake = rumble + thud * thud * THUD_AMPLITUDE;
      if (shake > 0) {
        camera.position.y += Math.sin(time * 61) * shake + Math.sin(time * 37) * shake * 0.5;
        camera.position.x += Math.sin(time * 43 + 1.3) * shake * 0.4;
      }
      if (drift) {
        driftPhase += deltaSeconds * DRIFT_SPEED;
        camera.rotation.y += Math.sin(driftPhase) * DRIFT_RANGE;
      }
    },

    // After renderer.render().
    restore() {
      camera.position.set(saved.x, saved.y, saved.z);
      camera.rotation.y = saved.yaw;
    },
  };

  function falloff(door) {
    const dx = door.position.x - camera.position.x;
    const dz = door.position.z - camera.position.z;
    return Math.max(0, 1 - Math.hypot(dx, dz) / RUMBLE_RANGE);
  }
}
