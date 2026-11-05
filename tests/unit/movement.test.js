import { describe, it, expect } from 'vitest';
import { createMovementController } from '../../src/core/movement.js';

function setup(colliders, x, z) {
  const camera = { position: { x, z }, rotation: { y: 0 } }; // yaw 0: W moves toward -Z
  const keys = new Set(['KeyW']);
  return { camera, movement: createMovementController(camera, keys, [], () => colliders) };
}

describe('movement collision', () => {
  const door = { minX: -1, maxX: 1, minZ: 1.925, maxZ: 2.075 };

  it('test_movement_wallAhead_blocksForwardMove', () => {
    const { camera, movement } = setup([door], 0, 2.6);
    for (let i = 0; i < 30; i++) movement.update(0.016);
    expect(camera.position.z).toBeGreaterThan(2.075 + 0.34);
  });

  it('test_movement_doorClosedOnPlayer_playerCanStillWalkOut', () => {
    const { camera, movement } = setup([door], 0, 1.85); // overlapping the shut door
    for (let i = 0; i < 30; i++) movement.update(0.016);
    expect(camera.position.z).toBeLessThan(1.5);
  });
});
