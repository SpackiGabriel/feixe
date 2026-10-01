// index.html loads Three.js from a CDN import map (docs/decisions/0001) while
// tests run against the npm copy — they must be the same version, or tests
// could pass against an API the shipped game doesn't have.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('three version', () => {
  it('test_threeVersion_importMapMatchesPackageJson', () => {
    const cdnVersion = read('../../index.html').match(/three@([\d.]+)\/build/)?.[1];
    const pinned = JSON.parse(read('../../package.json')).devDependencies.three;
    expect(cdnVersion).toBeDefined();
    expect(cdnVersion).toBe(pinned);
  });
});
