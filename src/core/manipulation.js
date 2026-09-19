const ROTATE_SENSITIVITY = 0.01; // radians per pixel of mouse movement
const RAIL_SENSITIVITY = 0.0015; // rail fraction (0..1) per pixel

// "Confirm" enters/exits manipulation mode on the currently hovered object
// (spec §4). While active, mouse movement drives whichever degree of
// freedom that object's controller enables (rail position or rotation)
// instead of camera look.
export function createManipulation({ input, look, interaction }) {
  let active = null;

  function toggle() {
    if (active) {
      exit();
      return;
    }
    const hovered = interaction.getHovered();
    // A one-shot object (e.g. a switch) fires immediately and never enters
    // manipulation mode — it has no degree of freedom to drag.
    if (typeof hovered?.userData.activate === 'function') {
      hovered.userData.activate();
      return;
    }
    const controller = hovered?.userData.controller;
    if (controller) enter(controller);
  }

  function enter(controller) {
    active = controller;
    look.setEnabled(false);
  }

  function exit() {
    active = null;
    look.setEnabled(true);
  }

  function handleMouseMove(movementX) {
    if (!active) return;
    if (active.positionEnabled) active.applyPositionDelta(movementX * RAIL_SENSITIVITY);
    if (active.rotationEnabled) active.applyRotationDelta(movementX * ROTATE_SENSITIVITY);
  }

  input.onConfirm(toggle);
  input.onMouseMove(handleMouseMove);

  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && active) exit();
  });

  return {
    isActive: () => active !== null,
  };
}
