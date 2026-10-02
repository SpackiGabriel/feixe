# assets/

**Nothing here is implemented yet.** This file only reserves the layout for the asset pipeline so work doesn't scatter. Create the subfolders when the first file needs one — not before. Rationale: `docs/research/pipeline-assessment.md`; design decisions: `design/visual/`.

```text
assets/
├── src/            # source of truth (committed): per-asset specs, Blender Python scripts, preview images
│   ├── specs/      #   one Markdown spec per asset family (dimensions, origin, anchors, material slots, states)
│   ├── blender/    #   build_<asset>.py + a small shared lib (materials built from tokens, export helper)
│   └── previews/   #   engine-rendered PNGs for human review
└── models/         # compiled runtime GLBs (committed, never hand-edited; regenerate from src/)
```

Served straight from the repo root (`npm start`); no `public/`, no bundler.

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
