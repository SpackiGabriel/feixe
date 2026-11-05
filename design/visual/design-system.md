# Feixe Visual Design System — v1 (frozen items only)

*Drafted 2026-10-02. Contains only what the team already decided (E1–E6 in `design-system-discovery.md` §0), what the spec/code fixes, and the discovery's recommendations that carry no taste risk. Everything else is listed under **Open** and must not be invented by an asset script. Numbers shared with code live in `tokens.json`; code is authoritative.*

Rule IDs are stable so specs and scripts can cite them.

## Scope and pipeline

- **PIPE-01** GLB geometry from Blender is allowed for visible device geometry (E1). Gameplay logic (beam segments, AABBs, pick targets) stays in code; the GLB is skin only.
- **PIPE-02** A GLB carries **geometry + named material slots only**. Materials are built in Three from tokens (per instance when stateful). No `.blend` material libraries.
- **PIPE-03** Stay procedural: beams, rails, blockers (per-level size), the room shell.
- **PIPE-04** Animation stays in code (door slide, mirror rotation, emissive). No authored clips.
- **PIPE-05** Hierarchy of attention: **beam > device state > room**. Anything that competes upward is wrong.
- **PIPE-06** Previews are rendered with the game's own renderer (gallery + Playwright), not Blender.
- **PIPE-07** Nothing is built before something uses it: no schema, orchestrator or report files. First asset by hand/script once; validator when asset #2 exists.

## Space and origins

- **SPACE-01** Metres, Y-up, rotation about Y only, forward = −Z, beam height 1.2 m (`tokens.json`).
- **SPACE-02** Origin = centre of the **active face** at beam height, local X along the face (E5). Floating devices extend **downward** from the origin for stands. Exceptions: switch (origin at floor), door (origin at slab centre, y = 1.5).
- **SPACE-03** The active face width must equal the code's width (`tokens.json`); a visual may be larger (frames) but never narrower.
- **SPACE-04** Zero protrusion in front of an active face; recesses only.
- **SPACE-05** Door keeps the up-sliding form (E6) and must work free-standing; its footprint stays within 2 × 0.15 m.
- **SPACE-06** Room shell inner faces stay at ±5 m.
- **SPACE-07** Blender is Z-up, glTF Y-up (Blender +Z → glTF +Y, Blender +Y → glTF −Z). Panel thickness runs along Blender Y.

## Colour and light

- **COL-01** Reserved gameplay hues are R, G, B, Y, M, C, W. Scenery and non-laser devices never use them saturated (E4).
- **COL-02** Non-laser devices (portals, switch, door, structure) are **chromatically neutral**; identity comes from shape, icon, motion, material, placement. *Existing code violates this* (portal 0x33aaff/0xff7733, switch 0x33ff33) — a code fix, not yet done.
- **COL-03** Emissive hue only ever means a gameplay colour. Structural lights are non-emissive fixtures or very dim neutral.
- **COL-04** Lighting baseline (E3): low ambient, beams as dominant lights, faint fill, environment map. Numeric values are gallery starting guesses, not frozen.
- **COL-05** Tone mapping is unset and no bloom exists, so emissive intensity above ~1 only clips. State must differ by **shape/area as well as brightness**.

## Shape, detail, accessibility

- **SHAPE-01** Silhouettes: emitter = cylinder/barrel, mirror = thin plate on a post, receiver = flat panel, filter = translucent plate in a frame, portal = tall frame, switch = low pedestal. No two families share an outline.
- **SHAPE-02** Details smaller than ~0.09 m are invisible at 8 m; only model them if they matter at close range. Gameplay-critical marks are ≥ 0.2 m.
- **SHAPE-03** Nothing detailed at beam height unless it is the device.
- **ACC-01** Each laser colour has a distinct geometric symbol on emitters and receivers (spec: circle, triangle, diamond). Symbols are recessed **and** emissive, ≥ 0.2 m, on the face the player sees, readable in grayscale.
- **ACC-02** Pulses ≤ ~2 Hz, never a strobe.
- **TEXT-01** Spec §12: no text, formula or symbol that exposes puzzle logic. Set-dressing is numerals/pictograms only.

## State vocabulary

`idle`, `hover`, `grabbed`, `active`, `locked`, `unlocked`/`open`, `disabled`. Used by code, specs and previews. The per-state look is **open**.

## Open — do not decide in a script

| ID | Question | Blocks |
|---|---|---|
| D-1/3/4 | Concrete architecture and shape language within the premise (boxy vs. chamfered; family resemblance vs. distinct outlines) | Receiver look |
| D-16/17 | Symbol mapping (which shape = which colour) and composites (side by side / overlay / new shapes) | Receiver and emitter symbols |
| §0.2-9 | Which local face is the "front" (−Z recommended; receivers use rotationY 0, doors/portals π today) | Every decal or relief |
| D-9/10/11 | Environment palette values, material values, textures | Materials and tokens |
| D-13/14/15 | Per-state look, affordance cues, hover/outline style | State specs |
| D-20 | Ceiling: none, flat, or grid | Door and level 10 |
| D-22 | Target machine and triangle/texture budgets (measure on the golden asset) | Validator |
| §0.1 | Set-dressing scope: lore content, per-phase variation | Room kit |

Decisions go into this file as new rule IDs and are removed from the table above.
