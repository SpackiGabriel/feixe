import { describe, it, expect } from 'vitest';
import {
  reflect,
  intersectRaySegment,
  traceBeam,
  composeReceiverColor,
  isReceiverSatisfied,
  colorToHex,
} from '../../src/gameplay/laser.js';

describe('reflect', () => {
  it('test_reflect_45degreeMirror_turnsHorizontalBeamVertical', () => {
    // Arrange
    const dir = { x: 1, z: 0 };
    const normal = { x: -1, z: 1 }; // 45-degree mirror face normal

    // Act
    const result = reflect(dir, normal);

    // Assert
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.z).toBeCloseTo(1, 5);
  });

  it('test_reflect_arbitraryAngle_isInvariantToNormalSign', () => {
    // Arrange: flipping the normal's sign must not change the result —
    // a mirror reflects the same way regardless of which side it's "facing".
    const dir = { x: 0.6, z: 0.8 };
    const normal = { x: 0.3, z: -0.7 };

    // Act
    const a = reflect(dir, normal);
    const b = reflect(dir, { x: -normal.x, z: -normal.z });

    // Assert
    expect(a.x).toBeCloseTo(b.x, 5);
    expect(a.z).toBeCloseTo(b.z, 5);
  });
});

describe('intersectRaySegment', () => {
  it('test_intersectRaySegment_perpendicularHit_returnsPointAndParams', () => {
    // Arrange
    const origin = { x: 0, z: 0 };
    const dir = { x: 1, z: 0 };
    const a = { x: 5, z: -1 };
    const b = { x: 5, z: 1 };

    // Act
    const hit = intersectRaySegment(origin, dir, a, b);

    // Assert
    expect(hit).not.toBeNull();
    expect(hit.point.x).toBeCloseTo(5, 5);
    expect(hit.point.z).toBeCloseTo(0, 5);
  });

  it('test_intersectRaySegment_parallelRay_returnsNull', () => {
    // Arrange
    const origin = { x: 0, z: 0 };
    const dir = { x: 1, z: 0 };
    const a = { x: 5, z: 5 };
    const b = { x: 10, z: 5 };

    // Act
    const hit = intersectRaySegment(origin, dir, a, b);

    // Assert
    expect(hit).toBeNull();
  });

  it('test_intersectRaySegment_behindOrigin_returnsNull', () => {
    // Arrange: segment is behind the ray's origin along dir
    const origin = { x: 0, z: 0 };
    const dir = { x: 1, z: 0 };
    const a = { x: -5, z: -1 };
    const b = { x: -5, z: 1 };

    // Act
    const hit = intersectRaySegment(origin, dir, a, b);

    // Assert
    expect(hit).toBeNull();
  });
});

describe('traceBeam', () => {
  it('test_traceBeam_directHitOnReceiver_stopsAndReportsHit', () => {
    // Arrange
    const segments = [{ id: 'r1', type: 'receiver', a: { x: 5, z: -1 }, b: { x: 5, z: 1 } }];
    const emitter = { pos: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, color: { r: 1, g: 0, b: 0 } };

    // Act
    const trace = traceBeam(segments, emitter, 8);

    // Assert
    expect(trace.status).toBe('hit-receiver');
    expect(trace.segment.id).toBe('r1');
    expect(trace.path).toHaveLength(2);
  });

  it('test_traceBeam_hitsWall_absorbsWithoutReflecting', () => {
    // Arrange
    const segments = [{ type: 'wall', a: { x: 5, z: -5 }, b: { x: 5, z: 5 } }];
    const emitter = { pos: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, color: { r: 1, g: 1, b: 1 } };

    // Act
    const trace = traceBeam(segments, emitter, 8);

    // Assert
    expect(trace.status).toBe('absorbed-wall');
  });

  it('test_traceBeam_hitsBlocker_stopsWithoutReflecting', () => {
    // Arrange
    const segments = [{ type: 'blocker', a: { x: 5, z: -1 }, b: { x: 5, z: 1 } }];
    const emitter = { pos: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, color: { r: 0, g: 0, b: 1 } };

    // Act
    const trace = traceBeam(segments, emitter, 8);

    // Assert
    expect(trace.status).toBe('blocked');
  });

  it('test_traceBeam_noGeometryInPath_escapesAtLongRange', () => {
    // Arrange
    const emitter = { pos: { x: 0, z: 0 }, dir: { x: 0, z: -1 }, color: { r: 1, g: 0, b: 0 } };

    // Act
    const trace = traceBeam([], emitter, 8);

    // Assert
    expect(trace.status).toBe('escaped');
  });

  it('test_traceBeam_mirrorRedirectsBeamIntoReceiver_hitsWithOriginalColor', () => {
    // Arrange: emitter fires +X, hits a 45-degree mirror at x=5 that
    // redirects it toward +Z, into a receiver at z=5.
    const segments = [
      { type: 'mirror', a: { x: 5, z: -0.7 }, b: { x: 5.7, z: 0 } }, // 45deg face
      { id: 'r1', type: 'receiver', a: { x: 4, z: 5 }, b: { x: 6, z: 5 } },
    ];
    const emitter = { pos: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, color: { r: 0, g: 1, b: 0 } };

    // Act
    const trace = traceBeam(segments, emitter, 8);

    // Assert
    expect(trace.status).toBe('hit-receiver');
    expect(trace.segment.id).toBe('r1');
    expect(trace.color).toEqual({ r: 0, g: 1, b: 0 }); // mirror doesn't alter color
  });

  it('test_traceBeam_exceedsReflectionLimit_stopsAtMaxReflections', () => {
    // Arrange: two facing mirrors bounce the beam back and forth forever.
    const segments = [
      { type: 'mirror', a: { x: 5, z: -1 }, b: { x: 5, z: 1 } },
      { type: 'mirror', a: { x: -5, z: -1 }, b: { x: -5, z: 1 } },
    ];
    const emitter = { pos: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, color: { r: 1, g: 1, b: 1 } };

    // Act
    const trace = traceBeam(segments, emitter, 3);

    // Assert
    expect(trace.status).toBe('max-reflections');
  });

  it('test_traceBeam_filterMatchingPrimary_passesThroughIsolatingColor', () => {
    // Arrange: a yellow (red+green) beam through a red-only filter should
    // continue on, now pure red.
    const segments = [
      { type: 'filter', primary: { r: 1, g: 0, b: 0 }, a: { x: 5, z: -1 }, b: { x: 5, z: 1 } },
      { id: 'r1', type: 'receiver', a: { x: 10, z: -1 }, b: { x: 10, z: 1 } },
    ];
    const emitter = { pos: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, color: { r: 1, g: 1, b: 0 } };

    // Act
    const trace = traceBeam(segments, emitter, 8);

    // Assert
    expect(trace.status).toBe('hit-receiver');
    expect(trace.color).toEqual({ r: 1, g: 0, b: 0 });
  });

  it('test_traceBeam_filterBlockingAllComponents_absorbsBeam', () => {
    // Arrange: a pure blue beam through a red-only filter has nothing left to pass.
    const segments = [{ type: 'filter', primary: { r: 1, g: 0, b: 0 }, a: { x: 5, z: -1 }, b: { x: 5, z: 1 } }];
    const emitter = { pos: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, color: { r: 0, g: 0, b: 1 } };

    // Act
    const trace = traceBeam(segments, emitter, 8);

    // Assert
    expect(trace.status).toBe('absorbed-filter');
  });
});

describe('composeReceiverColor', () => {
  it('test_composeReceiverColor_twoConvergingBeams_addsColorsTogether', () => {
    // Arrange: red and blue beams both hitting receiver r1 compose to magenta.
    const traces = [
      { status: 'hit-receiver', segment: { id: 'r1' }, color: { r: 1, g: 0, b: 0 } },
      { status: 'hit-receiver', segment: { id: 'r1' }, color: { r: 0, g: 0, b: 1 } },
      { status: 'hit-receiver', segment: { id: 'r2' }, color: { r: 0, g: 1, b: 0 } }, // different receiver, ignored
    ];

    // Act
    const result = composeReceiverColor(traces, 'r1');

    // Assert
    expect(result.composed).toEqual({ r: 1, g: 0, b: 1 });
    expect(result.hitCount).toBe(2);
  });

  it('test_composeReceiverColor_noHits_returnsBlackWithZeroCount', () => {
    // Arrange
    const traces = [{ status: 'blocked', segment: { id: 'r1' }, color: { r: 1, g: 0, b: 0 } }];

    // Act
    const result = composeReceiverColor(traces, 'r1');

    // Assert
    expect(result.composed).toEqual({ r: 0, g: 0, b: 0 });
    expect(result.hitCount).toBe(0);
  });
});

describe('isReceiverSatisfied', () => {
  it('test_isReceiverSatisfied_composedMatchesTargetWithHits_returnsTrue', () => {
    expect(isReceiverSatisfied({ r: 1, g: 0, b: 1 }, { r: 1, g: 0, b: 1 }, 2)).toBe(true);
  });

  it('test_isReceiverSatisfied_composedDoesNotMatchTarget_returnsFalse', () => {
    expect(isReceiverSatisfied({ r: 1, g: 0, b: 0 }, { r: 1, g: 0, b: 1 }, 1)).toBe(false);
  });

  it('test_isReceiverSatisfied_zeroHitsEvenIfColorsCoincidentallyMatch_returnsFalse', () => {
    // No beam is hitting at all — composed is {0,0,0}, which must never
    // "satisfy" a (nonsensical) black target just because it matches.
    expect(isReceiverSatisfied({ r: 0, g: 0, b: 0 }, { r: 0, g: 0, b: 0 }, 0)).toBe(false);
  });
});

describe('colorToHex', () => {
  it('test_colorToHex_allThreePrimaries_isWhite', () => {
    expect(colorToHex({ r: 1, g: 1, b: 1 })).toBe(0xffffff);
  });

  it('test_colorToHex_redAndGreen_isYellow', () => {
    expect(colorToHex({ r: 1, g: 1, b: 0 })).toBe(0xffff00);
  });

  it('test_colorToHex_pureBlue_isBlue', () => {
    expect(colorToHex({ r: 0, g: 0, b: 1 })).toBe(0x0000ff);
  });
});
