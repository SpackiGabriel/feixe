// Raw input capture only — keyboard state, and pointer-lock mouse deltas /
// confirm clicks handed to subscribers. What a mouse delta or a confirm
// click *does* (look around vs. manipulate a mirror) lives elsewhere
// (see look.js, manipulation.js), since that mapping changes depending on
// whether the player is aiming freely or manipulating an object (spec §4).
export function createInput(domElement) {
  const keys = new Set();
  const mouseMoveListeners = [];
  const confirmListeners = [];

  window.addEventListener('keydown', (event) => keys.add(event.code));
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

  return {
    keys,
    onMouseMove: (listener) => mouseMoveListeners.push(listener),
    onConfirm: (listener) => confirmListeners.push(listener),
  };
}
