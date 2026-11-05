// Spec §8: a door watches a set of receivers and applies one simple rule —
// AND (every receiver active) or OR (at least one active). Spec §7's NOT
// ("Bloqueador ... se atingido por qualquer feixe, fecha uma porta") is the
// optional `forbiddenStates`: if any forbidden trap is currently hit, the
// door stays shut regardless of the rule. Pure, no Three.js dependency, kept
// separate from door.js's mesh/animation code so it's unit-testable.
export function evaluateDoorRule(receiverStates, rule, forbiddenStates = []) {
  if (forbiddenStates.some(Boolean)) return false;
  if (rule === 'AND') return receiverStates.length > 0 && receiverStates.every(Boolean);
  if (rule === 'OR') return receiverStates.some(Boolean);
  throw new Error(`Unknown door rule: ${rule}`);
}

// Pure: is this blocker's segment where any traced beam ended this frame?
export function isBlockerHit(traces, segment) {
  for (const trace of traces) {
    if (trace.status === 'blocked' && trace.segment === segment) return true;
  }
  return false;
}
