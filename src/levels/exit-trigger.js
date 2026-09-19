// Pure geometry check for RF09's level-to-level transition. Levels are
// fixed, self-contained rooms (design/game-concept.md's anti-pillars) —
// there's no real physical passage between one room and the next, so the
// player never actually clips through the door's wall collider. Standing
// within range of the *open* exit door stands in for "walking through it".
// No Three.js dependency, so this is unit-testable without a WebGL context
// (test-standards.md).
export function isPlayerAtExit({ doorOpen, doorX, doorZ, playerX, playerZ, radius }) {
  if (!doorOpen) return false;
  const dx = playerX - doorX;
  const dz = playerZ - doorZ;
  return dx * dx + dz * dz <= radius * radius;
}
