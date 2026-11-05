// Raw input capture only — keyboard state, and pointer-lock mouse deltas /
// confirm clicks handed to subscribers. What a mouse delta or a confirm
// click *does* (look around vs. manipulate a mirror) lives elsewhere
// (see look.js, manipulation.js), since that mapping changes depending on
// whether the player is aiming freely or manipulating an object (spec §4).
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

  domElement.addEventListener('click', () => {
    if (document.pointerLockElement !== domElement) {
      domElement.requestPointerLock();
      return;
    }
    for (const listener of confirmListeners) listener();
  });

  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement !== domElement) return;
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
