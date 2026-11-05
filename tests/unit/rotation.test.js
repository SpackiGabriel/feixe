import { describe, it, expect } from 'vitest';
import { createSteppedAngle } from '../../src/gameplay/rotation.js';
import { mouseDeltaToManipulation, keyRotationStep } from '../../src/core/manipulation.js';
import { railAxis } from '../../src/gameplay/rail.js';

const DEG = Math.PI / 180;

describe('createSteppedAngle', () => {
  it('test_steppedAngle_free_addsDeltaDirectly', () => {
    const angle = createSteppedAngle(0, null);
    expect(angle.add(0.3)).toBeCloseTo(0.3);
  });

  it('test_steppedAngle_manySmallDeltas_accumulateIntoOneStep', () => {
    const angle = createSteppedAngle(0, 45);
    let value = 0;
    for (let i = 0; i < 70; i++) value = angle.add(0.01); // 0.7 rad ≈ 40°, past the 22.5° midpoint
    expect(value).toBeCloseTo(45 * DEG);
  });

  it('test_steppedAngle_smallDelta_staysOnCurrentStep', () => {
    const angle = createSteppedAngle(0, 45);
    expect(angle.add(0.01)).toBe(0);
  });
});

describe('mouseDeltaToManipulation', () => {
  it('test_mouse_rotationOnly_rotates', () => {
    const r = mouseDeltaToManipulation({ positionEnabled: false, rotationEnabled: true }, 10);
    expect(r.position).toBe(0);
    expect(r.rotation).toBeGreaterThan(0);
  });

  it('test_mouse_bothEnabled_onlySlides_neverRotates', () => {
    const r = mouseDeltaToManipulation({ positionEnabled: true, rotationEnabled: true }, 10);
    expect(r.position).toBeGreaterThan(0);
    expect(r.rotation).toBe(0);
  });

  it('test_keyStep_usesObjectStep_whenSnapping', () => {
    expect(keyRotationStep({ rotationStep: 45 * DEG })).toBeCloseTo(45 * DEG);
    expect(keyRotationStep({ rotationStep: null })).toBeCloseTo(15 * DEG);
  });
});

describe('screen-relative rail drag', () => {
  const along = (x, z) => ({ positionEnabled: true, rotationEnabled: false, railAxis: railAxis({ x: 0, z: 0 }, { x, z }) });

  it('test_drag_railAlongX_cameraFacingNorth_mouseRightMovesTowardEnd', () => {
    expect(mouseDeltaToManipulation(along(4, 0), 10, 0, 0).position).toBeGreaterThan(0);
  });

  it('test_drag_railAlongX_cameraFacingSouth_mouseRightMovesTowardStart', () => {
    expect(mouseDeltaToManipulation(along(4, 0), 10, 0, Math.PI).position).toBeLessThan(0);
  });

  it('test_drag_railPointingAway_mouseUpMovesAway', () => {
    expect(mouseDeltaToManipulation(along(0, -4), 0, -10, 0).position).toBeGreaterThan(0);
  });

  it('test_drag_sameMouse_longerRail_smallerFraction', () => {
    expect(mouseDeltaToManipulation(along(8, 0), 10).position).toBeCloseTo(mouseDeltaToManipulation(along(2, 0), 10).position / 4);
  });
});
