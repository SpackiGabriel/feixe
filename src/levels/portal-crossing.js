// Pure geometry/heading math for the player walking through a portal
// (spec §9: "um feixe (ou o próprio jogador)"). No Three.js dependency,
// so it's unit-testable without a WebGL context (test-standards.md) —
// same pattern as exit-trigger.js.

export function isPlayerAtPortal({ playerX, playerZ, portalX, portalZ, radius }) {
  const dx = playerX - portalX;
  const dz = playerZ - portalZ;
  return dx * dx + dz * dz <= radius * radius;
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
