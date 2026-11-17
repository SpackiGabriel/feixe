import { describe, it, expect } from 'vitest';
import { loadQuality, saveQuality, pixelRatioFor } from '../../src/presentation/quality.js';

function fakeStorage() {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

describe('quality', () => {
  it('test_quality_defaultsToHigh_andPersists', () => {
    const storage = fakeStorage();
    expect(loadQuality(storage)).toBe('high');
    saveQuality('low', storage);
    expect(loadQuality(storage)).toBe('low');
  });

  it('test_quality_unknownValue_fallsBackToHigh', () => {
    const storage = fakeStorage();
    storage.setItem('feixe.quality', 'ultra');
    expect(loadQuality(storage)).toBe('high');
  });

  it('test_pixelRatio_cappedByQuality', () => {
    expect(pixelRatioFor('high', 3, 1000, 600)).toBe(1.5);
    expect(pixelRatioFor('low', 3, 1000, 600)).toBe(1);
    expect(pixelRatioFor('high', 1, 1000, 600)).toBe(1);
  });

  it('test_pixelRatio_largeWindow_staysWithinPixelBudget', () => {
    const ratio = pixelRatioFor('high', 1.5, 1920, 1080);
    expect(1920 * 1080 * ratio * ratio).toBeLessThanOrEqual(2.1e6 + 1);
  });
});
