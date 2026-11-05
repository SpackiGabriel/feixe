// Rotation with optional snapping (spec §5: "incrementos livres ou fixos de
// 45°"). Keeps the raw, unsnapped angle so many small mouse deltas
// accumulate into a step instead of each one being rounded back to zero.
// Pure — no Three.js — so it's unit-testable.
export function createSteppedAngle(initial = 0, stepDegrees = null) {
  const step = stepDegrees ? (stepDegrees * Math.PI) / 180 : null;
  let raw = initial;

  function snapped() {
    return step ? Math.round(raw / step) * step : raw;
  }

  return {
    // Returns the angle to apply to the mesh after adding `delta` radians.
    add(delta) {
      raw += delta;
      return snapped();
    },
    // Jump to an exact angle (keyboard step rotation, tests).
    set(angle) {
      raw = angle;
      return snapped();
    },
    get: snapped,
    step,
  };
}
