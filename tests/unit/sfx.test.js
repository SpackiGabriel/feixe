// The door-motor hum's reference count (src/presentation/sfx.js). Runs
// without Web Audio: the count is kept even when no AudioContext exists.
import { describe, it, expect, beforeEach } from 'vitest';
import { createEvents } from '../../src/core/events.js';
import { connectSfx, getMotorUsers, motorReset } from '../../src/presentation/sfx.js';

describe('door motor hum', () => {
  let events;
  beforeEach(() => {
    motorReset();
    events = createEvents();
    connectSfx(events);
  });

  it('test_motor_moveThenSettle_returnsToSilent', () => {
    events.emit('door:moving', {});
    expect(getMotorUsers()).toBe(1);
    events.emit('door:settled', { opening: true });
    expect(getMotorUsers()).toBe(0);
  });

  // Regression (Orca review, 2026-11-16): R or an exit while a door was
  // still moving disposed it without 'door:settled', so the hum never
  // stopped for the rest of the session.
  it('test_motor_levelReloadedMidMove_resetsToSilent', () => {
    events.emit('door:moving', {});
    events.emit('door:moving', {});
    events.emit('level:enter', { index: 0, count: 10 });
    expect(getMotorUsers()).toBe(0);
  });
});
