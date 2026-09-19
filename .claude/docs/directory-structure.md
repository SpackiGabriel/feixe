# Directory Structure

```text
/
├── CLAUDE.md                    # Entry point — read this first
├── STATUS.md                    # Current focus / progress / next steps (the "hot" doc)
├── feixe-especificacao.pdf      # Authoritative spec — closed, never edited
├── .claude/                     # Skills, hooks, rules, docs (see below)
├── design/
│   └── game-concept.md          # Pillars, scope boundaries, build order
├── docs/
│   ├── decisions/                # ADRs — written when a decision is worth recording, not a gate
│   ├── findings.md               # Append-only log of implementation discoveries/gotchas
│   └── engine-reference/
│       └── threejs/VERSION.md    # Engine pin + version-risk notes
└── prototypes/                   # Throwaway validation code, isolated from src/
    └── mirror-reflection/
```

## Created on first real content (not pre-scaffolded)

- `src/` — game source, created when implementation of the first system
  begins. Expected shape once it exists: `src/core/` (renderer, scene,
  camera, input, raycasting), `src/gameplay/` (mirrors, emitters, laser
  sim, receivers/doors, portals), `src/levels/` (declarative level data,
  one file per level), `src/ui/` (minimal HUD / color-blind symbols).
- `tests/` — created when the first unit test is written (see
  `.claude/rules/test-standards.md`).
- `assets/` — created when the first real asset (texture, audio stinger)
  is added; `assets/data/` for level/config JSON (see
  `.claude/rules/data-files.md`).

Don't create these directories empty just to match this shape — create
them along with the file that actually needs them.

## `.claude/`

```text
.claude/
├── settings.json      # Hooks + permissions
├── statusline.sh
├── docs/
│   ├── directory-structure.md    # This file
│   ├── technical-preferences.md  # Engine/naming/performance reference
│   ├── setup-requirements.md
│   ├── CLAUDE-local-template.md
│   └── settings-local-template.md
├── rules/              # Path-scoped, auto-loaded when matching files are touched
│   ├── code-conventions.md   # THE source for code conventions (src/**)
│   ├── data-files.md         # assets/data/**
│   ├── prototype-code.md     # prototypes/**
│   └── test-standards.md     # tests/**
├── skills/              # ~9 slash commands — implement/review/decide/setup, no production ceremony
└── hooks/                # Session context, compaction preservation, JSON validation
```
