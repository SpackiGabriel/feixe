# Directory Structure

```text
/
├── CLAUDE.md                    # Entry point — read this first
├── README.md                    # How to run / test / lint
├── STATUS.md                    # Current focus / progress / next steps (the "hot" doc)
├── feixe-especificacao.pdf      # Authoritative spec — closed, never edited
├── index.html                   # Import map (Three.js via CDN) + canvas host
├── package.json                 # Dev tooling only (vitest, eslint); the game has no build step
├── src/
│   ├── main.js                  # Wiring + animation loop
│   ├── core/                    # renderer, scene (room), camera, input, look, movement,
│   │                            #   interaction (aim raycast), manipulation (drag/rotate), audio
│   ├── gameplay/                # one factory per object (mirror, emitter, receiver, door,
│   │                            #   switch, filter, blocker, portal) + pure logic
│   │                            #   (laser.js, door-logic.js, aabb.js, colors.js) + laser-system.js
│   └── levels/
│       ├── data/level-N.js      # declarative level data (spec §10) — one file per level
│       ├── level-loader.js      # instantiateLevel / disposeLevel
│       ├── level-runtime.js     # current level, restart, exit + portal triggers
│       ├── level-manager.js     # level list + saved-level persistence
│       └── exit-trigger.js, portal-crossing.js   # pure proximity/landing math
├── tests/unit/                  # Vitest — see .claude/rules/test-standards.md
├── design/game-concept.md       # Pillars, scope boundaries, build order
├── docs/
│   ├── decisions/               # ADRs — written when a decision is worth recording, not a gate
│   ├── findings.md              # Append-only log of implementation discoveries/gotchas
│   ├── level-authoring.md       # Level data checklist + "adding a gameplay object" checklist
│   └── engine-reference/threejs/VERSION.md    # Engine pin + version-risk notes
├── prototypes/                  # Throwaway validation code, isolated from src/
└── .claude/                     # settings.json (permissions + hooks), rules/, skills/, hooks/, docs/
```

Level data lives in `src/levels/data/*.js` (plain JS objects), not JSON —
there is no `assets/` directory. Create one only when a real texture/audio
asset is added.
