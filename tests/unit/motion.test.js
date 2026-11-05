import { describe, it, expect } from 'vitest';
import { damp, easeInOutCubic, easeOutBack, easeOutCubic, clamp01 } from '../../src/presentation/motion.js';
import { createEvents } from '../../src/core/events.js';

describe('motion', () => {
  it('test_easings_startAtZeroEndAtOne', () => {
    for (const f of [easeInOutCubic, easeOutBack, easeOutCubic]) {
      expect(f(0)).toBeCloseTo(0);
      expect(f(1)).toBeCloseTo(1);
    }
  });

  it('test_damp_isFrameRateIndependent', () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = damp(a, 1, 5, 1 / 60);
    let b = 0;
    for (let i = 0; i < 30; i++) b = damp(b, 1, 5, 1 / 30);
    expect(a).toBeCloseTo(b, 6);
  });

  it('test_clamp01', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });
});

describe('events', () => {
  it('test_events_emitReachesListeners_andUnsubscribeStops', () => {
    const bus = createEvents();
    const got = [];
    const off = bus.on('x', (p) => got.push(p));
    bus.emit('x', 1);
    off();
    bus.emit('x', 2);
    bus.emit('nobody-listens', 3);
    expect(got).toEqual([1]);
  });
});
