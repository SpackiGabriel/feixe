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

// Spec NFR "Acessibilidade a cores": each primary has its own geometric
// symbol, drawn on emitters, receivers and filters so no puzzle depends on
// telling hues apart. A composite shows the symbols of all its components
// side by side (magenta = circle + diamond). Baseline mapping — the visual
// track (design/visual/design-system.md D-16/17) can change it here alone.
export const PRIMARY_SYMBOLS = {
  red: 'circle',
  green: 'triangle',
  blue: 'diamond',
};

// Pure: the symbols to draw for a named color, in red/green/blue order.
export function symbolsFor(colorName) {
  const rgb = COLOR_NAMES[colorName];
  if (!rgb) throw new Error(`Unknown color "${colorName}"`);
  const symbols = [];
  if (rgb.r) symbols.push(PRIMARY_SYMBOLS.red);
  if (rgb.g) symbols.push(PRIMARY_SYMBOLS.green);
  if (rgb.b) symbols.push(PRIMARY_SYMBOLS.blue);
  return symbols;
}
