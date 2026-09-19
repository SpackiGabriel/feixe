// Named colors for the fixed-primary laser system (spec §7): the three
// primaries an emitter can fire, plus the additive composites a receiver
// can require as its target. Pure data — no Three.js dependency, so any
// module needing color names can be unit tested without a DOM/WebGL context.
export const COLOR_NAMES = {
  red: { r: 1, g: 0, b: 0 },
  green: { r: 0, g: 1, b: 0 },
  blue: { r: 0, g: 0, b: 1 },
  yellow: { r: 1, g: 1, b: 0 },
  magenta: { r: 1, g: 0, b: 1 },
  cyan: { r: 0, g: 1, b: 1 },
  white: { r: 1, g: 1, b: 1 },
};
