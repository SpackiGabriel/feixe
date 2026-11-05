import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { loadReflectionsOn, saveReflectionsOn, showReflections, createMirrorReflection, REFLECTOR_LAYER } from '../../src/presentation/mirror-reflection.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) };
}

describe('mirror reflections setting', () => {
  it('is on by default and round-trips through storage', () => {
    const storage = memoryStorage();
    expect(loadReflectionsOn(storage)).toBe(true);
    saveReflectionsOn(false, storage);
    expect(loadReflectionsOn(storage)).toBe(false);
    saveReflectionsOn(true, storage);
    expect(loadReflectionsOn(storage)).toBe(true);
  });

  it('defaults to on without storage', () => {
    expect(loadReflectionsOn(null)).toBe(true);
  });

  it('shows and hides the reflector layer on the player camera', () => {
    const camera = new THREE.PerspectiveCamera();
    const probe = new THREE.Layers();
    probe.set(REFLECTOR_LAYER);
    showReflections(camera, false);
    expect(camera.layers.test(probe)).toBe(false);
    showReflections(camera, true);
    expect(camera.layers.test(probe)).toBe(true);
  });

  it('creates nothing while disabled (headless default)', () => {
    expect(createMirrorReflection(1, 1, 0.05)).toBeNull();
  });
});
