// Our hand-written matrices (src/core/matrix.js) against Three.js's own:
// same translation/rotation/scale composition, same view matrix, same
// perspective projection and the same point after the divide by w.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  rotationY, multiply, transformPoint, composeTRS, composeTSR, viewMatrix, perspective, projectPoint,
} from '../../src/core/matrix.js';
import { rotateXZ } from '../../src/gameplay/laser.js';

const expectMatrixClose = (actual, expected) => {
  for (let i = 0; i < 16; i++) expect(actual[i], `element ${i}`).toBeCloseTo(expected[i], 9);
};

describe('composeTRS', () => {
  it.each([
    [[1, 2, 3], 0.3, [4, 3, 0.2]],
    [[-2, 1.5, -3], Math.PI / 2, [4, 3, 0.2]],
    [[0, 0, 0], -2.1, [1, 2, 0.5]],
  ])('test_composeTRS_%o_%f_%o_matchesThreeCompose', (t, angle, s) => {
    const three = new THREE.Matrix4().compose(
      new THREE.Vector3(...t),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0)),
      new THREE.Vector3(...s),
    );
    expectMatrixClose(composeTRS(t, angle, s), three.elements);
  });

  it('test_composeTSR_nonUniformScaleAt45Degrees_differsFromTRS', () => {
    const trs = composeTRS([0, 0, 0], Math.PI / 4, [4, 1, 0.2]);
    const tsr = composeTSR([0, 0, 0], Math.PI / 4, [4, 1, 0.2]);
    // The box's local +X corner: T·R·S keeps it 2 m from the centre
    // (half the 4 m length); T·S·R stretches it along world X instead.
    const [x1, , z1] = transformPoint(trs, [0.5, 0, 0]);
    const [x2, , z2] = transformPoint(tsr, [0.5, 0, 0]);
    expect(Math.hypot(x1, z1)).toBeCloseTo(2);
    expect(Math.hypot(x2, z2)).not.toBeCloseTo(2);
  });

  it('test_composeTSR_at90Degrees_looksUnrotated', () => {
    // A unit box is symmetric under 90°, so rotating it first changes
    // nothing visible and the world-axis scale lays the wall east-west.
    const tsr = composeTSR([0, 0, 0], Math.PI / 2, [4, 1, 0.2]);
    const [x, , z] = transformPoint(tsr, [0, 0, 0.5]); // local +Z face → world +X
    expect(Math.abs(x)).toBeCloseTo(2);
    expect(z).toBeCloseTo(0);
  });
});

describe('rotationY', () => {
  it('test_rotationY_point_matchesLaserRotateXZ', () => {
    const angle = 0.7;
    const [x, , z] = transformPoint(rotationY(angle), [1.5, 0, -0.4]);
    const expected = rotateXZ({ x: 1.5, z: -0.4 }, angle);
    expect(x).toBeCloseTo(expected.x);
    expect(z).toBeCloseTo(expected.z);
  });
});

describe('multiply', () => {
  it('test_multiply_order_matchesThreeMultiply', () => {
    const a = composeTRS([1, 2, 3], 0.4, [2, 1, 1]);
    const b = composeTRS([-1, 0, 2], -1.1, [1, 3, 0.5]);
    const three = new THREE.Matrix4().fromArray(a).multiply(new THREE.Matrix4().fromArray(b));
    expectMatrixClose(multiply(a, b), three.elements);
  });
});

function makeCamera() {
  const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 100);
  camera.position.set(1.2, 1.6, 3.4);
  camera.rotation.set(-0.25, 0.8, 0, 'YXZ'); // pitch, yaw — as look.js sets them
  camera.updateMatrixWorld();
  return camera;
}

describe('viewMatrix', () => {
  it('test_viewMatrix_yawPitch_matchesThreeMatrixWorldInverse', () => {
    const camera = makeCamera();
    const view = viewMatrix(camera.position.toArray(), camera.rotation.x, camera.rotation.y, camera.rotation.z);
    expectMatrixClose(view, camera.matrixWorldInverse.elements);
  });
});

describe('perspective', () => {
  it('test_perspective_70deg_matchesThreeProjectionMatrix', () => {
    const camera = makeCamera();
    expectMatrixClose(perspective(70, 16 / 9, 0.1, 100), camera.projectionMatrix.elements);
  });
});

describe('projectPoint', () => {
  it('test_projectPoint_worldPoint_matchesThreeVector3Project', () => {
    const camera = makeCamera();
    const point = [-1, 1.2, -2.5];
    const { ndc } = projectPoint(perspective(70, 16 / 9, 0.1, 100), viewMatrix(camera.position.toArray(), camera.rotation.x, camera.rotation.y), point);
    const three = new THREE.Vector3(...point).project(camera);
    expect(ndc[0]).toBeCloseTo(three.x, 9);
    expect(ndc[1]).toBeCloseTo(three.y, 9);
    expect(ndc[2]).toBeCloseTo(three.z, 9);
  });

  it('test_projectPoint_w_isDistanceInFrontOfCamera', () => {
    // Camera at the origin looking down −Z: w = −z_view = the depth.
    const { w } = projectPoint(perspective(70, 1, 0.1, 100), viewMatrix([0, 0, 0], 0, 0), [0, 0, -7]);
    expect(w).toBeCloseTo(7);
  });

  it('test_projectPoint_twiceAsFar_halfTheScreenOffset', () => {
    // The foreshortening comes from the divide by w.
    const projection = perspective(70, 1, 0.1, 100);
    const view = viewMatrix([0, 0, 0], 0, 0);
    const near = projectPoint(projection, view, [1, 0, -4]).ndc[0];
    const far = projectPoint(projection, view, [1, 0, -8]).ndc[0];
    expect(far).toBeCloseTo(near / 2);
  });
});
