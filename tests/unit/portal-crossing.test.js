import { describe, it, expect } from 'vitest';
import { isPlayerAtPortal, computePortalLanding } from '../../src/levels/portal-crossing.js';

describe('isPlayerAtPortal', () => {
  it('test_isPlayerAtPortal_playerWithinRadius_returnsTrue', () => {
    expect(isPlayerAtPortal({ playerX: 0, playerZ: -4.5, portalX: 0, portalZ: -5, radius: 0.8 })).toBe(true);
  });

  it('test_isPlayerAtPortal_playerBeyondRadius_returnsFalse', () => {
    expect(isPlayerAtPortal({ playerX: 0, playerZ: 0, portalX: 0, portalZ: -5, radius: 0.8 })).toBe(false);
  });

  it('test_isPlayerAtPortal_playerExactlyAtRadius_returnsTrue', () => {
    expect(isPlayerAtPortal({ playerX: 0.8, playerZ: 0, portalX: 0, portalZ: 0, radius: 0.8 })).toBe(true);
  });
});

describe('computePortalLanding', () => {
  it('test_computePortalLanding_facingNegativeZ_pushesOutAlongItsFacing', () => {
    // Arrange: linked portal's rotationY=0 means it faces -Z (same
    // convention as a mirror/emitter's rotationY — see mirror.js), so the
    // player should land pushed further in -Z, out through its front.
    // Act
    const landing = computePortalLanding({
      linkedX: 0,
      linkedZ: -5,
      linkedRotationY: 0,
      exitRotationDelta: 0,
      playerYaw: 0,
      clearance: 0.8,
    });

    // Assert
    expect(landing.x).toBeCloseTo(0, 5);
    expect(landing.z).toBeCloseTo(-5 - 0.8, 5);
    expect(landing.yaw).toBeCloseTo(0, 5);
  });

  it('test_computePortalLanding_nonZeroDelta_addsToPlayerYaw', () => {
    // Act
    const landing = computePortalLanding({
      linkedX: 3,
      linkedZ: 3,
      linkedRotationY: Math.PI,
      exitRotationDelta: Math.PI / 2,
      playerYaw: 0.4,
      clearance: 0.5,
    });

    // Assert
    expect(landing.yaw).toBeCloseTo(0.4 + Math.PI / 2, 5);
  });
});
