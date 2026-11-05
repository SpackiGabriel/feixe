import { describe, it, expect } from 'vitest';
import { isSpuriousDelta } from '../../src/core/input.js';
import { loadSensitivity, saveSensitivity, stepSensitivity, SENSITIVITY_STEPS } from '../../src/core/look.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) };
}

describe('mouse spike filter', () => {
  it('keeps ordinary deltas, including fast flicks', () => {
    expect(isSpuriousDelta(0, 0)).toBe(false);
    expect(isSpuriousDelta(-120, 40)).toBe(false);
    expect(isSpuriousDelta(250, -250)).toBe(false);
  });

  it('drops the huge one-event jumps that flick the camera', () => {
    expect(isSpuriousDelta(900, 3)).toBe(true);
    expect(isSpuriousDelta(2, -640)).toBe(true);
  });

  it('drops non-numeric deltas', () => {
    expect(isSpuriousDelta(NaN, 0)).toBe(true);
    expect(isSpuriousDelta(0, undefined)).toBe(true);
  });
});

describe('look sensitivity setting', () => {
  it('defaults to 1× and round-trips through storage', () => {
    const storage = memoryStorage();
    expect(loadSensitivity(storage)).toBe(1);
    saveSensitivity(1.5, storage);
    expect(loadSensitivity(storage)).toBe(1.5);
  });

  it('ignores garbage and missing storage', () => {
    const storage = memoryStorage();
    storage.setItem('feixe.sensitivity', '7');
    expect(loadSensitivity(storage)).toBe(1);
    expect(loadSensitivity(null)).toBe(1);
  });

  it('steps through the list and clamps at the ends', () => {
    expect(stepSensitivity(1, 1)).toBe(1.25);
    expect(stepSensitivity(1, -1)).toBe(0.85);
    expect(stepSensitivity(SENSITIVITY_STEPS.at(-1), 1)).toBe(SENSITIVITY_STEPS.at(-1));
    expect(stepSensitivity(SENSITIVITY_STEPS[0], -1)).toBe(SENSITIVITY_STEPS[0]);
    expect(stepSensitivity(1, -Infinity)).toBe(SENSITIVITY_STEPS[0]);
  });
});
