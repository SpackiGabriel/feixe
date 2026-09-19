// Spec §8: a door watches a set of receivers and applies one simple rule —
// AND (every receiver active) or OR (at least one active). Pure, no
// Three.js dependency, kept separate from door.js's mesh/animation code so
// it's unit-testable without a DOM/WebGL context.
export function evaluateDoorRule(receiverStates, rule) {
  if (rule === 'AND') return receiverStates.length > 0 && receiverStates.every(Boolean);
  if (rule === 'OR') return receiverStates.some(Boolean);
  throw new Error(`Unknown door rule: ${rule}`);
}
