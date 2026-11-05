const ROTATE_SENSITIVITY = 0.01; // radians per pixel of mouse movement
const RAIL_METRES_PER_PIXEL = 0.008;
const KEY_ROTATE_STEP = Math.PI / 12; // 15° per Q/E press or wheel notch, unless the object snaps to its own step

// Pure mapping from one mouse delta to "what moves" (spec §4: drag along a
// rail *or* rotate around the axis). Sliding follows the screen: the mouse
// delta is projected onto the rail's direction as seen from the camera
// (right = mouse right, away = mouse up), in metres, so it feels the same
// for any rail orientation and length. Rotation uses horizontal mouse when
// it's the only degree of freedom; with both, rotation moves to the wheel /
// Q-E — otherwise one drag would slide and spin the mirror at once.
export function mouseDeltaToManipulation(controller, movementX, movementY = 0, cameraYaw = 0) {
  if (controller.positionEnabled) {
    const axis = controller.railAxis ?? { x: 1, z: 0, length: 1 };
    const rightDot = axis.x * Math.cos(cameraYaw) - axis.z * Math.sin(cameraYaw);
    const forwardDot = -axis.x * Math.sin(cameraYaw) - axis.z * Math.cos(cameraYaw);
    const metres = (movementX * rightDot - movementY * forwardDot) * RAIL_METRES_PER_PIXEL;
    return { position: metres / axis.length, rotation: 0 };
  }
  if (controller.rotationEnabled) return { position: 0, rotation: movementX * ROTATE_SENSITIVITY };
  return { position: 0, rotation: 0 };
}

export function keyRotationStep(controller) {
  return controller.rotationStep ?? KEY_ROTATE_STEP;
}

// "Confirm" enters/exits manipulation mode on the currently hovered object
// (spec §4). While active, mouse movement drives the object's degree of
// freedom instead of camera look.
export function createManipulation({ input, look, interaction, camera }) {
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

  function handleMouseMove(movementX, movementY) {
    if (!active) return;
    const { position, rotation } = mouseDeltaToManipulation(active, movementX, movementY, camera?.rotation.y ?? 0);
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
