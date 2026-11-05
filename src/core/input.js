// Raw input capture only — keyboard state, and pointer-lock mouse deltas /
// confirm clicks handed to subscribers. What a mouse delta or a confirm
// click *does* (look around vs. manipulate a mirror) lives elsewhere
// (see look.js, manipulation.js), since that mapping changes depending on
// whether the player is aiming freely or manipulating an object (spec §4).
// Chromium on Windows sometimes reports a bogus, huge movementX/Y for one
// event under pointer lock (cursor-warp artefact; worse with OS mouse
// acceleration and right after locking), which flicks the camera to a
// random direction. Two defences: raw (unadjusted) movement where the
// browser supports it, and dropping deltas no real hand produces in one
// event, plus the first events after a lock.
const MAX_MOUSE_DELTA = 250; // px in a single event
const SETTLE_EVENTS = 2; // ignored right after pointer lock is acquired

export function isSpuriousDelta(movementX, movementY, limit = MAX_MOUSE_DELTA) {
  return !Number.isFinite(movementX) || !Number.isFinite(movementY)
    || Math.abs(movementX) > limit || Math.abs(movementY) > limit;
}

// requestPointerLock with raw input when available; falls back to the plain
// call (older browsers throw/reject on the options object). Returns a
// promise (or undefined in very old browsers) like the native call.
export function lockPointer(element) {
  let result;
  try {
    result = element.requestPointerLock({ unadjustedMovement: true });
  } catch {
    return element.requestPointerLock();
  }
  if (result?.catch) {
    return result.catch((error) => {
      if (error?.name === 'NotSupportedError') return element.requestPointerLock();
      throw error;
    });
  }
  return result;
}

export function createInput(domElement) {
  const keys = new Set();
  const mouseMoveListeners = [];
  const confirmListeners = [];
  const keyDownListeners = new Map(); // code -> Set<fn>
  const wheelListeners = [];

  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (!event.repeat) {
      for (const listener of keyDownListeners.get(event.code) ?? []) listener();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear()); // no stuck keys after alt-tab

  domElement.addEventListener('click', () => {
    if (document.pointerLockElement !== domElement) {
      lockPointer(domElement)?.catch?.(() => {});
      return;
    }
    for (const listener of confirmListeners) listener();
  });

  let settle = 0;
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === domElement) settle = SETTLE_EVENTS;
  });

  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement !== domElement) return;
    if (settle > 0) {
      settle--;
      return;
    }
    if (isSpuriousDelta(event.movementX, event.movementY)) return;
    for (const listener of mouseMoveListeners) {
      listener(event.movementX, event.movementY);
    }
  });

  document.addEventListener('wheel', (event) => {
    if (document.pointerLockElement !== domElement) return;
    for (const listener of wheelListeners) listener(Math.sign(event.deltaY));
  }, { passive: true });

  return {
    keys,
    isLocked: () => document.pointerLockElement === domElement,
    onWheel: (listener) => wheelListeners.push(listener),
    onMouseMove: (listener) => mouseMoveListeners.push(listener),
    onConfirm: (listener) => confirmListeners.push(listener),
    // Edge-triggered — fires once per physical press, not once per frame
    // while held (unlike `keys`, which is continuous state for movement).
    onKeyDown: (code, listener) => {
      if (!keyDownListeners.has(code)) keyDownListeners.set(code, new Set());
      keyDownListeners.get(code).add(listener);
    },
  };
}
