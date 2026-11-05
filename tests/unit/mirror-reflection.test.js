import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { loadReflectionsOn, saveReflectionsOn, showReflections, createMirrorReflection, setMirrorReflections, setReflectionQuality, REFLECTION_QUALITY, REFLECTOR_LAYER } from '../../src/presentation/mirror-reflection.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) };
}

describe('mirror reflections setting', () => {
  it('test_loadReflectionsOn_savedValues_roundTripDefaultOn', () => {
    const storage = memoryStorage();
    expect(loadReflectionsOn(storage)).toBe(true);
    saveReflectionsOn(false, storage);
    expect(loadReflectionsOn(storage)).toBe(false);
    saveReflectionsOn(true, storage);
    expect(loadReflectionsOn(storage)).toBe(true);
  });

  it('test_loadReflectionsOn_noStorage_returnsOn', () => {
    expect(loadReflectionsOn(null)).toBe(true);
  });

  it('test_showReflections_toggle_setsReflectorLayerOnCamera', () => {
    const camera = new THREE.PerspectiveCamera();
    const probe = new THREE.Layers();
    probe.set(REFLECTOR_LAYER);
    showReflections(camera, false);
    expect(camera.layers.test(probe)).toBe(false);
    showReflections(camera, true);
    expect(camera.layers.test(probe)).toBe(true);
  });

  it('test_createMirrorReflection_disabled_returnsNull', () => {
    expect(createMirrorReflection(1, 1, 0.05)).toBeNull();
  });
});

describe('reflection quality follows Qualidade', () => {
  it('test_setReflectionQuality_low_resizesExistingAndNewMirrors', () => {
    setMirrorReflections(true);
    try {
      setReflectionQuality('high');
      const scene = new THREE.Scene();
      const mirror = createMirrorReflection(1, 1, 0.05);
      scene.add(mirror.object);
      const faces = mirror.object.children;
      expect(faces).toHaveLength(2);
      expect(faces[0].getRenderTarget().width).toBe(REFLECTION_QUALITY.high.size);

      setReflectionQuality('low', scene);
      for (const face of faces) {
        expect(face.getRenderTarget().width).toBe(REFLECTION_QUALITY.low.size);
        expect(face.getRenderTarget().samples).toBe(REFLECTION_QUALITY.low.samples);
      }
      const later = createMirrorReflection(1, 1, 0.05);
      expect(later.object.children[0].getRenderTarget().width).toBe(REFLECTION_QUALITY.low.size);
    } finally {
      setMirrorReflections(false);
      setReflectionQuality('high');
    }
  });
});
