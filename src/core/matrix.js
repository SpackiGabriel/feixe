// Hand-written 4×4 matrices (enunciado §3, axes I and II): translation,
// rotation, scale, their composition, the camera's view matrix and the
// perspective projection, plus the divide by w. Pure — no Three.js — and
// checked against Three's own results in tests/unit/matrix.test.js.
//
// Layout: column-major, like WebGL and THREE.Matrix4.elements, so
// m[col * 4 + row]; a point is a column vector (x, y, z, w) multiplied on
// the right: p' = M · p. Composition reads right to left: in T · R · S the
// point is scaled first, then rotated, then translated.

export function identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function translation(x, y, z) {
  const m = identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

export function scaling(x, y, z) {
  const m = identity();
  m[0] = x;
  m[5] = y;
  m[10] = z;
  return m;
}

// Rotation about X:  | 1  0   0 |
//                    | 0  c  -s |
//                    | 0  s   c |
export function rotationX(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const m = identity();
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  return m;
}

// Rotation about Y:  |  c  0  s |
//                    |  0  1  0 |
//                    | -s  0  c |
export function rotationY(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const m = identity();
  m[0] = c;
  m[2] = -s;
  m[8] = s;
  m[10] = c;
  return m;
}

// Rotation about Z:  | c  -s  0 |
//                    | s   c  0 |
//                    | 0   0  1 |
export function rotationZ(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const m = identity();
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m;
}

// a · b (apply b first, then a).
export function multiply(a, b) {
  const r = new Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      r[col * 4 + row] = sum;
    }
  }
  return r;
}

// M · (x, y, z, 1): a point (w = 1, so the translation column applies).
// Returns the homogeneous result [x, y, z, w].
export function transformPoint(m, [x, y, z]) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
    m[3] * x + m[7] * y + m[11] * z + m[15],
  ];
}

// The canonical order for an object rotated about Y: M = T · R · S —
// scale in the object's own axes, then rotate, then move into place.
export function composeTRS([tx, ty, tz], rotationYAngle, [sx, sy, sz]) {
  return multiply(translation(tx, ty, tz), multiply(rotationY(rotationYAngle), scaling(sx, sy, sz)));
}

// The wrong order, for the defence demo: rotating first and scaling after
// stretches along the *world* axes. At 90° a unit box is symmetric, so the
// object looks unrotated; at 45° it is sheared into a rhombus.
export function composeTSR([tx, ty, tz], rotationYAngle, [sx, sy, sz]) {
  return multiply(translation(tx, ty, tz), multiply(scaling(sx, sy, sz), rotationY(rotationYAngle)));
}

// View matrix of a camera at `eye` with Euler angles in Three's 'YXZ'
// order (yaw about Y, then pitch about X, then roll about Z). The camera's
// world matrix is C = T(eye) · Ry · Rx · Rz; the view matrix is its
// inverse, V = C⁻¹ = Rz(−roll) · Rx(−pitch) · Ry(−yaw) · T(−eye):
// moving the camera is the same as moving the world the opposite way.
export function viewMatrix([ex, ey, ez], pitch, yaw, roll = 0) {
  return multiply(rotationZ(-roll), multiply(rotationX(-pitch), multiply(rotationY(-yaw), translation(-ex, -ey, -ez))));
}

// Perspective projection (vertical field of view, OpenGL conventions):
//   | f/a  0        0                0           |
//   |  0   f        0                0           |
//   |  0   0  (far+near)/(near−far)  2·far·near/(near−far) |
//   |  0   0       −1                0           |
// with f = 1 / tan(fov/2). The last row copies −z_view into w.
export function perspective(fovDegrees, aspect, near, far) {
  const f = 1 / Math.tan((fovDegrees * Math.PI) / 360);
  const m = new Array(16).fill(0);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}

// World point → clip space (P · V · p) → divide by w → normalised device
// coordinates in [−1, 1]³ when the point is on screen. w is the point's
// distance in front of the camera (−z in view space): dividing by it is
// what makes far things small.
export function projectPoint(projection, view, point) {
  const clip = transformPoint(multiply(projection, view), point);
  const w = clip[3];
  return { clip, w, ndc: [clip[0] / w, clip[1] / w, clip[2] / w] };
}
