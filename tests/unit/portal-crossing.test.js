import { describe, it, expect } from 'vitest';
import { isPlayerAtPortal, computePortalLanding } from '../../src/levels/portal-crossing.js';

describe('isPlayerAtPortal', () => {
  const DOOR = { halfWidth: 0.9, depth: 0.7 };

  it('test_isPlayerAtPortal_centeredInFrontWithinDepth_returnsTrue', () => {
    expect(isPlayerAtPortal({ playerX: 0, playerZ: -0.5, portalX: 0, portalZ: 0, portalRotationY: 0, ...DOOR })).toBe(true);
  });

  it('test_isPlayerAtPortal_offCentreWithinDoorWidth_returnsTrue', () => {
    // The whole point of the doorway: a slightly-off-centre approach still
    // crosses instead of missing a tiny circle and hitting the wall beside it.
    expect(isPlayerAtPortal({ playerX: 0.7, playerZ: 0, portalX: 0, portalZ: 0, portalRotationY: 0, ...DOOR })).toBe(true);
  });

  it('test_isPlayerAtPortal_beyondDoorWidth_returnsFalse', () => {
    // Past the panel's width is wall, not doorway.
    expect(isPlayerAtPortal({ playerX: 1.2, playerZ: 0, portalX: 0, portalZ: 0, portalRotationY: 0, ...DOOR })).toBe(false);
  });

  it('test_isPlayerAtPortal_tooFarAlongNormal_returnsFalse', () => {
    expect(isPlayerAtPortal({ playerX: 0, playerZ: -1.0, portalX: 0, portalZ: 0, portalRotationY: 0, ...DOOR })).toBe(false);
  });

  it('test_isPlayerAtPortal_rotatedPortal_doorAlignsToItsFace', () => {
    // rotationY=90° swaps which axis is the door's width vs. its depth: a
    // player offset along +Z is now across the door's width (in range),
    // while the same offset along +X would be along the (shallower) normal.
    expect(isPlayerAtPortal({ playerX: 0, playerZ: 0.8, portalX: 0, portalZ: 0, portalRotationY: Math.PI / 2, ...DOOR })).toBe(true);
    expect(isPlayerAtPortal({ playerX: 0.8, playerZ: 0, portalX: 0, portalZ: 0, portalRotationY: Math.PI / 2, ...DOOR })).toBe(false);
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
