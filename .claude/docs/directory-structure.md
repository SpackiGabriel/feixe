# Directory Structure

```text
/
├── CLAUDE.md                    # Entry point — read this first
├── README.md                    # How to run / test / lint
├── STATUS.md                    # Current focus / progress / next steps (the "hot" doc)
├── feixe-especificacao.pdf      # Authoritative spec — closed, never edited
├── index.html                   # Import map (vendored Three.js) + HUD styles + canvas host
├── vendor/three/                # Three.js r186 build, vendored so the game runs offline (ADR 0001)
├── package.json                 # Dev tooling only (vitest, eslint); the game has no build step
├── src/
│   ├── main.js                  # Wiring + animation loop
│   ├── core/                    # renderer, scene (room), camera, input, look, movement,
│   │                            #   interaction (aim raycast), manipulation (drag/rotate), audio
│   ├── presentation/            # game feel (docs/presentation.md): motion/timing, door motion+view,
│   │                            #   conduits, affordances, camera fx, sfx, quality, env map
│   ├── ui/                      # hud.js (crosshair, brackets, prompts), menu.js (menu + ending),
│   │                            #   transitions.js (shutter, intro), ui.css
│   ├── gameplay/                # one factory per object (mirror, emitter, receiver, door,
│   │                            #   switch, filter, blocker, wall, portal, rail) + pure logic
│   │                            #   (laser.js, door-logic.js, aabb.js, colors.js, rotation.js)
│   │                            #   + laser-system.js, laser-beam.js, textures.js (procedural)
│   └── levels/
│       ├── data/level-N.js      # declarative level data (spec §10) — one file per level
│       ├── data/level-template.js   # every level field, commented — copy to start a level
│       ├── level-loader.js      # instantiateLevel / disposeLevel
│       ├── level-runtime.js     # current level, restart, exit + portal triggers
│       ├── level-manager.js     # level list + saved-level persistence
│       └── exit-trigger.js, portal-crossing.js   # pure proximity/landing math
├── tests/unit/                  # Vitest — see .claude/rules/test-standards.md
├── tests/e2e/playthrough.mjs    # npm run e2e — Chromium playthrough of every level
├── tests/support/               # shared by unit + e2e (apply-solution.js)
├── design/game-concept.md       # Pillars, scope boundaries, build order
├── design/visual/               # Design premise, design-system discovery, gallery screenshots (evidence/)
├── gallery/                     # Grey-box visual-evaluation page (not game code; see gallery/README.md)
├── assets/                      # README only for now: planned layout for asset sources + GLBs
├── docs/
│   ├── decisions/               # ADRs — written when a decision is worth recording, not a gate
│   ├── research/                # Asset-pipeline research briefs/assessment (not specs)
│   ├── findings.md              # Append-only log of implementation discoveries/gotchas
│   ├── level-authoring.md       # Designer workflow: copy → preview → test → register
│   └── engine-reference/threejs/VERSION.md    # Engine pin + version-risk notes
├── prototypes/                  # Throwaway validation code, isolated from src/
└── .claude/                     # settings.json (permissions + hooks), rules/, skills/, hooks/, docs/
```

Level data lives in `src/levels/data/*.js` (plain JS objects), not JSON —
`assets/` holds only a README (planned layout); create its subfolders when
the first real asset file exists.
