// Technical check for built GLBs (run by build.sh):  node assets/src/check-glb.mjs <dir>
// Rules from design/visual/design-system.md: nothing in front of the active-face plane
// (SPACE-04: glTF z >= 0 everywhere, front = -Z), floor at -1.2 m, and the face plate is
// at most 6 cm behind the plane. Prints size and triangle count per file.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';

const dir = process.argv[2];
const EPS = 1e-3;
let failed = false;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.glb'))) {
  const b = readFileSync(join(dir, file));
  const gltf = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
  const box = new Box3().setFromObject(gltf.scene);
  const size = box.getSize(new Vector3());
  let tris = 0;
  let faceMinZ = null;
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    if (o.name === 'face') faceMinZ = new Box3().setFromObject(o).min.z;
  });
  const problems = [];
  if (box.min.z < -EPS) problems.push(`sticks out ${(-box.min.z * 100).toFixed(1)} cm in front of the face plane`);
  if (Math.abs(box.min.y + 1.2) > EPS) problems.push(`floor at y=${box.min.y.toFixed(3)} (expected -1.2)`);
  if (faceMinZ !== null && (faceMinZ < -EPS || faceMinZ > 0.06 + EPS)) problems.push(`face plate front at z=${faceMinZ.toFixed(3)} (expected 0..0.06)`);
  console.log(`${file}: ${tris} tris, ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)} m ${problems.length ? 'FAIL: ' + problems.join('; ') : 'ok'}`);
  if (problems.length) failed = true;
}
process.exit(failed ? 1 : 0);
