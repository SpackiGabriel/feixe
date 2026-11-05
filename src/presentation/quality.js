// Graphics quality: 'high' (metal reflections, up to 1.5×
// pixel ratio) or 'low' (none of those, 1× pixels) for a modest
// presentation machine. Persisted per browser.
const KEY = 'feixe.quality';
const VALUES = ['high', 'low'];

export function loadQuality(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem(KEY);
    return VALUES.includes(value) ? value : 'high';
  } catch {
    return 'high';
  }
}

export function saveQuality(value, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, value);
  } catch {
    // private mode: the setting still applies for this session
  }
}

// Caps rendering by a pixel budget, not just a ratio: fill rate is what
// limits a modest GPU (measured on a Radeon 610M: ~13 ms at 1920×1080,
// ~30 ms at 1.5× that). High ≈ 1080p worth of pixels, low ≈ 1.2 MP.
const BUDGET = { high: 2.1e6, low: 1.2e6 };
const MAX_RATIO = { high: 1.5, low: 1 };

export function pixelRatioFor(quality, devicePixelRatio, width = 1280, height = 720) {
  const level = quality === 'low' ? 'low' : 'high';
  const fit = Math.sqrt(BUDGET[level] / Math.max(1, width * height));
  return Math.max(0.5, Math.min(devicePixelRatio || 1, MAX_RATIO[level], fit));
}
