# Feixe Visual Design System — Discovery (pre-v1)

*Status: **discovery, not a spec.** Nothing is frozen except what §0 lists as established. Purpose: list what must be decided so that "Create the Receiver asset" can be answered by an agent without it inventing the art direction. Written 2026-10-01 from the code, `feixe-especificacao.pdf`, and `docs/research/asset-pipeline-discovery.md` (see `docs/research/pipeline-assessment.md`).*

**Labels used in every section**
- **[C] Constrained** — fixed by the spec or by the code today (changing it means changing code/spec).
- **[R] Recommendation** — my suggested default; reasonable, not forced.
- **[D] Decision** — a creative choice the team must make. Alternatives are given with their practical consequences. No number is invented for these.

**Established vs. needing visual validation.** §0 lists what the team has decided. Everywhere else, a **[D]** whose heading says *(resolved)* is settled in direction by §0; a **[D]** marked *(validate in gallery)* is a baseline whose **values** still need visual evidence; unmarked **[D]**s are open.

## 0. Established decisions (team, 2026-10-01) and where the gallery stands

**Established (not to be re-litigated by agents):**

| # | Decision | Source |
|---|---|---|
| E1 | Externally modeled GLB geometry is allowed by the course; the GLB-based pipeline proceeds (still asset-by-asset, validator later) | team |
| E2 | Art-direction premise: retro-industrial Soviet-influenced research facility, progressively less understandable; neutral/desaturated environment; protected puzzle colours; physical, serviceable machinery; readability over atmosphere | `design-premise.md` |
| E3 | Lighting baseline: low ambient, beams as dominant light sources, faint environmental fill, an environment map | team |
| E4 | Non-laser devices stay **chromatically neutral**; identity comes from shape/iconography/motion/material/placement/neutral light | team + premise §5 |
| E5 | Object **origin = centre of the active face, at beam height** | team |
| E6 | Door keeps the **up-sliding** form | team |

**Explicitly not decided (premise §15 + team):** the symbol system (mapping, composites) — *to be explored visually first*; exact architectural language, decade/authenticity, final material palette, wear level, graphic/signage language, device-family shape language, portal identity, decay level, how aggressively late levels distort the look. Numeric values for E3 (ambient/fill/env intensities, beam-light strength, tone mapping) are **starting guesses in the gallery**, not decisions.

**What the first gallery pass established as evidence** (details in §0.2; screenshots in `design/visual/evidence/`).

### 0.1 Premise vs. spec / project scope — check before assets depend on it

| Premise element | Spec / repo constraint | Verdict |
|---|---|---|
| "Implicit narrative", lore fragments, easter eggs, handwritten notes, diagrams/schematics | Spec scopes narrative out ("no story/characters/dialogue"); spec §12 forbids exposing symbols, formulas or technical terms *about the logic* | **Compatible only as pure set-dressing**: no readable text that explains or hints at puzzle logic, no schematics of the laser/colour system. Lore content itself is out of scope (CLAUDE.md); keep it visual and optional **[D: confirm]** |
| "Progressive unreality" (distorted architecture, spaces larger than the facility, per-phase change) | ADR 0005: one shared 10×10×3 room shell for all levels; level 10 "multi-level" geometry unspecified | **Needs a scope decision.** Cheap forms (lighting/material/dressing variation per phase, kit repetition) fit; per-level geometry does not without changing room-as-data. Treat as a later layer on top of Design System v1 |
| Soundtrack / psychedelia | Audio currently one synthesized tone | Outside the visual pipeline; noted only |
| "Muted industrial green" among environment colours | Green is a reserved laser hue | Allowed **if desaturated and dark**; the gallery's palette presets exist to test it against the green beam |
| "Strong saturated colour scarce" / "neutral light" | White is a reserved laser hue | A neutral light source can still read as a *white beam* — validate in the gallery (portal/switch neutral emissive) |
| Dense physical detail (fasteners, seams, cables, labels) | Spec: minimalist; beams the main element; NFR legibility at a glance | **Tension to manage** through the hero/background tiers (§13) and the "nothing detailed at beam height unless it is the device" rule (§13) |

### 0.2 First gallery pass — what the screenshots show

Gallery: `gallery/` (see `gallery/README.md`); evidence in `design/visual/evidence/` (1280×720, software rendering, game camera/FOV/eye height). Observations only; each points at a decision, none is a decision.

1. **Silhouettes are not distinguishable yet.** In silhouette view (`04`) mirror, filters, receiver and blocker are all black rectangles; only the emitter cylinder and the switch differ. Distinct silhouettes (§3) are a real design task, not a polish pass.
2. **The premise lighting needs far less fill than a first guess.** With ambient 0.05 + hemisphere 0.15 + env 0.15 the room reads flat and fairly bright; at ambient 0.02 / hemi 0.06 / env 0.06 (the current gallery default) it reads "dark but navigable", walls and floor are separable and the lit hues dominate (`01`, `10`). The "current game" lighting (`03`) is brighter and directional-flat. The right values sit between and depend on the palette.
3. **Beams do not yet feel like light sources.** The 1 px line plus one 0.6-intensity, 3 m-range point light (ADR 0003) leaves almost no visible glow on surfaces (`01`, `11`), even with the gallery's ×10 multiplier. Thick (0.02–0.03 m) beams read much stronger at distance. Premise §6 ("physically present in the room") needs more than the current beam: thickness/glow geometry, stronger/more lights, or light-affecting accents — a decision for the beam VFX track (D-26).
4. **Door vs. wall have almost the same value** (`01`): the door slab disappears into a mid-gray wall. Door legibility needs value/edge contrast or a frame, independent of colour.
5. **Palette board (`08`):** lit "paint" in the 7 gameplay hues is dull next to the same hues emissive — a coloured prop would be much weaker than a beam but still hue-confusable; the 7 candidate neutrals are barely distinguishable from each other under the premise lighting except off-white/beige. Neutral grades should be chosen on wall/floor *value* first, tint second.
6. **Symbols (`05–07`, `09`):** single primaries read cleanly at ~8 m at 0.3 m size; with dark-on-lit-face when active, they remain readable (when idle the symbol is lit on a dark face — also readable, `02`). **Side-by-side** composites stay legible (white's three marks are the smallest); **overlaid outlines** collapse into blobs at distance (`06`); **new shapes** are legible but add vocabulary. Under deuteranopia simulation (`09`) red and green shift toward the same olive/gray family and the **shape** carries the distinction — supports symbols-as-primary-channel for red/green. *No mapping is recommended here; the gallery just makes the comparison possible.*
7. **Emitter symbols** sit on the 0.3 m rear cap and are capped at ~0.22 m; legible at close range, small beyond ~6 m (`01`).
8. **Beams off vs. on (`01`/`02`):** with beams off, the room is nearly uniform dark and idle receivers/filters still read by their dim emissive/translucency; the beams-on frame has strong hierarchy (beam > receiver > room) — the premise's intended hierarchy is achievable with the existing materials.
9. **Convention gap:** which local face is the "front" of a flat device is inconsistent (receivers on the back wall use `rotationY 0`, doors/portals use `π`; the box is symmetric today, so nothing breaks). Decals/relief make this matter → define "front = +Z or −Z" in the origin convention (extends E5).
10. **Environment map:** with the neutral `RoomEnvironment` at low intensity, metals are no longer black; the effect is subtle at these intensities, so a metal look needs more fill or a purposely authored env — validate with real device models before choosing.

Contents: 0 Established decisions · 1 Viewing conditions · 2 Art direction · 3 Shape language · 4 Dimensions & origins · 5 Palette & reserved colours · 6 Materials · 7 Lighting · 8 Emissive & states · 9 Accessibility markings · 10 Device family conventions · 11 Doors, walls, floors, ceilings · 12 Moving parts · 13 Detail, wear, signage, storytelling · 14 Representation in the repo · 15 Questions to answer · 16 Next step

---

## 1. Viewing conditions (the measuring stick for every later rule) — mostly [C]

| Fact | Value | Source |
|---|---|---|
| Room | 10 × 10 m, 3 m high, one shared shell | `scene.js` [C] |
| Eye height / FOV | 1.6 m / 70° vertical | `camera.js` [C] |
| Beam plane | y = 1.2 m (below eye level: the player looks slightly *down* at devices) | `constants.js` [C] |
| Typical gameplay distance | 2–8 m; worst case ≈ 14 m (room diagonal) | derived |
| Camera | first-person, no zoom | spec §4 |
| No post-processing, no shadows | | `technical-preferences.md` [C] |

On-screen size at 1080p (pinhole camera, 70° vertical FOV → focal length ≈ 771 px; pixels = size / distance × 771) — use this to size details; it's arithmetic, not taste:

| Feature | at 3 m | at 8 m |
|---|---|---|
| 0.03 m bevel | ≈ 8 px | ≈ 3 px |
| 0.10 m symbol | ≈ 26 px | ≈ 10 px (marginal) |
| 0.20 m symbol | ≈ 51 px | ≈ 19 px (readable) |
| 0.80 m receiver face | ≈ 206 px | ≈ 77 px |

**[R]** A detail smaller than ~10 px at 8 m (≈ 0.09 m) is invisible during play; it only exists for close inspection and is not worth modeling unless it is a texture. Gameplay-critical shapes (accessibility symbol, active-face outline, DoF cues) should be ≥ 0.2 m. Also: the demo may be recorded/streamed — dark scenes get crushed by video compression, which favours high contrast over subtle detail **[D: will a demo video be a deliverable?]**.

## 2. Art direction and visual identity

**[C]** Spec: minimalist; dark rooms; neutral surfaces; **beams are the main visual element**; restricted palette; high contrast beam-vs-scenery; no story, no characters; colour never means different things in different levels.
**[C]** The discovery's "Sci-fi Industrial Brutalist, clean" is *not* from the spec or team — it's an unratified suggestion.
**[C]** Rule of the hierarchy that follows from the spec: *beam > devices (state) > room.* Anything that competes upward is wrong.

**[D-1] Overall identity — *(resolved in direction by `design-premise.md`, E2)*.** The options below were the pre-premise alternatives; the premise corresponds to a darker, heavier, more institutional version of **B**, with dressing/detail from **C** only where it can't compete with beams. Kept for the consequences it records:

| Option | Look | Consequence |
|---|---|---|
| **A. Void minimalism** | Near-black matte shell, almost no surface detail; devices as clean simple solids with thin bright-neutral edge definition | Cheapest (few textures), maximum beam contrast, risks looking "untextured prototype" — and the spec *requires* textures on floor/walls/panels, so they'd be subtle grid/panel lines. Easy for an agent to stay consistent |
| **B. Quiet test lab (dark)** | Dark graphite panels, subtle panel seams, brushed-metal devices, light technical infrastructure | Most "game-like" and attractive; needs a texture set and a kit; moderate consistency risk; wear/detail needs discipline to avoid noise around beams |
| **C. Industrial brutalist** (discovery's) | Heavy chamfered masses, hex/octagon cutouts, visible bolts/conduits | Most detail per asset; highest risk of visual noise at beam height and of fighting the triangle/diamond symbols; largest agent-drift surface |

**[R → now guided by the premise]** Calm large surfaces, detail concentrated on devices and on a few story-implying infrastructure zones, kept below beam contrast everywhere else.

**[D-2] Mood — *(resolved by premise: institutional, analog, slightly uncanny; neutral/desaturated).*** Original note: Cold/clinical vs. warm/low-light vs. neutral. Practical consequence: the neutral grays set the *white balance* the viewer reads laser colours against. Cold-tinted scenery makes blue/cyan beams weaker and red/yellow stronger; warm does the opposite. The premise's neutral list (concrete gray, aged off-white, dark painted steel, muted industrial green, faded beige, black, oxidized metal) is warmer/greener than the 'cool gray' assumed here; the gallery compares candidate grades (§0.2-5).

## 3. Shape language and silhouettes

**[C]** Spec's accessibility shapes: circle, triangle, diamond. Anything else in that role is a different vocabulary and competes.
**[C]** Beam-plane geometry is flat (mirror/filter/receiver/portal are *planar* faces with a defined width: 1.0 / 0.8 / 0.8 / 1.2 m). The planar face must read as a face from every angle.
**[D-3] Primary shape vocabulary:**

| Option | Consequence |
|---|---|
| **Chamfered hard-surface** (45° bevels, faceted) | Catches light even with low ambient; chamfers look like diamonds/triangles → can blur with symbols unless symbols are *recessed + emissive* and bodies are subdued |
| **Soft-rounded** (capsules, large radii) | Circle symbol blends in; triangle/diamond pop. Fewer lighting highlights with a single directional light; rounded forms cost more triangles |
| **Boxy with tiny bevels** (what exists, refined) | Closest to the current code, cheapest, most agent-reliable; least character |

**[R]** Boxy bodies with consistent small bevels; character comes from proportion and one signature detail per device, not from complex forms. (This also keeps the symbol set the strongest shape language in the game.)

**Silhouette rules [R]:** every device must be identifiable from its silhouette alone against the dark background (emitter = cylinder/barrel, mirror = thin tall plate on a post, receiver = flat panel, filter = translucent plate in a frame, portal = tall frame, switch = low pedestal). Never give two families the same outline. **[D-4]** Whether silhouette identification matters more than a shared "family look" — they pull in opposite directions; the shared part should be small (bevel, materials, a connector motif).

## 4. Proportions, dimensions, origins — mostly [C], and the highest-risk area

**[C] Code-fixed dimensions today (`src/gameplay/*.js`):** mirror plate 1.0 × 1.0 × 0.05; receiver 0.8 × 0.8 × 0.05; filter 0.8 × 0.8 × 0.05; portal 1.2 × 2.2 × 0.1; door 2 × 3 × 0.15; emitter Ø0.3 × 0.5 (barrel along −Z); switch 0.6 × 0.3 × 0.6 + button Ø0.4 × 0.1; blocker parametric (default 1 × 1.4 × 0.2); player radius 0.35.
**[C] The 2D beam interaction width equals those numbers and is hardcoded.** A visual may be larger (frames), but the active face must equal the code's width, centred on the node origin, aligned with local X.
**[C] Axes:** metres, Y-up, rotation about Y only, forward = −Z, beam height 1.2 m.
**[C] Floating devices:** entities are positioned at their *centre at beam height* (receiver/mirror/filter/emitter/portal y = 1.2). Stands must therefore extend **downward** from the origin.

**[R] Origin convention** (so models drop into existing factories): *origin = centre of the active face (the plane the beam hits/reflects/leaves) at beam height; local X along the face; −Z is the "front".* The discovery's "pivot at the back base" would shift where beams stop by up to the model thickness. Exceptions: floor/wall modules (origin at floor, base-centre), switch (origin at floor), door (origin at centre of the slab, matching `y = 1.5`).

**[D-5] Active-face plane — *(resolved, E5: origin on the active face at beam height)*; open: which local direction is the 'front' (§0.2-9).** Original question: For a receiver 0.08 m deep, the beam currently ends at the node origin. Either the active face is at the origin (model extends backwards) — **[R]** — or code adds an offset. Same question for the emitter's muzzle: the beam starts at the emitter origin (the cylinder centre) today, so a visible muzzle must be *at the origin*, or the beam will appear to start inside the body.

**[D-6] Detail relief depth.** How far may details protrude beyond the active plane? Protrusions toward the player in front of a receiver can occlude the beam's last metre. **[R]** Zero protrusion in front of active faces; recesses only.

**Modularity [C/R]:** a 10 m wall divides by 2 m (5 tiles) but 3 m height does not — **[R]** one full-height 3 m panel (no vertical stacking), 2 m wide, with a 1 m half-panel for fills; floor 2 × 2 m tiles (5 × 5). Blockers are parametric in size [C] → they must be procedural (stretched/tiled material), not a fixed GLB.

## 5. Palette and reserved colours

**[C] Reserved gameplay hues (spec §7, `colors.js`):** red, green, blue, yellow, magenta, cyan, white — the full hue wheel plus white. Pure RGB values in logic.
**[C] Rule:** scenery and non-gameplay objects must never use these hues *saturated*.
**Problem found [C]:** current non-gameplay accents violate this: portal A `0x33aaff` (≈ cyan/blue), portal B `0xff7733` (≈ red/yellow), switch active `0x33ff33` (= green), switch idle `0x883300`.

**[D-7] Non-laser identity colour — *(resolved, E4: neutral only)*.** Original alternatives:

| Option | Consequence |
|---|---|
| **A. Neutral only** — identity via form, icon, luminance, motion; hue reserved for lasers | Cleanest; most accessible; portal A/B distinguished by icon/shape, not colour. Less visual variety |
| **B. One reserved "system accent"** (a hue clearly outside the 7, e.g. a warm amber ≈ between red and yellow, kept low-saturation) | One more thing to learn; amber risks reading as red/yellow beam under some colour-blindness; gives UI/portal/exit a shared cue |
| **C. Keep portal blue/orange** | Familiar; conflicts with cyan/blue/red/yellow beams → contradicts the "colour never ambiguous" NFR |

**[R] — now E4:** neutral only; add a system accent only if playtesting says exits/portals are hard to find. Caution (§0.1): a *neutral emissive* can read as the white laser.

**Display vs. logic colour [D-8]:** pure `#0000FF` on dark is much dimmer perceptually than `#00FF00`. Logic stays pure RGB; **should the *displayed* colour be tuned per hue for equal visual weight?** Consequence: better readability and colour-blind separation; an extra "display colour" token and care that composites (magenta/cyan/yellow) still look like the sum.

**Environment palette [D-9]:** pick 3–5 near-neutral values (floor, wall, structural metal, dark accent, light accent). **I will not invent hexes here;** the discovery's `#2A2B2E / #1E1F22 / #4A4D52` are a plausible start, to be validated *in the engine under the final lighting* with the beams on, not in a swatch. Constraint to test: floor/wall contrast must stay below beam contrast in every colour.

## 6. Materials

**[C]** Spec §13 needs: distinct ambient/diffuse/specular behaviour for (1) mirror metal, (2) matte scenery, (3) emissive beams/receivers; 2D textures on floor, walls, receiver and door panels.
**[C]** Today: all `MeshStandardMaterial`, no textures, no env map; mirror metalness 0.9 / roughness 0.1; walls default.
**Finding [C]:** with no environment map, a high-metalness material renders almost black (nothing to reflect except the two lights' specular highlights). The discovery's `metalness 0.80` "brushed steel" would look like black plastic.

**[D-10] Material model — *(baseline resolved: PBR + environment map, E3; values validate in gallery)*.**

| Option | Consequence |
|---|---|
| **A. Stay PBR (`MeshStandardMaterial`) + a neutral low-intensity env map** (procedural, e.g. a generated room environment) | Matches glTF natively; metals work; one small global addition. **[R]** |
| **B. PBR, keep metalness low (≤ ~0.3), fake "metal" with roughness/colour** | No env map; simplest; metal looks like painted plastic; fine for minimalist |
| **C. Phong-style (`MeshPhongMaterial`)** | Literally shows the spec's ambient/diffuse/specular coefficients (possibly easier to defend in the course); cannot come from GLB without runtime override; loses PBR consistency |

Whichever is chosen: **[R] GLB carries geometry + named material *slots*; the game builds materials in code from tokens, per instance when stateful** — removes the Blender-vs-Three look mismatch, keeps one source for colour/roughness, and makes option C possible later.

**Material families [R] (names stable; values [D] until validated in-engine):** `structure_matte` (floor/walls/housings), `device_metal` (frames/posts/mirror body), `mirror_face` (reflective plate), `emissive_state` (symbol + active-face channel), `glass_filter` (translucent), `trim_dark` (rails/seams). Roughness/metalness *ranges* belong to the lighting decision (§7); do not freeze numbers before then.
**[D-11] Textures:** which surfaces get textures, how (generated vs. procedural-in-canvas vs. authored tile), size and format. Spec requires floor, walls, receiver panels, door panels. Tiling floor/wall + one atlas for panels is the likely minimum. Texel density and sizes are **[D] to be measured** (don't adopt 1024 WebP blindly).

## 7. Lighting philosophy (decide before any material value is frozen)

**[C]** Spec: dark rooms, low ambient, beams act as dynamic light sources. Code: ambient 0.4 + directional 0.8 from (3, 4, 2) + one PointLight per beam (ADR 0003), no shadows. The current ambient+directional is *not* "dark" and lights every surface evenly, so today a device looks identical wherever the beam is.

**[D-12] Lighting model — *(resolved: option C, E3; intensities validate in gallery)*.**

| Option | Consequence |
|---|---|
| **A. Neutral fill (current)** | Everything legible; flat; beams' glow barely visible on surfaces — weaker spec "lighting" axis |
| **B. Low ambient + beams as the key light** | Dramatic, spec-aligned, makes the one-point-light-per-beam visible; devices far from beams fall to near-black → needs a minimum-visibility rule (faint fill, emissive edge cues) |
| **C. B + a faint hemisphere/fill + env map for metals** | Most controllable; **[R]** |

**Contrast and hierarchy rules [R]:** floor and walls darker than device bodies; devices darker than their emissive parts; emissive parts brightest, only ever in gameplay hues (§8). **Gameplay-distance readability test [R]:** every device must be recognisable and its state readable at 8 m from the room's darkest corner with the beam off.

## 8. Emissive language and interaction states

**[C]** Emissive colour means "this belongs to / needs that gameplay colour" (receiver emissive = target colour, emitter = its colour). Spec RF10: immediate feedback on laser active, receiver satisfied, door unlocked. Today: receiver 0.15 → 1.2 (step), emitter 0.4 → 1.0 on hover, switch toggles hue + hover boost, filter hover tint, generic hover = gray emissive 0x333333. **No visual difference between "hovered" and "grabbed"** (manipulation mode).
**Finding [C]:** no bloom/tone-mapping → emissive intensity above ~1 only clips to flat colour. The discovery's 1.5–2.0 "active" does nothing visible without a post-process.

**[R] Emissive rules:** (1) hue only ever = a gameplay colour (§5); (2) structural/ambient lights are non-emissive fixtures or very dim neutral, never glowing like a state; (3) states must differ by **shape/area as well as brightness** — e.g. idle = symbol outline lit only; satisfied = full face filled + pulse — which also satisfies colour-blind access and survives clipping.

**State vocabulary [R]** (single list used by code, specs and previews): `idle`, `hover`, `grabbed`, `active` (laser present / satisfied), `locked` (door closed), `unlocked`/`open`, `disabled` (DoF not enabled in this level).
**[D-13] Per-state look.** Needs a table the team signs off: for each device × state — what lights, what moves. Specifically decide: how `grabbed` differs from `hover`; whether `disabled` DoF is shown at all.
**[D-14] Affordance cues.** Each mirror/filter/emitter has an enabled DoF set per level (slide, rotate, both — controller flags exist). Options: (a) none, learn by trying (spec level 2/3 teach it); (b) optional parts toggled by code — rail visible only when slide enabled, a turntable ring only when rotate enabled. **[R]** (b): cheap, teaches the mechanic, and rails are procedural anyway.
**Pulse [R/D]:** spec asks a "pulse" on receiver activation; keep the frequency low (single pulse or ≤ ~2 Hz, never strobe — photosensitivity), and sync it with the existing confirm tone.
**Hover highlight [D-15]:** the generic hover tint is a gray emissive; white is a reserved hue. Alternatives: rim/outline in neutral, or a non-emissive brightening. **[R]** a neutral outline/scale-free brighten that never uses a gameplay hue and works on multi-mesh GLBs (hover currently needs a single mesh with `material.emissive`).

## 9. Accessibility markings

**[C]** Spec NFR: each laser colour gets a distinct geometric symbol (circle, triangle, diamond) on **emitters and receivers**. Spec does **not** say which symbol = which colour, nor what composites or white use, nor whether filters/portals carry them.
**[D-16] Mapping — *(NOT frozen; exploring in the gallery's symbol study)*.** Discovery's circle = red, triangle = green, diamond = blue is arbitrary but reasonable; any fixed mapping works — it just must be global and written once.
**[D-17] Composites and white — *(NOT frozen; gallery compares side-by-side / overlay / new shapes)*.**

| Option | Consequence |
|---|---|
| **A. Component symbols side by side** (magenta receiver shows circle + diamond) | Teaches additive mixing, no new symbols, but crowded on a 0.8 m face |
| **B. One new symbol per composite** (4 more) | Clear individually; 7 symbols to learn; contradicts the 3-symbol spec wording |
| **C. Overlaid outlines** (discovery's "union") | Compact; unreadable at distance if outlines merge |

**[R]** A. **[R]** Filters carry their primary's symbol too (they select a colour); portals none. **Rules [R]:** symbols are relief/recessed *and* emissive, ≥ 0.2 m, positioned on the face the player sees, readable in grayscale.

## 10. Conventions shared across Mirror, Emitter, Receiver, Filter, Portal, Switch

**[R]** A small common vocabulary, deliberately minimal (so silhouettes stay distinct):
- shared bevel size and a single dark structural material;
- a single "mount" language: **wall-mounted** (most receivers, 0.1 m off the wall, face outward) vs. **free-standing on a post/plinth** (mirrors, filters, emitters, level 5's central receiver, portals, switch). Receivers can be free-standing → they need a stand design too;
- a single recessed "active strip/face" idiom for where light enters/leaves;
- consistent front/back: front (−Z side, the interactive/active side) is detailed and lit; back is plain.

**What deliberately not to standardise:** exact outline per device (identity), size beyond code constants, internal greeble, per-level room dressing. **[D-18]** How much "family resemblance" you want vs. instantly distinct outlines (§3).

## 11. Doors, walls, floors, ceilings, infrastructure

**[C]** Today: no ceiling; walls are single-sided planes (inner face at ±5 m); door is one 2 × 3 m slab that slides **up 3 m**, can stand **free in the room** (level 8 door 1 at (2, 1.5, 2); the exit door is on the back wall in all eight levels) and its collider is removed instantly when logically open; level 10 is specified as a "multi-level" room (geometry unspecified).
**[D-19] Door form — *(resolved, E6: up-sliding)*; D-20 (ceiling / slot) remains open.**

| Option | Consequence |
|---|---|
| **Slab slides up (current)** | No code change; with a ceiling the slab passes through it → needs a ceiling slot/housing or no ceiling |
| **Slides sideways into a pocket** | Needs a wall pocket → free-standing doors (level 8) can't; code change to animation |
| **Two leaves part (iris-like)** | Reads best as "door", more complex; two meshes |

**[R]** Keep the up-slide and a slim frame that always works free-standing (post-and-lintel), with *no* ceiling over doors (or a ceiling with a door slot). **[D-20] Ceiling:** none (open void, cheapest, current look) vs. dark flat ceiling vs. technical ceiling grid with fixtures. A ceiling affects the door animation, light (fixtures are not allowed to look like emissive state), and the "multi-level" level 10.
**Room kit [R]:** the discovery's six pieces (floor tile, plain wall, technical wall, door frame, base trim, ceiling module) are a sensible *target*, but only the floor tile, wall panel and trim are needed for the spec's texture requirement; add the others if/when [D-19/20] are answered. **Constraint:** wall mesh inner face must stay at ±5 m or `constants.js`/segments change.
**Technical infrastructure (cables, conduits, vents) [D-21]:** purely decorative; put on the upper wall zone only (above ~2 m, away from beam plane 1.2 m ±0.4) to avoid being mistaken for devices. Yes/no is taste.

## 12. Rules for moving/mechanical parts

**[C]** Only vertical-axis rotation and straight-line slides (rail start→end, arbitrary per level, may be zero length) and the door's vertical slide; snap-rotation optional per level; no physics.
**[R]** Rotating parts rotate about their own origin and must look right at any angle (no "front" that exposes a seam); sliding parts ride visible rails (procedural, §8); the moving part and the static part are separate nodes with stable names; no part may clip the active face during motion; door footprint stays inside the collider footprint (2 × 0.15 m). Motion is code-driven: no authored clips unless a part genuinely can't be expressed as transform of a named node.

## 13. Detail, wear, signage, storytelling, other axes

| Area | Status | Notes |
|---|---|---|
| Hero vs. background | [R] | Tier 1 hero = devices (7 families, constant on screen, finest detail); Tier 2 = door frame, blocker, rails; Tier 3 = room kit (calm, tiled, lowest contrast). Detail density inversely proportional to risk of being mistaken for gameplay |
| Triangle / texture budgets | [D] measure | No numbers frozen: build the golden asset, measure on the weakest target machine **[D-22: which machine?]**, then set limits. 5000 tris / 1024 px from the discovery are unmeasured guesses |
| Wear / dirt | [D-23] | Pristine (cheap, clean, reads as "game-y") / light edge-wear in textures only (recommended: adds character without silhouette noise) / heavy grime (competes with beams, costs textures) |
| Decals, signage, numbering, typography | [C]/[D-24] | Spec §12 forbids logic symbols/formulas/technical terms; no narrative. Allowed in principle: level number plates, exit marking, direction chevrons. Language (PT/EN) and typeface **[D]**; **[R]** numerals and pictograms only, no sentences |
| Environmental storytelling | [C] | Spec scopes narrative out → **[R]** none |
| Level-to-level variation | [D-25] | Identical room look for all 10 vs. subtle progression (tint/density per phase tutorials / puzzles / finale). Must not change colour semantics |
| Photosensitivity / motion | [R] | Pulse/flicker limits (§8) |
| Colour management | [C]/[D] | Tone mapping and `outputColorSpace` have never been set; textures must be tagged sRGB, data maps linear; decide once with the lighting model |
| Collision/pick proxies | [C] | Gameplay geometry (segments, AABBs, pick target) stays code-owned; the visual may be multi-mesh but needs one registered pick target |
| Beam / impact VFX | [D-26] | Beam is a 1 px line today; thickness/core+glow/impact flare belong to the same visual language but are a separate asset class (code + materials), pending the same tone-mapping/bloom decision |
| Audio-visual pairing | [R] | One confirm tone exists; state visuals should line up with it |
| UI/HUD | [R] | Crosshair + symbols share the same shape vocabulary and neutral colours |

**Dimensions of a game-art design system you didn't list:** viewing distance & FOV (§1), colour management, photosensitivity, video/screenshot legibility, pick/hover affordance, state vocabulary, naming (assets, nodes, material slots, states), texel density/UV rules, runtime lifecycle (clone/dispose), difficulty-of-recreation (can an agent rebuild it from a spec?), and "what must stay procedural".

## 14. How the final design system should be represented in the repo

Principle: **one place per kind of fact; Markdown for taste, data only for numbers that code consumes; nothing built before something uses it.**

| Content | Form | Where | When |
|---|---|---|---|
| Art direction, shape language, mood, do/don't, per-state look, accessibility rules | Human Markdown, short, one rule per line with stable IDs (e.g. `SHAPE-03`) so agents can cite them | `design/visual/design-system.md` | After this discovery's decisions |
| Numbers shared by game and asset scripts: reserved colours (+display tint), device dimensions, beam height, state emissive values, material-family params, bevel size | `tokens.json` — **only** values duplicated elsewhere; consider generating/validating against `src/` constants so they can't drift | `design/visual/tokens.json` | When the first Blender script needs them |
| Per-family asset spec (dimensions, origin, active-face width, anchor node names, material slots, states, optional parts, symbol rules) | Markdown with a fixed template; promote to JSON only if/when a validator reads it | `assets/src/specs/<family>.md` | One at a time, receiver first |
| Materials | **Code** (a `materials` builder in Three, and the same names/values in the Blender script), not a binary `.blend` | `src/` + `assets/src/blender/` | With first GLB |
| Reference images | A handful: mood board, one chosen concept per hero family, the colour-state chart. Small PNG/WebP. AI-generated concepts only once chosen | `design/visual/reference/` | After art-direction decision |
| Golden assets | The first approved Receiver GLB + its spec + preview = the template every other spec/script copies. Also a **gallery page** in the game (`?debug&gallery`) showing all devices × states under the real lighting — doubles as preview renderer | `assets/models/`, `assets/src/` | After the receiver |
| Validation rules | A checklist in each spec first; then a small Node script (`@gltf-transform` inspect) once ≥ 2 assets exist. Checks: bbox vs spec, anchor nodes present, slot names allowed, triangle/texture sizes vs. *measured* budgets | `assets/src/` or `tools/` | When asset #2 appears |
| ADRs | (1) glTF/GLB allowed in runtime + import-map addon; (2) GLB = geometry+slots, materials in code; (3) origin convention | `docs/decisions/` | When decided |

**Not recommended now:** JSON schemas, `npm run asset:generate` orchestrators, `.blend` material libraries, multi-agent review loops, report files, vision-model review automation.

## 15. Questions to answer before freezing Design System v1

*Updated 2026-10-01: items 1 (GLB allowed), 3 (lighting/material baseline), 4 (neutral non-laser colour), 7 (origin) and the door form in 6 are **resolved** (§0). Still open and blocking: 2 (concrete architecture/material language within the premise), 5 (symbols — explore in the gallery first), the ceiling, the 'front' direction convention (§0.2-9), the beam-presence question (§0.2-3), and the §0.1 scope calls (lore content, per-phase variation).*

*Blocking (answer first):*
1. **Grading/scope check.** Does the course accept externally modeled (Blender→GLB) meshes for the modeling axis, or must visible geometry be generated in code (spec §13: "base meshes modeled once and reused")? A middle path — Blender-scripted geometry *exported* to code or GLB — exists either way. If GLB is not acceptable, the pipeline reduces to a procedural-in-Three kit and most of this plan shrinks. **Ask the instructor / re-read the course statement.**
2. **D-1 art direction** A / B / C (rec. B-from-A) and **D-2 mood**.
3. **D-12 lighting** (rec. C) and **D-10 material model** (rec. A + env map). These gate every material number.
4. **D-7 non-laser colour policy** (rec. neutral only) — portals/switch currently violate the reserved palette.
5. **D-16/17 symbol mapping and composite handling** (rec. circle/triangle/diamond mapping; side-by-side composites).
6. **D-19/20 door form and ceiling.**
7. **D-5 origin / active-face plane** (rec. origin = active face).

*Soon (before assets beyond the receiver):* D-3 shape vocabulary (rec. boxy), D-4 family resemblance, D-8 display-colour tuning, D-9 palette values (engine-validated), D-11 texture approach, D-13 per-state table, D-14 affordance cues (rec. optional rail/ring), D-15 hover/outline, D-6 relief depth.

*Defer:* D-21 conduits, D-22 target hardware & budgets, D-23 wear, D-24 signage language, D-25 per-level variation, D-26 beam/VFX.

*Practical unknowns:* is the demo recorded video? online or offline? is a GPU-less machine possible (Blender rendering) — **Blender isn't installed here**; is it acceptable for the team to install it (needed for any script-generated GLB)?

## 16. Recommended next steps

1. **Review the gallery with the team** (`npm start` → `/gallery/`; evidence in `design/visual/evidence/`): tune the lighting knobs until the room reads "dark but navigable"; compare palette grades; compare symbol mappings and composite styles at 4.5 m / mid / far corner and under the colour-blind views; judge beam thickness. Record choices in this document (small table per decision).
2. **Moodboard pass** from premise §14 (a few references per hero family and for the room), then decide architectural language, material palette, wear level (D-23) and shape vocabulary (D-3/D-4). The gallery's silhouette view is the check that the chosen shapes are distinguishable.
3. **Resolve the §0.1 scope calls** (lore/set-dressing text allowed? per-phase variation in or out?) so the room kit isn't built for a scope that gets cut.
4. **Write `design-system.md` v1 + `tokens.json`** with only frozen items, then build the **Receiver** golden asset and swap it into the gallery next to the grey box for a direct before/after.
5. Validator, Blender script template and loader (import-map `three/addons/`, preload-then-clone, per-instance materials, `disposeLevel` change) only after the receiver exists.
