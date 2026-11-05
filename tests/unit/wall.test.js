import { describe, it, expect } from 'vitest';
import { wallPlacement } from '../../src/gameplay/wall.js';
import { segmentFromCenter } from '../../src/gameplay/aabb.js';

describe('wallPlacement', () => {
  it.each([
    [{ x: -5, z: 0 }, { x: 5, z: 0 }],
    [{ x: 1, z: -2 }, { x: 1, z: 3 }],
    [{ x: 2, z: 2 }, { x: -1, z: -2 }],
  ])('test_wallPlacement_%o_to_%o_roundTripsThroughSegmentFromCenter', (from, to) => {
    const { center, length, rotationY } = wallPlacement(from, to);
    const seg = segmentFromCenter(center, rotationY, length);
    expect(seg.a.x).toBeCloseTo(from.x);
    expect(seg.a.z).toBeCloseTo(from.z);
    expect(seg.b.x).toBeCloseTo(to.x);
    expect(seg.b.z).toBeCloseTo(to.z);
  });
});
