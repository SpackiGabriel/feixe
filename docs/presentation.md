# Presentation rules (game feel)

How Feixe looks, moves and sounds — the rules behind the juice pass
(2026-11-05), and where each one lives in code. Art direction is
`design/visual/design-premise.md`; the frozen rules are
`design/visual/design-system.md`. This file covers *behaviour*: timing,
feedback, affordances. If you add an effect, it should follow these
rules or change them here.

## The rules

1. **Cause travels.** Every success is a visible chain: beam contact →
   receiver *charges* (ring fills) and *locks* (flare, kick, two-tone) →
   a pulse runs down its floor conduit → the door's pip fills → the door
   *releases* (clamps clank, panel sags 2 cm), *lifts* (ease-in-out,
   motor hum), *settles* (small bounce). Losing it drops back at once,
   with no anticipation. Only success gets a wind-up.
2. **Three tempos** (`src/presentation/motion.js` `TEMPO`, CSS `--snap/--act/--settle`):
   *snap* 90 ms (hover, grab, ticks), *act* 300 ms (charge, clamps,
   shutter), *settle* 800 ms (door lift, title). Nothing the player must
   wait for exceeds ~1.3 s (a door from locked to passable).
3. **Color means laser; brightness and shape mean machine.** R G B Y M C W
   appear only as beam light, receiver targets, filters, emitter muzzles
   and symbols. Every other device is neutral steel/off-white with a warm
   incandescent lamp (`0xffd9a8`): its state is *lit vs dark*, *filled vs
   empty*, *moving vs still* — never a hue.
4. **Affordance on approach.** Floor dial with 45° ticks = rotates. Twin
   rail with end stops = slides. Nothing = fixed. Idle they're faint (12%),
   on hover 70%, while held 100% (`presentation/affordances.js`). Hovering
   also frames the object with corner brackets and shows a key-glyph
   prompt.
5. **What you see is what blocks.** Doors have two states: *unlocked*
   (the puzzle rule, immediate — tests read this) and *passable* (the
   visible panel is ≥ 70% up — collision and the exit trigger read this).
   `presentation/door-motion.js` is reversible from any phase without
   jumps.
6. **Danger has its own language.** Traps: black slab, off-white chevrons,
   a lens that goes white-hot when lit; their conduits flash *cold and
   dashed* toward the door they hold shut; their door pip is a diamond.
7. **The camera stays precise.** No head bob, no rotational shake. Only
   a few millimetres of *translation* rumble near moving doors and on
   closing thuds, a −4° FOV lean-in while holding something, accel/decel
   on walking, and a slow drift behind the start menu. Effects are applied
   just before rendering and undone right after (`presentation/camera-fx.js`),
   so aiming and collision never see them. All off under
   `prefers-reduced-motion`.
8. **Diegetic UI.** An operator panel, not web dialogs: thin rules,
   condensed uppercase, mono numerals, a warm-white "beam" line as the
   only accent (`src/ui/ui.css`). Text names controls and actions only
   (spec §12).
9. **Progressive unreality, cheaply.** Fog density, darkness and the
   ambient drone's detune rise with the level index (`scene.js`
   `setAtmosphere`, `sfx.js` `setDroneIntensity`).
10. **Pulses ≤ 2 Hz** (design-system ACC-02): wrong-color receiver flicker,
    trap pip, warnings.

## Where things live

| Concern | Code |
|---|---|
| Gameplay → presentation events (`receiver:on`, `door:unlock`, `trap:on`, …) | `src/core/events.js` |
| Timing, easing, damping, reduced motion | `src/presentation/motion.js` |
| Door motion (pure, tested) / door look | `presentation/door-motion.js` / `presentation/door-view.js` |
| Conduits (route is pure, tested) | `presentation/conduits.js` |
| Dials, rails, grab pop, ticks, rail-end bump | `presentation/affordances.js` |
| Beam core/halo/flares/endpoint light | `gameplay/laser-beam.js` |
| Sounds (named cues) + drone | `presentation/sfx.js` |
| Camera effects | `presentation/camera-fx.js` |
| Room, lights, fog, lamps, numeral | `core/scene.js`, textures in `gameplay/textures.js` |
| Walls and floor shading (own Blinn-Phong, key `L` vertex/fragment) | `presentation/phong-material.js` |
| Mirror reflections (planar Reflector, menu "Reflexos") | `presentation/mirror-reflection.js` |
| Quality (pixel budget, reflections) | `presentation/quality.js` |
| HUD / menu + ending / shutter + intro | `ui/hud.js`, `ui/menu.js`, `ui/transitions.js`, `ui/ui.css` |

## Swapping in final assets

- **A modelled device** replaces the meshes built in its factory
  (`gameplay/<device>.js`, or `presentation/door-view.js` for doors).
  Keep: the aim target mesh with `userData.controller/prompt` (and let
  `createManipulable` set `setHovered`), the gameplay `segment`/collider
  math, and the children the presentation animates (door `panel`, pips;
  receiver face material's `emissiveIntensity`; portal surface uniforms).
- **A recorded sound** replaces one function in `sfx.js`'s `sfx` table;
  event wiring (`connectSfx`) stays.
- **Fonts**: none are loaded (offline requirement). `ui.css` uses system
  stacks (`--display`, `--mono`); a vendored font can be added with
  `@font-face` and those two variables.

## Performance budget

Measured 2026-11-05 on this laptop's Radeon 610M (a weak integrated GPU),
Chromium, 1920×1080: 4–15 ms/frame across all levels. Software WebGL
(the e2e) is ~10× slower and exaggerates fill cost; don't tune against it.
- Point lights are the expensive thing: one per beam (at its endpoint)
  plus one exit spill per level. Receivers and wall lamps have **no**
  lights (the lamps' glow is an additive texture). Don't add lights
  casually.
- Rendering is capped by a pixel budget (~2.1 MP on "Alta", 1.2 MP on
  "Baixa", `quality.js`), so high-DPI screens don't quadruple the cost.
