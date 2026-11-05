const MOUSE_SENSITIVITY = 0.0025; // radians per pixel at 1.0×
const PITCH_LIMIT = Math.PI / 2 - 0.01; // clamp just short of straight up/down (spec §4)

// Player-adjustable look sensitivity (menu "Sensibilidade"), a multiplier
// on MOUSE_SENSITIVITY, persisted per browser.
export const SENSITIVITY_STEPS = [0.25, 0.4, 0.55, 0.7, 0.85, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const SENSITIVITY_KEY = 'feixe.sensitivity';

export function loadSensitivity(storage = globalThis.localStorage) {
  try {
    const value = Number(storage?.getItem(SENSITIVITY_KEY));
    return SENSITIVITY_STEPS.includes(value) ? value : 1;
  } catch {
    return 1;
  }
}

export function saveSensitivity(value, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SENSITIVITY_KEY, String(value));
  } catch {
    // private mode: applies for this session only
  }
}

// Next step up (+1) or down (-1), clamped at the ends.
export function stepSensitivity(current, direction) {
  const index = SENSITIVITY_STEPS.indexOf(current);
  const from = index === -1 ? SENSITIVITY_STEPS.indexOf(1) : index;
  const next = Math.max(0, Math.min(SENSITIVITY_STEPS.length - 1, from + direction));
  return SENSITIVITY_STEPS[next];
}

// Mouse-look, split out from raw input capture so it can be suspended
// while the player is manipulating a mirror/emitter (spec §4: aim vs.
// manipulation are mutually exclusive modes).
export function createLookController(camera) {
  let pitch = 0;
  let enabled = true;
  let multiplier = 1;

  function handleMouseMove(movementX, movementY) {
    if (!enabled) return;

    const scale = MOUSE_SENSITIVITY * multiplier;
    const yaw = camera.rotation.y - movementX * scale;
    pitch -= movementY * scale;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }

  // Level spawn: face `yaw`, level pitch.
  function setOrientation(yaw) {
    pitch = 0;
    camera.rotation.set(0, yaw, 0, 'YXZ');
  }

  return {
    handleMouseMove,
    setOrientation,
    setEnabled: (value) => { enabled = value; },
    setSensitivity: (value) => { multiplier = value; },
  };
}
