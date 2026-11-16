# 0010 — Own Blinn-Phong shader and hand-written matrices (don't revert to built-ins)

## Context
The course brief (enunciado, Seção 3 and 5) grades ten requirements, each
as "Básico" (the engine's ready-made function) or "Avançado" (own logic:
hand-composed matrices, a custom shader, code-generated meshes). It also
asks specifically for an *empirical local* lighting model with ambient,
diffuse and specular coefficients, the per-vertex vs per-fragment shading
difference, and the perspective divide by w. Three.js's
`MeshStandardMaterial` (PBR) and `Object3D.compose` cover the look but
read as "Básico" and don't expose ka/kd/ks.

## Decision
- Room walls, interior walls and the floor use our own Blinn-Phong
  `ShaderMaterial` (`src/presentation/phong-material.js`): ka, kd, ks, n
  as uniforms; Three only supplies the scene's light values
  (`lights: true`) and fog. Key `L` switches the same lighting function
  between the fragment shader (default) and the vertex shader (Gouraud).
- `src/core/matrix.js` writes the 4×4 math by hand (T·R·S, view matrix,
  perspective, divide by w). Interior walls set `mesh.matrix` from
  `composeTRS` with `matrixAutoUpdate = false`; `?debug` shows the aimed
  object's w/NDC computed by hand next to Three's, and key `T` shows the
  wrong order T·S·R. Tests check every function against Three to 9
  decimals.
- Devices (mirrors, emitters, doors) keep PBR: the mirror needs the
  environment map.

## Alternatives considered
Keep the built-ins and only explain the math in the defence: same look,
but the artefact half of the grade (70 %) would rate those requirements
as basic.

## Consequences
Don't "simplify" these back to `MeshStandardMaterial` or
`mesh.position/rotation/scale` — it would look the same and silently cost
grade. Diffuse/ambient match the old PBR look (1/π convention, ka = kd =
0.95); without a canvas (headless tests) the walls/floor fall back to a
plain `MeshStandardMaterial`. The defence guide `docs/defesa.md` cites
these files line by line, so moving code there means re-checking it.
