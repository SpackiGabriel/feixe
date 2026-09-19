// Runner smoke test — exercises the validated prototype logic
// (prototypes/mirror-reflection/engine.mjs) to confirm Vitest is wired up
// correctly. The production laser-tracing tests live alongside the real
// implementation once it exists (see .claude/rules/prototype-code.md:
// production code never imports from prototypes/, but tests may reference
// this throwaway module as a reference check).
import { describe, it, expect } from 'vitest';
import { reflect, vec, fromAngle, traceBeam, evaluateReceiver } from '../../prototypes/mirror-reflection/engine.mjs';

describe('mirror-reflection prototype (runner smoke test)', () => {
  it('test_reflect_45degreeMirror_bouncesBeamNinetyDegrees', () => {
    // Arrange: beam traveling +X, mirror normal at 45 degrees
    const dir = vec(1, 0);
    const normal = fromAngle(135);

    // Act
    const result = reflect(dir, normal);

    // Assert: a 45-degree mirror turns a horizontal beam vertical
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.y).toBeCloseTo(1, 5);
  });

  it('test_traceBeam_directHitOnReceiver_composesAdditiveColor', () => {
    // Arrange: red emitter at the origin fires +X directly into a
    // receiver segment perpendicular to its path.
    const segments = [{ id: 'r1', type: 'receiver', a: vec(5, -1), b: vec(5, 1) }];
    const emitter = { pos: vec(0, 0), dir: vec(1, 0), color: { r: 1, g: 0, b: 0 } };

    // Act
    const trace = traceBeam(segments, emitter, 8);

    // Assert
    expect(trace.status).toBe('hit-receiver');
    const evaluation = evaluateReceiver([trace], 'r1', { r: 1, g: 0, b: 0 });
    expect(evaluation.satisfied).toBe(true);
  });
});
