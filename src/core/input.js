const MOUSE_SENSITIVITY = 0.0025;
const PITCH_LIMIT = Math.PI / 2 - 0.01; // clamp just short of straight up/down (spec §4)

export function createInput(camera, domElement) {
  const keys = new Set();
  let pitch = 0;

  window.addEventListener('keydown', (event) => keys.add(event.code));
  window.addEventListener('keyup', (event) => keys.delete(event.code));

  domElement.addEventListener('click', () => {
    domElement.requestPointerLock();
  });

  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement !== domElement) return;

    const yaw = camera.rotation.y - event.movementX * MOUSE_SENSITIVITY;
    pitch -= event.movementY * MOUSE_SENSITIVITY;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  });

  return keys;
}
