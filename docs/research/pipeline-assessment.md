# Assessment: `asset-pipeline-discovery.md` vs. the real repository

*Written 2026-10-01. Compares the Gemini report (`asset-pipeline-discovery.md`, the "discovery") with the code as it exists. Nothing in the discovery is implemented; **Blender is not installed on this machine** (Node 22 and Python 3.14 are).*

## Fits the project as-is

- **Visual/gameplay decoupling.** Beam math, colliders and picking stay in code; GLB is skin only. Matches how the repo already works (2D segments, AABBs, `userData` pick targets).
- **Beam and blocker stay procedural.** Blockers have per-level arbitrary sizes; beams are rewritten per frame.
- **Animation stays in code.** Door slide, mirror rotation and emissive changes already are; no skeletons needed.
- **Per-instance cloned materials** for anything with runtime state. Correct and necessary.
- **Specs-in-git, GLB treated as build output, human approval of the look.** Right size for two people.
- **Receiver as the pilot asset.** Good choice: it touches segment width, symbols, emissive state and pivot.
- **Zero-cost local tooling** (Blender CLI, gltf-transform, existing Claude/GPT subscriptions).
- **Overengineering list** (no post-processing, no multi-agent SaaS) agrees with CLAUDE.md.

## Needs adaptation

| Discovery says | Reality | Adapt to |
|---|---|---|
| `src/factories/createReceiver.js`, `src/assets/AssetLoader.js` | Factories live in `src/gameplay/<thing>.js`, kebab-case files | Load via `src/gameplay/` or a small `src/core/assets.js`; follow kebab-case |
| `public/assets/models/` | No `public/`; `npm start` serves the repo root, no bundler | `assets/models/` at repo root |
| `three/addons/GLTFLoader` "via import map" | Import map only maps `three`, not `three/addons/` | Add one import-map entry (jsDelivr `examples/jsm/`); ADR-worthy |
| Async `loadAsset()` in factories | `instantiateLevel()` and every factory are **synchronous**; headless Vitest harness instantiates every level | Preload all GLBs once at boot; factories clone synchronously. Keep the procedural mesh as fallback so tests need no GLB |
| Materials authored in `materials.blend` (PBR) | `.blend` is binary/unreviewable; game has hand-tuned per-instance materials; Blender look ≠ Three look | **GLB = geometry + named material slots only; runtime materials built in Three from tokens** (recommendation, see design-system doc §14) |
| Previews rendered by Blender | Blender lighting won't match the game's (ambient + directional + beam point light) | Render previews with the game's own renderer (gallery page + headless browser). Blender previews only as a sanity check |
| Pivot "(0,0,0) at root" / "base of model" / "rear base" (three different statements) | Segments are computed at the entity `position` (receiver segment passes through the node origin; mirror plate likewise). A rear-based pivot would make beams stop at the *back* of the receiver | Origin = **the plane the beam interacts with**, at beam height (see design-system doc §4) |
| Receiver depth 0.08 m | Code: 0.05 m | Fine to change, but the 2D segment must still match the visual face |
| Door = frame + sliding panels | Door is one 2×3 m slab, slides **up 3 m**, can stand **free in the room** (level 8's door 1 at (2, 1.5, 2)); exit doors sit on the back wall | Open decision (§11): free-standing capable; a ceiling kit would collide with the up-slide |
| Mirror rail/stand in GLB | Rail start/end are arbitrary per level (level 8's mirror has a zero-length rail) | Rails are parametric → procedural, not GLB |
| `design-tokens.json` values (roughness 0.35, emissive 0.10 / 0.50 / 1.5–2.0, tris 5000, textures 1024 WebP, bevel 0.03) | Code today: emissive idle/active 0.15/1.2 (receiver), 0.4/1.0 (emitter); **no bloom, so intensity > 1 only clips**; no env map so metalness 0.8 renders near-black. 5000 tris and 1024 px are not measured budgets | Treat numbers as placeholders until measured in-engine on the golden asset |
| Palette #2A2B2E/#1E1F22/#4A4D52, brutalist, hex/octagon cutouts, "no 90° corners" | Never chosen by the team; spec says *minimalist*; spec's accessibility vocabulary is circle/triangle/diamond, which octagon cutouts compete with | Art direction is **a creative decision**, not a given (§3 of design doc) |
| Circle=red, triangle=green, diamond=blue; composites = union of outlines | Spec names the three shapes but **not the mapping**, and says nothing about composites | Decision (§9) |
| Pulse 0.15 → 1.5 sine on receiver | Spec wants a "pulse" (agrees) but values >1 clip; also a photosensitivity consideration | Define pulse by area/size as well as intensity |
| Portal: turbulence shader | Spec: opaque surface with an indicative icon | Optional polish; icon is the requirement |
| Validator "root origin (0,0,0)" | Not meaningful for a node tree | Check named anchor nodes / dimensions vs. spec instead |
| `npm run asset:generate`, JSON specs, reports dir, Node orchestrator | Nothing needed yet; no Blender here | Do not build until the first asset is made by hand/agent once |

## Assumptions in the discovery that don't match the repo

1. It treats the visual/identity choices (brutalist, hex cutouts, colours) as settled. They came from a research agent, not from the team.
2. It assumes metal/PBR values will look as specified. Without an environment map they won't.
3. It assumes portal/switch colours are free. They are not: portal pair is blue 0x33aaff / orange 0xff7733 and the switch uses green 0x33ff33, all colliding with **reserved gameplay hues** (R, G, B, Y, M, C, W).
4. It assumes grading allows externally modeled assets. Spec §13 frames modelling as "small set of base meshes modeled once and reused" and the project convention is procedural; check with the course (also in the design doc §13).
5. It doesn't mention that **the spec's "ambient/diffuse/specular coefficients" and "textures" requirements** must still be demonstrable.
6. It cites 5000 triangles / 1024 px as budgets without any measurement of the target machine.

## Decisions needed before generating assets

See `design/visual/design-system-discovery.md` §15 (question list). Blocking ones: grading vs. external models, art direction, lighting/env-map, reserved-colour handling for non-gameplay accents, symbol mapping, door form factor, origin convention.
