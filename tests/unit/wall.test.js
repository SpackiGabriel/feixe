import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { wallPlacement, createWall, GLASS_PANE_THICKNESS } from '../../src/gameplay/wall.js';
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
    // The scale lives in the hand-composed matrix (T·R·S), not mesh.scale.
    const scale = new THREE.Vector3();
    mesh.matrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
    expect(mesh.matrixAutoUpdate).toBe(false);
    expect(scale.x).toBeCloseTo(4);
    expect(scale.y).toBeCloseTo(2.5);
    expect(scale.z).toBeCloseTo(0.3);
  });

  // Regression (owner, 2026-11-16): a full-size transparent glass box put
  // faces on the floor, ceiling and room walls and smeared over them.
  it('test_createWall_glass_isAThinPaneInsetFromFloorCeilingAndEnds', () => {
    const wall = createWall({ from: [-5, 2], to: [-1, 2], material, style: 'glass' });
    wall.mesh.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(wall.mesh);
    expect(box.min.y).toBeGreaterThan(0);
    expect(box.max.y).toBeLessThan(3);
    expect(box.min.x).toBeGreaterThan(-5); // not on the west room wall's plane
    expect(box.max.x).toBeLessThan(-1);
    expect(box.max.z - box.min.z).toBeCloseTo(GLASS_PANE_THICKNESS);
    // Collision keeps the level data's 0.2 m thickness.
    expect(wall.collider.maxZ - wall.collider.minZ).toBeCloseTo(0.2);
  });

  it('test_createWall_solid_fillsFloorToCeiling', () => {
    const wall = createWall({ from: [-5, 2], to: [-1, 2], material });
    wall.mesh.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(wall.mesh);
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.y).toBeCloseTo(3);
    expect(box.max.z - box.min.z).toBeCloseTo(0.2);
  });

  it('test_createWall_wrongOrder_isRevertible', () => {
    const wall = createWall({ from: [-2, -5], to: [-2, -1], material });
    const right = [...wall.mesh.matrix.elements];
    expect(wall.setOrder('TSR')).toBe(true);
    expect(wall.mesh.matrix.elements).not.toEqual(right);
    expect(wall.setOrder('TRS')).toBe(true);
    expect(wall.mesh.matrix.elements).toEqual(right);
  });

  it('test_createWall_eastWestWall_reportsOrderUnchanged', () => {
    const wall = createWall({ from: [-5, 0], to: [2.5, 0], material });
    const right = [...wall.mesh.matrix.elements];
    expect(wall.setOrder('TSR')).toBe(false);
    expect(wall.mesh.matrix.elements).toEqual(right);
  });

  it('test_createWall_wrongOrder_keepsAimOccluderAtRealWall', () => {
    const wall = createWall({ from: [-2, -5], to: [-2, -1], material });
    expect(wall.setOrder('TSR')).toBe(true);
    wall.mesh.updateMatrixWorld();

    const throughReal = new THREE.Raycaster(new THREE.Vector3(-4, 1.5, -4), new THREE.Vector3(1, 0, 0));
    expect(throughReal.intersectObject(wall.occluder, false).length).toBeGreaterThan(0);
    expect(throughReal.intersectObject(wall.mesh, false)).toHaveLength(0);

    const throughWrongMesh = new THREE.Raycaster(new THREE.Vector3(-0.5, 1.5, -5), new THREE.Vector3(0, 0, 1));
    expect(throughWrongMesh.intersectObject(wall.mesh, false).length).toBeGreaterThan(0);
    expect(throughWrongMesh.intersectObject(wall.occluder, false)).toHaveLength(0);
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
