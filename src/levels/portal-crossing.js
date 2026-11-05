// Pure geometry/heading math for the player walking through a portal
// (spec §9: "um feixe (ou o próprio jogador)"). No Three.js dependency,
// so it's unit-testable without a WebGL context (test-standards.md) —
// same pattern as exit-trigger.js.

// A "doorway" test rather than a plain radius: the player crosses a portal
// by walking through its face, so the trigger is an oriented box aligned to
// the portal — within `halfWidth` across the face (the panel's width, so a
// slightly-off-centre approach still catches instead of hitting the wall
// beside it) and within `depth` along the facing normal. Uses the same
// rotationY convention as every other object here: the face spans the
// tangent (cos, -sin) and faces the normal (-sin, -cos) (see mirror.js).
export function isPlayerAtPortal({ playerX, playerZ, portalX, portalZ, portalRotationY, halfWidth, depth }) {
  const dx = playerX - portalX;
  const dz = playerZ - portalZ;
  const cos = Math.cos(portalRotationY);
  const sin = Math.sin(portalRotationY);
  const along = dx * cos - dz * sin; // offset across the doorway's width
  const through = -dx * sin - dz * cos; // offset along the facing normal
  return Math.abs(along) <= halfWidth && Math.abs(through) <= depth;
}

// Exit position is the linked portal's own spot, pushed out along its
// facing (`-sin/-cos` matches every other object's rotationY convention
// in this codebase — see mirror.js, emitter.js) so the player doesn't
// land inside a wall. Exit heading is the player's own heading rotated
// by the pair's orientation difference — the same transform a beam gets
// (laser.js's rotateXZ) applied to a yaw angle instead of a direction
// vector, so walking through a portal matches beam physics.
export function computePortalLanding({ linkedX, linkedZ, linkedRotationY, exitRotationDelta, playerYaw, clearance }) {
  return {
    x: linkedX - Math.sin(linkedRotationY) * clearance,
    z: linkedZ - Math.cos(linkedRotationY) * clearance,
    yaw: playerYaw + exitRotationDelta,
  };
}
