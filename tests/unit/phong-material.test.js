import { describe, it, expect, afterEach } from 'vitest';
import * as THREE from 'three';
import { createPhongMaterial, setShadingMode, toggleShadingMode, getShadingMode, PHONG } from '../../src/presentation/phong-material.js';

const make = (map = new THREE.Texture()) => createPhongMaterial({ map, ...PHONG.wall });

describe('createPhongMaterial', () => {
  afterEach(() => setShadingMode('fragment'));

  it('test_createPhongMaterial_coefficients_becomeShaderUniforms', () => {
    const material = make();
    expect(material.uniforms.uKa.value).toBe(PHONG.wall.ka);
    expect(material.uniforms.uKd.value).toBe(PHONG.wall.kd);
    expect(material.uniforms.uKs.value).toBe(PHONG.wall.ks);
    expect(material.uniforms.uShininess.value).toBe(PHONG.wall.shininess);
  });

  it('test_createPhongMaterial_usesSceneLightsAndFog', () => {
    const material = make();
    expect(material.lights).toBe(true);
    expect(material.fog).toBe(true);
    expect(material.uniforms).toHaveProperty('pointLights');
    expect(material.uniforms).toHaveProperty('hemisphereLights');
  });

  it('test_createPhongMaterial_textureRepeat_isAppliedThroughUvTransform', () => {
    const map = new THREE.Texture();
    map.repeat.set(10, 10);
    const material = make(map);
    const m = material.uniforms.uvTransform.value.elements;
    expect(m[0]).toBeCloseTo(10);
    expect(m[4]).toBeCloseTo(10);
    expect(material.uniforms.map.value).toBe(map);
  });

  it('test_setShadingMode_vertex_definesPerVertexAndRecompiles', () => {
    const material = make();
    const version = material.version;
    setShadingMode('vertex');
    expect(material.defines).toHaveProperty('PER_VERTEX');
    expect(material.version).toBeGreaterThan(version);
  });

  it('test_toggleShadingMode_twice_returnsToPerFragment', () => {
    const material = make();
    expect(toggleShadingMode()).toBe('vertex');
    expect(toggleShadingMode()).toBe('fragment');
    expect(getShadingMode()).toBe('fragment');
    expect(material.defines).not.toHaveProperty('PER_VERTEX');
  });
});
