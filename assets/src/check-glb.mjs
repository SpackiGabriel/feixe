// Technical check for built GLBs (run by build.sh):  node assets/src/check-glb.mjs <assets/models/<asset>>
// Every asset: floor at -1.2 m (origin is at beam height). Per family:
//   receiver: nothing in front of the active-face plane (glTF z >= 0, front = -Z) and the face
//             plate at most 6 cm behind it (design-system SPACE-04).
//   emitter:  origin = rotation pivot, so it needs a `turret` node (rotates) and a `base` node
//             (fixed) whose bounding box is centred under the pivot (x, z within 1 cm of 0).
// Prints size and triangle count per file; exits 1 on any failure.
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';

const dir = process.argv[2];
const family = basename(dir);
const EPS = 1e-3;
let failed = false;

function byName(root, name) {
  let found = null;
  root.traverse((o) => { if (o.name === name && !found) found = o; });
  return found;
}

for (const file of readdirSync(dir).filter((f) => f.endsWith('.glb'))) {
  const b = readFileSync(join(dir, file));
  const gltf = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
  const scene = gltf.scene;
  const box = new Box3().setFromObject(scene);
  const size = box.getSize(new Vector3());
  let tris = 0;
  scene.traverse((o) => {
    if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  });

  const problems = [];
  let reach = ''; // emitter only: how far the turret extends in front of / behind the pivot
  if (Math.abs(box.min.y + 1.2) > EPS) problems.push(`floor at y=${box.min.y.toFixed(3)} (expected -1.2)`);

  if (family === 'receiver') {
    if (box.min.z < -EPS) problems.push(`sticks out ${(-box.min.z * 100).toFixed(1)} cm in front of the face plane`);
    const face = byName(scene, 'face');
    const faceMinZ = face ? new Box3().setFromObject(face).min.z : null;
    if (faceMinZ !== null && (faceMinZ < -EPS || faceMinZ > 0.06 + EPS)) problems.push(`face plate front at z=${faceMinZ.toFixed(3)} (expected 0..0.06)`);
  } else if (family === 'emitter') {
    const turret = byName(scene, 'turret');
    const base = byName(scene, 'base');
    if (!turret) problems.push('no `turret` node (the part that rotates)');
    if (!base) problems.push('no `base` node (the fixed part)');
    if (base) {
      const c = new Box3().setFromObject(base).getCenter(new Vector3());
      if (Math.abs(c.x) > 0.01 || Math.abs(c.z) > 0.01) problems.push(`base centred at x=${c.x.toFixed(3)}, z=${c.z.toFixed(3)} (expected 0, 0: it must sit under the pivot)`);
    }
    if (turret) {
      const t = new Box3().setFromObject(turret);
      reach = `, muzzle ${(-t.min.z * 100).toFixed(0)} cm / rear ${(t.max.z * 100).toFixed(0)} cm from the pivot`;
    }
  }

  console.log(`${file}: ${tris} tris, ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)} m${reach} ${problems.length ? 'FAIL: ' + problems.join('; ') : 'ok'}`);
  if (problems.length) failed = true;
}
process.exit(failed ? 1 : 0);
