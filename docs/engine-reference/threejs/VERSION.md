# Three.js — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | r186 (npm `three@0.186.0`) |
| **Project Pinned** | 2026-09-15 |
| **LLM Knowledge Cutoff** | January 2026 |
| **Risk Level** | MEDIUM — recent releases (post-cutoff) not fully covered; core API (Scene, Mesh, BufferGeometry, raycasting, WebGLRenderer) is stable and well within training data |

## Note

Use `WebGLRenderer`, not `WebGPURenderer` — this project targets WebGL only
(per project decision, not a spec requirement). Core APIs used by this
project (raycasting, BufferGeometry, Object3D hierarchy/parenting, materials,
lights) have been stable across recent Three.js releases and are safe to use
from training knowledge. Verify any newly-introduced API (searched via
WebSearch) against the [official docs](https://threejs.org/docs/) before use,
since r186 postdates the LLM's training cutoff.

Run `/setup-engine refresh` to update this doc if needed.
