// Shared motion vocabulary (docs/presentation.md): easing curves, `damp`
// and TEMPO's three beats (transitions use TEMPO.act; doors, conduits and
// the HUD keep their own named durations). Pure, no Three.js.

// Snap: acknowledgements (hover, grab, ticks). Act: a deliberate action
// (charge, clamp release, shutter). Settle: the payoff (door lift, title).
export const TEMPO = {
  snap: 0.09,
  act: 0.3,
  settle: 0.8,
};

export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeInCubic = (t) => t * t * t;
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
// Overshoots a little then settles — used once per action, never looping.
export const easeOutBack = (t) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

// Frame-rate independent exponential approach of `current` to `target`.
// `lambda` ≈ 1 / time constant (bigger = snappier).
export function damp(current, target, lambda, deltaSeconds) {
  return target + (current - target) * Math.exp(-lambda * deltaSeconds);
}

// prefers-reduced-motion: camera effects off, transitions shortened.
// Read once; false in Node.
export const reducedMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
