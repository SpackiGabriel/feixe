# Feixe — Context Brief for Asset-Pipeline Research

*Research brief for Gemini Deep Research. Not a GDD, not a pipeline design. Facts come from the repository (`src/`, `STATUS.md`, `docs/`, `feixe-especificacao.pdf`) as of 2026-10-01. **[OPEN]** = not determinable from the repo.*

## 1. Game in 60 seconds

**Feixe** is a first-person 3D puzzle game made by two students for a university computer-graphics course (UTFPR; the spec is closed and fixed). The player walks through dark rooms and aims colored lasers via movable mirrors into receivers to open doors.

- **Loop:** aim (center-screen raycast) → confirm → drag an object along a rail or rotate it → beam re-routes → receiver lights → door slides open → walk to exit → next level.
- **Color:** additive RGB; a color behaves identically everywhere. AND = two colors converging on one receiver; OR = a door with two receivers; NOT = a blocker to route around. No logic symbols shown to the player.
- **Implemented objects:** mirror, emitter, receiver, door, switch, subtractive color filter, blocker, portal pair (opaque teleport for beam and player).
- **Structure:** 10 fixed, self-contained rooms; one new idea per level (1–5 tutorials, 6–9 puzzles, 10 finale). Levels 1–8 built; 9–10 not.
- **Out of scope (spec §14):** physics, GI/ray tracing, portal see-through rendering, multiplayer, level editor, NPCs, procedural levels. No story.
- **Stage:** all gameplay systems work with **100% placeholder visuals**. No textures, no feedback UI.

## 2. Technical reality

| Topic | Fact |
|---|---|
| Engine | Three.js **r186**, `WebGLRenderer`, forward rendering, no post-processing |
| Build | Plain ES modules, **no bundler**. Three loaded from jsDelivr via import map (ADR 0001). Dev server: `python3 -m http.server`. Dev deps only: vitest, eslint |
| Target | Desktop browser, keyboard + mouse (Pointer Lock) |
| Performance | Spec: stable 60 fps on "modest hardware". Convention: small reused mesh set, no per-frame allocation. No measured budgets or profiling; "modest" undefined **[OPEN]** |
| Levels | Declarative JS data per level (arrays of mirrors/emitters/receivers/switches/filters/blockers/portals/doors with `position`, `rotationY`, colors, rules). `instantiateLevel()` calls one code factory per type that builds Three nodes |
| Room | **Not level data.** One fixed 10×10 m, 3 m-high shell (floor plane + 4 single-sided wall planes) shared by all levels (ADR 0005). Spec calls level 10 a "multi-level room" — how is **[OPEN]** |
| Units | Meters, Y-up, `rotationY` (yaw) only, forward = local −Z. Gameplay is on the **XZ plane**; everything beam-relevant sits at `BEAM_HEIGHT` 1.2 m. Eye 1.6 m, FOV 70°, player radius 0.35 m |
| Materials | All `MeshStandardMaterial`, flat colors (floor 0x555555, wall 0x888888). Mirror metalness 0.9/roughness 0.1 but **no environment map**. Filter is transparent. **No textures** |
| Lighting | Ambient 0.4 + directional 0.8 + **one PointLight per beam** (ADR 0003). No shadows. Default tone mapping/color space (never configured) |
| Beams | 1 px `THREE.Line`, `toneMapped:false`, rewritten each frame |
| Asset loading | **None.** No loaders, no `assets/` dir. "Procedural BufferGeometry, no external model imports" is a project convention (CLAUDE.md), not a spec requirement |
| Audio / UI | One synthesized WebAudio blip; a 2 px CSS crosshair. No HUD/icons |
| Testing | Vitest incl. headless Three harness instantiating every level; `?debug&level=N` jumps to a level and exposes `window.__feixe`; CI = lint + tests. No screenshot tests |
| Deployment | **[OPEN]** online vs. offline vs. lab machine; internet not guaranteed |
| Spec items touching assets | Textures on floor/walls/receiver/door panels; distinct ambient/diffuse/specular per material class; **color-blind symbols (circle/triangle/diamond) on emitters and receivers**; portals = opaque surface with icon; receiver activation "pulse". *Required, not yet implemented* |

## 3. Current visual architecture

| Element | Today | Kind | State feedback |
|---|---|---|---|
| Room | Flat gray planes | Procedural, untextured | — |
| Mirror | Pivot `Group` (slides on rail) + child 1×1×0.05 box plate (rotates). No visible rail/stand | Procedural | Gray hover tint |
| Emitter | r 0.15 × 0.5 m cylinder, dark, emissive in its color | Procedural, emissive | Emissive up on hover |
| Receiver | 0.8×0.8×0.05 box, emissive in target color | Procedural, emissive | Emissive 0.15→1.2 + beep; no pulse |
| Door | 2×3×0.15 box, **slides up 3 m**, 2 m/s | Procedural, code-animated | Motion only |
| Switch | Pedestal + button cylinder | Procedural | Button color toggle |
| Filter | 0.8×0.8×0.05 translucent colored plate on rail | Procedural, transparent | Hover tint |
| Blocker | Dark box; **width/height/thickness are per-level parameters** (level 8: full-room 10 m divider) | Procedural, parametric | — |
| Portal | 1.2×2.2×0.1 dark emissive box; pair colors hardcoded blue/orange | Procedural | None; no icon |
| Beam | 1 px line + one point light | VFX | Color = composed color |
| UI | Crosshair dot; no symbols | UI | — |
| Props, decals, ceiling, skybox | Absent | Not implemented | — |

No visual identity exists yet (no palette, no shape language). The only fixed visual language is the spec-constrained RGB gameplay color set, plus: minimalist, dark rooms, neutral surfaces, beams as the main visual element, restricted palette, high contrast.

## 4. Gameplay constraints assets MUST preserve

"Replace the cube with a pretty GLB" can silently break gameplay.

| Coupling | What code does | Implication |
|---|---|---|
| **Reflection is 2D math, not mesh raycasting** | Mirror segment = plate's local X from −0.5 to +0.5 m (hardcoded), via `matrixWorld`, projected to XZ. Receiver 0.8, portal 1.2, filter 0.8, blocker param: also hardcoded widths | The active face must be exactly that width, centered on, and aligned with the node's local X at beam height. Frames/stands are free but can't change it |
| **Picking** | `intersectObjects(interactiveObjects, recursive=false)`: only the exact registered mesh is hit (mirror→plate, emitter→body, filter→plate, switch→button). Hover writes `material.emissive` on that mesh | Multi-mesh GLBs aren't hit unless each pickable is registered or a simple pick proxy is used |
| Occlusion | Picking ignores walls/doors (findings 2026-09-19) | Visual blocking ≠ unselectable |
| **Pivots/axes** | Parts rotate about their own origin; mirror parent origin = rail point; emitter barrel = −Z; beam starts at emitter origin (no muzzle offset) | Origin = vertical axis at active-face center; Y-up, −Z forward |
| **Doors** | Player collider = static AABB (2 m × 0.15 m), removed *instantly* when logically open; visual slides ≤ ~1.5 s | Visual must stay in that footprint and clear the opening |
| **Blockers** | Arbitrary width/height/thickness with same-size AABB | Fixed-size models can't cover this; needs a modular/tiling/scaling strategy |
| Room | Wall planes at ±5 m; beam-wall segments on the inner face; colliders padded 0.2 m | A real wall mesh must keep its inner face at ±5 m |
| Level data | Only position/rotation/color/rule; no model ID, variant, or scale (blocker aside) | New assets require loader and data changes |
| **Disposal** | `disposeLevel()` disposes every geometry/material it traverses; **R** restarts the level | Incompatible with cached/shared GLB resources as-is |
| **Per-instance material state** | Each factory builds its own material and mutates `emissive`/`emissiveIntensity` | Shared materials would bleed state between instances |
| Doors watch `isActive()` | Receiver or switch | Door indicators must work for both |

**Safe to become detailed models:** frames, housings, stands, rails, door panel look, trim, wall/floor dressing, signage — anything off the logical segment/collider. **Should probably keep simple gameplay geometry:** the 2D segment (implicit in code), player AABBs, pick targets. Whether these become explicit invisible meshes, named GLB nodes/`extras`, or stay in code is an open question.

## 5. Asset inventory (families)

**[G]** gameplay-critical · **[E]** environmental · **[F]** feedback

| Family | Tag | Reuse / variation |
|---|---|---|
| Emitter | G | ≤3/level; 4 colors (R/G/B/white); spec symbol per color |
| Mirror (plate + pivot/base + rail) | G | ≤6/level; slide-only, rotate-only or both — should the model show which? **[OPEN]** |
| Receiver | G,F | ~2–4/level; target incl. composites (yellow/magenta/cyan/white); symbols for composites unspecified **[OPEN]** |
| Door | G,F | 1–2/level; 2×3 m; exit vs. intermediate, AND vs. OR without symbols **[OPEN]** |
| Filter | G | 3 primaries; levels 7, 9, 10 |
| Blocker | G | Parametric; obstacle vs. room divider |
| Portal pair | G | Levels 8–10; "indicative icon", A/B distinct |
| Switch | G | Level 1 so far |
| Modular room kit (floor, walls, ceiling, trim, door frames) | E | 10 rooms; currently one fixed shell |
| Textures/materials | E,G | Floor, walls, receiver/door panels (spec); matte vs. metal vs. emissive |
| Decals/signage/floor markings | E | Absent; spec §12 forbids logic symbols |
| Props, skybox/backdrop | E | Not required; value vs. scope **[OPEN]** |
| Beam VFX (line/glow/impact/convergence) | F | 1 px line today; spec: "thin emissive mesh" |
| Receiver pulse, door unlock cue, portal effect | F | Receiver pulse in spec |
| UI icon set (color-blind symbols), crosshair | F | Small |
| Audio | F | Procedural; relevant only if the pipeline should manage it **[OPEN]** |

## 6. Animation and state

| Case | Today | Note |
|---|---|---|
| Door slide | Code, linear `position.y`, frame-rate independent | Spec requires smooth transition; richer door might (or might not) merit authored clips |
| Mirror drag/rotate, emitter rotate | Code from mouse deltas, optional angle snap | Continuous, input-driven |
| Receiver activation | Emissive step + beep | Spec wants a "pulse"; not implemented |
| Switch | Color toggle; button doesn't move | Could gain a press |
| Portal | Static | Idle effect would be material-driven if any |
| Beam | Per-frame geometry rewrite | Procedural |
| Level transitions | Instant load near open exit door | Unspecified **[OPEN]** |

No skeletons, clips or tweens exist. State is implicit booleans (`isActive()`, `isOpen()`), not named states; dynamic hooks are material emissive, transforms and `userData.setHovered`. Research should decide authored vs. procedural; this brief doesn't.

## 7. Visual/design-system problem

We don't want isolated AI-generated models; we need a **coherent, original visual identity** an agent can apply repeatedly across ~15 asset types × color/state variants × 10 levels. The repo does not state a "Portal-like" inspiration (only a portal *mechanic*) — whether the team wants a clean-test-chamber look is **[OPEN]**. Either way: original identity, no copying of Valve assets.

Research what an asset design system should contain and how to represent it: art direction; shape language; proportions/scale (1 m mirror, 2×3 m door, 3 m ceiling already fixed in code); material language (matte/metal/emissive/translucent); palette; emissive language; **gameplay-state colors** (RGB primaries are semantically reserved; scenery must not collide with them); environment palette; wear/detail; bevels; texel density/texture resolution; naming; pivots; modular dimensions; LOD (if any); triangle/material budgets (derived, not invented); lighting assumptions (low ambient, beam point lights, no shadows); readability; interaction affordances (draggable vs. rotatable vs. fixed).

## 8. Agentic pipeline objective

An agent receives *"Create the receiver asset per the Feixe asset specification"* and follows a reproducible process roughly:

design spec → generation/modeling → material/texturing → optimization → export → automated validation → preview/render → human review (when necessary) → game integration → gameplay validation

Conceptual only — **tools and formats per stage are for the research.** Priorities: CLI/API scriptability; deterministic repeatable steps; agents can inspect outputs; automated validation; cheap iteration; sized for **two students and a deadline**, not a studio. Existing hooks: declarative level data, headless Three test harness, `?debug&level=N`, `window.__feixe`, CI.

## 9. Questions for Deep Research

**Asset strategy**
1. What stays procedural Three.js, what becomes external models, what is texture/material/VFX-only? Is the "no external models" convention worth keeping?
2. Is glTF/GLB the right canonical format given no bundler and CDN Three r186? Alternatives?
3. Given parametric blockers/doors/walls, what modular strategy fits (kits, 9-slice, tiling, non-uniform scale)?

**Model generation**
4. Which AI 3D generation approaches yield clean, stylized, game-ready hard-surface assets with controllable dimensions/pivots — and which don't?
5. When is procedural Blender scripting preferable to generative 3D?
6. Can agents reliably build/modify Blender scenes via headless Python? Failure modes?
7. What still needs human visual judgment?

**Textures/materials**
8. What workflow fits a handful of tileable environment textures + panel textures? PBR vs. simpler vs. vertex colors/atlas?
9. Generated vs. procedural vs. authored textures: which is reproducible? Standardizing resolution, packing, color space, tiling, texel density?
10. How to author emissive so runtime per-instance gameplay colors can be applied?

**Animation**
11. Which animations stay code-driven, which become authored clips?
12. What export/naming/pivot conventions make clips reliable in Three.js and agent-checkable?

**Three.js integration**
13. GLTFLoader without a bundler; Draco/Meshopt/KTX2 worth it? Caching, cloning, instancing.
14. How to separate render meshes from segments/colliders/pick proxies, and let a model *declare* them (named nodes, `extras`)?
15. Per-instance emissive state with shared materials; lifecycle/disposal.
16. Do the lighting choices (no env map, no shadows, one point light per beam) constrain materials?

**Automation**
17. Which stages can genuinely be automated today? Which tools have good CLI/Python/API?
18. How can an agent render deterministic previews of a GLB?
19. How to inspect GLBs programmatically (dimensions, pivots, transforms, materials, tris, textures, clips)?

**Quality gates**
20. What should a validator reject (scale, pivot, axis, materials, textures, tris, unapplied transforms, naming, clip names)?
21. How can screenshot/visual-regression testing (via `?debug&level=N`) help? Limits?
22. Should there be a canonical asset manifest/schema, possibly shared with the level loader?

**Design consistency & iteration**
23. How to represent a design system for agents: Markdown, reference images, Blender reference scene, material library, JSON schema, or a mix?
24. What if an asset passes validation but looks wrong? How to version specs, prompts, seeds and outputs? How to prevent stylistic drift across regenerations?

**Build vs. buy**
25. What's worth building (validator, preview renderer, manifest) vs. adopting? What's practical for students vs. overengineering? Cost/licensing/hardware limits **[OPEN: budget, GPU]**.

## Questions We Probably Don't Know We Need to Ask Yet

1. **Does external-asset adoption conflict with grading?** The spec's modeling axis says base meshes are "modeled once and reused", scene graph generated from level data. Does an imported GLB satisfy the course's modeling/hierarchy/material/texture axes, or must the team show them in code? Could invalidate the pipeline.
2. **Source of truth for dimensions:** 0.8/1.0/1.2 m widths live in code. Does a manifest replace that, or sync from it?
3. **"Mirror" has no real reflection:** it's flat opaque plus 2D math. An art-directed mirror has nothing to reflect unless visuals fake it (env map, fresnel).
4. **Color semantics vs. art:** saturated hues or colored noise in scenery can destroy legibility; symbols must survive in monochrome.
5. **Glow without post-processing:** thin lines and emissive values with no bloom; beam thickness/ribbon geometry changes asset needs.
6. **Shared GLB materials/disposal** will break on the first GLB (see §4).
7. **Pick/hover assumes one mesh, one material.**
8. **Async loading:** the game boots synchronously; loading screens, failure modes, offline use, texture size over a CDN demo.
9. **Color management:** no `outputColorSpace`/tone-mapping decisions exist; texture tagging and `KHR_materials_emissive_strength` will interact with hand-tuned intensities.
10. **Unit/handedness drift:** Blender Z-up vs. Y-up, forward axis, applied scale, generators ignoring real dimensions.
11. **Generator reproducibility:** hosted generators are non-deterministic and change; what is the source of truth (prompt, file, script)?
12. **Room structure may change** (modular kit, distinct layouts, L10's multi-level room) — colliders, beam walls and data would shift together; assets built to today's shell could be wasted.
13. **Budgets are unknown:** "modest hardware" is undefined; the pipeline must *measure* before it can *enforce*.
14. **Review burden** for two people: the cheapest human checkpoint that still catches "valid but ugly".
15. **Deadline risk:** levels 9–10 and required items (textures, symbols, pulse) remain; what's the minimum pipeline that pays for itself?
