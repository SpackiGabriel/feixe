import { describe, it, expect } from 'vitest';
import { rotatedRectAABB } from '../../src/gameplay/aabb.js';

describe('rotatedRectAABB', () => {
  it('test_rotatedRectAABB_axisAligned_matchesWidthAndDepthDirectly', () => {
    // Arrange: rotationY=0 — width runs along X, depth along Z, no rotation.
    const position = { x: 2, z: -3 };

    // Act
    const box = rotatedRectAABB(position, 0, 2, 0.2);

    // Assert
    expect(box.minX).toBeCloseTo(1, 5);
    expect(box.maxX).toBeCloseTo(3, 5);
    expect(box.minZ).toBeCloseTo(-3.1, 5);
    expect(box.maxZ).toBeCloseTo(-2.9, 5);
  });

  it('test_rotatedRectAABB_quarterTurn_swapsWidthAndDepthAxes', () => {
    // Arrange: rotated 90 degrees — the "width" now runs along Z instead of X.
    const position = { x: 0, z: 0 };

    // Act
    const box = rotatedRectAABB(position, Math.PI / 2, 2, 0.2);

    // Assert
    expect(box.minX).toBeCloseTo(-0.1, 5);
    expect(box.maxX).toBeCloseTo(0.1, 5);
    expect(box.minZ).toBeCloseTo(-1, 5);
    expect(box.maxZ).toBeCloseTo(1, 5);
  });

  it('test_rotatedRectAABB_fortyFiveDegrees_boundsBothCorners', () => {
    // Arrange: a square rotated 45 degrees has an AABB half-diagonal in
    // both axes — sqrt(2)/2 * side, for a 1x1 square.
    const position = { x: 0, z: 0 };

    // Act
    const box = rotatedRectAABB(position, Math.PI / 4, 1, 1);

    // Assert
    const half = Math.SQRT2 / 2;
    expect(box.maxX).toBeCloseTo(half, 5);
    expect(box.maxZ).toBeCloseTo(half, 5);
  });
});
