import { describe, it, expect } from 'vitest';
import { routeConduit } from '../../src/presentation/conduits.js';

describe('routeConduit', () => {
  it('test_route_isAxisAlignedL_endingAtDoor', () => {
    const { points, length } = routeConduit({ x: -4.9, z: 0 }, { x: 0, z: -4.9 });
    expect(points).toEqual([{ x: -4.9, z: 0 }, { x: 0, z: 0 }, { x: 0, z: -4.9 }]);
    expect(length).toBeCloseTo(9.8);
    for (let i = 1; i < points.length; i++) {
      const axisAligned = points[i].x === points[i - 1].x || points[i].z === points[i - 1].z;
      expect(axisAligned).toBe(true);
    }
  });

  it('test_route_lanes_endSideBySide', () => {
    const a = routeConduit({ x: 3, z: 2 }, { x: 0, z: -4.9 }, -0.5).points.at(-1);
    const b = routeConduit({ x: -3, z: 2 }, { x: 0, z: -4.9 }, 0.5).points.at(-1);
    expect(a.x).not.toBeCloseTo(b.x);
    expect(a.z).toBe(b.z);
  });

  it('test_route_straightLine_hasTwoPoints', () => {
    expect(routeConduit({ x: 0, z: 3 }, { x: 0, z: -4.9 }).points).toHaveLength(2);
  });
});
