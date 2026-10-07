#!/usr/bin/env bash
# Build one asset family's GLBs from its Blender script, then validate them.
#   bash assets/src/build.sh receiver
# Output: assets/models/<asset>/*.glb + manifest.json (read by the viewer at /assets/viewer/).
set -euo pipefail
cd "$(dirname "$0")/../.."
ASSET="${1:?usage: bash assets/src/build.sh <asset>   (e.g. receiver)}"
command -v blender >/dev/null || export PATH="$HOME/tools/blender/current:$PATH"
SCRIPT="assets/src/blender/build_${ASSET}.py"
[ -f "$SCRIPT" ] || { echo "no $SCRIPT"; exit 1; }
OUT="assets/models/$ASSET"
mkdir -p "$OUT"
rm -f "$OUT"/*.glb
blender -b --python "$SCRIPT" -- "$OUT" 2>&1 | grep -E "BUILD_OK|Traceback|Error" || { echo "FAIL: blender"; exit 1; }
for f in "$OUT"/*.glb; do
  r=$(npx gltf-transform validate "$f" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "numErrors|No errors" | head -1)
  echo "$(basename "$f"): ${r:-validated}"
done
node assets/src/check-glb.mjs "$OUT"
echo "OK. Open http://localhost:8000/assets/viewer/ (npm start)"
