// Axis-aligned bounding box of a rectangle centered at `position`, rotated
// by `rotationY` around the vertical axis — the standard "sum of absolute
// projected half-extents" formula. Used by door.js and blocker.js to
// expose a collider for the player movement system (src/core/movement.js),
// which only understands axis-aligned rects, not rotated ones. Pure, no
// Three.js dependency, so it's unit-testable in isolation.
export function rotatedRectAABB(position, rotationY, width, depth) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const extentX = Math.abs(halfWidth * cos) + Math.abs(halfDepth * sin);
  const extentZ = Math.abs(halfWidth * sin) + Math.abs(halfDepth * cos);
  return {
    minX: position.x - extentX,
    maxX: position.x + extentX,
    minZ: position.z - extentZ,
    maxZ: position.z + extentZ,
  };
}
