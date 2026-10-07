# assets/

**Prototype stage.** Only placeholder Receiver variants exist, to iterate on the look in the viewer; nothing here is a final design and the game doesn't load any GLB yet. Rationale: `docs/research/pipeline-assessment.md`; design decisions: `design/visual/`.

```text
assets/
├── src/
│   ├── build.sh          # bash assets/src/build.sh <asset>: Blender -> GLBs -> gltf-transform validate -> check-glb.mjs
│   ├── check-glb.mjs     # nothing in front of the face plane, floor at -1.2 m, face recess <= 6 cm; prints size/tris
│   ├── blender/          # build_<asset>.py (variants are a table at the top) + smoke_test.py
│   └── specs/            # (not created yet) one Markdown spec per asset family
├── models/<asset>/       # generated GLBs + manifest.json (committed; regenerate, never hand-edit)
└── viewer/               # neutral side-by-side GLB viewer (index.html + viewer.js)
```

Served straight from the repo root (`npm start`); no `public/`, no bundler.

## Iteration loop

```bash
bash assets/src/build.sh receiver     # after editing assets/src/blender/build_receiver.py
npm start                             # then open http://localhost:8000/assets/viewer/
```

In the viewer press **R** (or Recarregar) after each build. Add a variant by adding one entry to `VARIANTS` in the Blender script. Viewer: clay material and fixed neutral lighting on every cell, linked cameras (toggle), Perspectiva/Frente/Trás/Lado/Topo, wireframe, floor, and guides (origin axes, the 0.8 m active-face outline, a yellow arrow for the front = −Z, bounding box). `?asset=<name>` picks another family. This is separate from `gallery/`, which shows the game's real grey-box in a room.

## Toolchain (installed and smoke-tested 2026-10-01 on WSL2 Ubuntu 24.04)

| Tool | Version / where | Notes |
|---|---|---|
| Blender | **4.5.14 LTS**, official tarball in `~/tools/blender/blender-4.5.14-linux-x64`, symlink `~/tools/blender/current`, on `PATH` via `~/.zshrc` | LTS chosen over 5.x (5.2 is current) for API stability while the pipeline is written. Bundled Python is 3.11.15. The `bpy` pip module is **not used** (wheels target Blender's own Python; system Python here is 3.14). No system libs were missing; no `apt` needed |
| `@gltf-transform/cli` | 4.5.1, devDependency (`npx gltf-transform …`) | validate / inspect / optimize |
| `playwright-core` | 1.60.0 exact, devDependency | Pinned because its expected Chromium revision (1223) is already in `~/.cache/ms-playwright`. No browser is downloaded by npm; on a fresh machine run `npx playwright-core install chromium` once |
| Three.js | 0.186.0 (unchanged) | `three/addons/loaders/GLTFLoader.js` is available from `node_modules` (the game's import map still lacks `three/addons/` — add it when the loader is written) |

**Re-create on another machine:** download `blender-4.5.14-linux-x64.tar.xz` from `download.blender.org/release/Blender4.5/`, verify against `blender-4.5.14.sha256` (`9ba871ff…6da3`), extract under `~/tools/blender`, put it on `PATH`; then `npm install`.

**Smoke test:** `bash assets/src/smoke.sh` — Blender headless builds a 0.8×0.8×0.08 m bevelled panel with two named material slots, exports GLB, renders a PNG; `gltf-transform` validates it and reports the bounding box; Three's `GLTFLoader` parses it in Node; the gallery is screenshotted through Playwright. It is a toolchain check, not an asset or a pipeline.

**Gallery screenshots:** `node gallery/shot.mjs out.png "scene=devices&station=mid"` (software WebGL, no GPU needed; parameters in `gallery/README.md`).

**Things the smoke test showed** (also in `docs/findings.md`):
- Blender is Z-up, glTF is Y-up: Blender **+Z → glTF +Y**, Blender **+Y → glTF −Z**. A panel's thickness must run along Blender **Y** to be glTF **Z** (the game's local depth axis).
- Headless Blender prints harmless `EGL`/`MESA` warnings under WSL2; Workbench *and* EEVEE-Next both rendered a PNG. Blender previews won't match the game's lighting anyway — game-engine screenshots (above) are the planned review image.
- `gltf-transform validate` reports `UNUSED_OBJECT` info for `TEXCOORD_0` on untextured Blender exports; harmless.
