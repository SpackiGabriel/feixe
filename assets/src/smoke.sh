#!/usr/bin/env bash
# Toolchain smoke test (not an asset, not the pipeline): Blender → GLB → gltf-transform → Three.js → gallery screenshot.
#   bash assets/src/smoke.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT="$(mktemp -d)"
command -v blender >/dev/null || export PATH="$HOME/tools/blender/current:$PATH"

echo "[1/4] Blender headless: build + export GLB + render"
blender -b --python assets/src/blender/smoke_test.py -- "$OUT" 2>&1 | grep -E "SMOKE_OK|Traceback|Error:" || { echo "FAIL: blender"; exit 1; }

echo "[2/4] gltf-transform: validate + bounding box"
npx gltf-transform validate "$OUT/smoke.glb" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "numErrors|ERROR|errors" | head -3 || true
npx gltf-transform inspect "$OUT/smoke.glb" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "SmokeBox|mat_"

echo "[3/4] Three.js GLTFLoader parses it in Node"
node --input-type=module -e "
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
const b = readFileSync('$OUT/smoke.glb');
new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', (g) => {
  const size = new Box3().setFromObject(g.scene).getSize(new Vector3());
  const mats = new Set();
  g.scene.traverse((o) => { if (o.isMesh) [o.material].flat().forEach((m) => mats.add(m.name)); });
  console.log('size', size.toArray().map((n) => +n.toFixed(3)).join(' x '), '| materials', [...mats].join(','));
}, (e) => { console.error(e); process.exit(1); });
"

echo "[4/4] Gallery screenshot (Playwright + software WebGL)"
node gallery/shot.mjs "$OUT/gallery.png" "scene=devices&station=mid"
ls -la "$OUT"
echo "SMOKE PASSED (outputs in $OUT)"
