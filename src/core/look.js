const MOUSE_SENSITIVITY = 0.0025;
const PITCH_LIMIT = Math.PI / 2 - 0.01; // clamp just short of straight up/down (spec §4)

// Mouse-look, split out from raw input capture so it can be suspended
// while the player is manipulating a mirror/emitter (spec §4: aim vs.
// manipulation are mutually exclusive modes).
export function createLookController(camera) {
  let pitch = 0;
  let enabled = true;

  function handleMouseMove(movementX, movementY) {
    if (!enabled) return;

    const yaw = camera.rotation.y - movementX * MOUSE_SENSITIVITY;
    pitch -= movementY * MOUSE_SENSITIVITY;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }

  return {
    handleMouseMove,
    setEnabled: (value) => { enabled = value; },
  };
}
