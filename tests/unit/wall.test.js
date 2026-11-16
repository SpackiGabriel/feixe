import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { wallPlacement, createWall } from '../../src/gameplay/wall.js';
import { segmentFromCenter } from '../../src/gameplay/aabb.js';

describe('createWall', () => {
  const material = new THREE.MeshBasicMaterial();

  it('test_createWall_anySize_isTheUnitBaseMeshScaledFromLevelData', () => {
    const { mesh } = createWall({ from: [-5, 2], to: [-1, 2], height: 2.5, thickness: 0.3, material });
    mesh.geometry.computeBoundingBox();
    const local = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
    expect(local.x).toBeCloseTo(1);
    expect(local.y).toBeCloseTo(1);
    expect(local.z).toBeCloseTo(1);
    expect(mesh.scale.x).toBeCloseTo(4);
    expect(mesh.scale.y).toBeCloseTo(2.5);
    expect(mesh.scale.z).toBeCloseTo(0.3);
  });

  it('test_createWall_northSouthWall_worldBoundsMatchItsEndpoints', () => {
    const { mesh } = createWall({ from: [-2, -5], to: [-2, -1], material }); // default height 3, thickness 0.2
    mesh.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(mesh);
    expect(box.min.x).toBeCloseTo(-2.1);
    expect(box.max.x).toBeCloseTo(-1.9);
    expect(box.min.z).toBeCloseTo(-5);
    expect(box.max.z).toBeCloseTo(-1);
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.y).toBeCloseTo(3);
  });
});

describe('wallPlacement', () => {
  it.each([
    [{ x: -5, z: 0 }, { x: 5, z: 0 }],
    [{ x: 1, z: -2 }, { x: 1, z: 3 }],
    [{ x: 2, z: 2 }, { x: -1, z: -2 }],
  ])('test_wallPlacement_%o_to_%o_roundTripsThroughSegmentFromCenter', (from, to) => {
    const { center, length, rotationY } = wallPlacement(from, to);
    const seg = segmentFromCenter(center, rotationY, length);
    expect(seg.a.x).toBeCloseTo(from.x);
    expect(seg.a.z).toBeCloseTo(from.z);
    expect(seg.b.x).toBeCloseTo(to.x);
    expect(seg.b.z).toBeCloseTo(to.z);
  });
});
