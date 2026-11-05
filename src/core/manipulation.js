const ROTATE_SENSITIVITY = 0.01; // radians per pixel of mouse movement
const RAIL_SENSITIVITY = 0.0015; // rail fraction (0..1) per pixel
const KEY_ROTATE_STEP = Math.PI / 12; // 15° per Q/E press or wheel notch, unless the object snaps to its own step

// Pure mapping from one mouse delta to "what moves" (spec §4: drag along a
// rail *or* rotate around the axis). With a single enabled degree of
// freedom, horizontal mouse drives it. With both, horizontal mouse slides
// and rotation moves to the wheel / Q-E — otherwise one drag would slide
// and spin the mirror at once, which made level 6 nearly unplayable.
export function mouseDeltaToManipulation(controller, movementX) {
  if (controller.positionEnabled) return { position: movementX * RAIL_SENSITIVITY, rotation: 0 };
  if (controller.rotationEnabled) return { position: 0, rotation: movementX * ROTATE_SENSITIVITY };
  return { position: 0, rotation: 0 };
}

export function keyRotationStep(controller) {
  return controller.rotationStep ?? KEY_ROTATE_STEP;
}

// "Confirm" enters/exits manipulation mode on the currently hovered object
// (spec §4). While active, mouse movement drives the object's degree of
// freedom instead of camera look.
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
    const { position, rotation } = mouseDeltaToManipulation(active, movementX);
    if (position) active.applyPositionDelta(position);
    if (rotation) active.applyRotationDelta(rotation);
  }

  function rotateStep(sign) {
    if (!active?.rotationEnabled) return;
    active.applyRotationDelta(sign * keyRotationStep(active));
  }

  input.onConfirm(toggle);
  input.onMouseMove(handleMouseMove);
  input.onWheel(rotateStep);
  input.onKeyDown('KeyQ', () => rotateStep(1));
  input.onKeyDown('KeyE', () => rotateStep(-1));

  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && active) exit();
  });

  return {
    isActive: () => active !== null,
    getActive: () => active,
    exit,
  };
}
