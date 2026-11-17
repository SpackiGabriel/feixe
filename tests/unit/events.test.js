import { describe, it, expect } from 'vitest';
import { createEvents } from '../../src/core/events.js';

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
