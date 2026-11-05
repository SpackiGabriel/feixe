// index.html loads the vendored Three.js copy in vendor/three/ (docs/decisions/0001)
// while tests run against the npm copy — they must be the same release, or
// tests could pass against an API the shipped game doesn't have.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('three version', () => {
  it('test_threeVersion_importMapPointsAtVendoredCopy', () => {
    expect(read('../../index.html')).toContain('"three": "./vendor/three/three.module.js"');
  });

  it('test_threeVersion_vendoredCopyMatchesPackageJson', () => {
    const vendored = read('../../vendor/three/three.core.js').match(/const REVISION = '(\d+)'/)?.[1];
    const pinned = JSON.parse(read('../../package.json')).devDependencies.three; // "0.186.0"
    expect(vendored).toBeDefined();
    expect(`0.${vendored}.0`).toBe(pinned);
  });
});
