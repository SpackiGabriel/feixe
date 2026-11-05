import { describe, it, expect } from 'vitest';
import { createDoorMotion, DOOR_TIMING } from '../../src/presentation/door-motion.js';

const DT = 1 / 60;

function run(motion, unlocked, seconds) {
  const events = [];
  for (let s = 0; s < seconds; s += DT) {
    const e = motion.update(unlocked, DT);
    if (e) events.push(e);
  }
  return events;
}

describe('door motion', () => {
  it('test_doorMotion_unlocked_releasesThenRisesToOpen', () => {
    const m = createDoorMotion();
    const events = run(m, true, DOOR_TIMING.release + DOOR_TIMING.rise + 0.1);
    expect(events).toEqual(['released', 'opened']);
    expect(m.getOpenness()).toBe(1);
    expect(m.isPassable()).toBe(true);
  });

  it('test_doorMotion_duringRelease_staysClosedAndImpassable', () => {
    const m = createDoorMotion();
    run(m, true, DOOR_TIMING.release * 0.8);
    expect(m.getOpenness()).toBe(0);
    expect(m.isPassable()).toBe(false);
  });

  it('test_doorMotion_relockedDuringRelease_neverMoves', () => {
    const m = createDoorMotion();
    run(m, true, DOOR_TIMING.release * 0.5);
    const events = run(m, false, 1);
    expect(events).toEqual([]);
    expect(m.getPhase()).toBe('closed');
  });

  it('test_doorMotion_relockedMidRise_dropsFromCurrentHeight_noJump', () => {
    const m = createDoorMotion();
    run(m, true, DOOR_TIMING.release + DOOR_TIMING.rise * 0.5);
    const before = m.getOpenness();
    expect(before).toBeGreaterThan(0.2);
    m.update(false, DT);
    expect(Math.abs(m.getOpenness() - before)).toBeLessThan(0.05);
    const events = run(m, false, 1);
    expect(events).toContain('closed');
    expect(m.getOpenness()).toBe(0);
  });

  it('test_doorMotion_reUnlockedMidDrop_risesFromCurrentHeight', () => {
    const m = createDoorMotion();
    run(m, true, 2);
    run(m, false, DOOR_TIMING.close * 0.3);
    const mid = m.getOpenness();
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    m.update(true, DT);
    expect(Math.abs(m.getOpenness() - mid)).toBeLessThan(0.05);
    run(m, true, 2);
    expect(m.getOpenness()).toBe(1);
  });

  it('test_doorMotion_rapidToggling_staysInRange', () => {
    const m = createDoorMotion();
    for (let i = 0; i < 600; i++) {
      m.update(i % 23 < 11, DT);
      expect(m.getOpenness()).toBeGreaterThanOrEqual(0);
      expect(m.getOpenness()).toBeLessThanOrEqual(1);
    }
  });
});
