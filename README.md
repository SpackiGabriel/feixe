# Feixe

3D first-person laser/mirror puzzle game — Computação Gráfica final project (UTFPR).
Three.js r186, plain ES modules, no build step.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dev tooling (Vitest, ESLint). The game itself has no npm dependencies. |
| `npm start` | Serve the repo at `http://localhost:8000/` (ES modules don't load from `file://`). Needs internet: Three.js comes from a CDN import map (`docs/decisions/0001`). |
| `npm run lint` | ESLint over `src/` and `tests/` — catches undefined names and unused code. |
| `npm test` | Vitest unit tests (~1 s). Single file: `npx vitest run tests/unit/laser.test.js`. |

Node ≥ 22. In-game: WASD + mouse, click to lock the pointer, `R` restarts the current level.
Debug: open `http://localhost:8000/?debug&level=8` to jump to a level (1-based); `window.__feixe` exposes the runtime.
CI (`.github/workflows/ci.yml`) runs lint + tests on every push.

## Where to read next

- `CLAUDE.md` — project rules and workflow (for coding agents and humans alike).
- `STATUS.md` — what's built and what's next.
- `design/game-concept.md` — the game; `feixe-especificacao.pdf` — the closed spec.
- `docs/level-authoring.md` — building a level or a new gameplay object.
- `docs/decisions/`, `docs/findings.md` — why things are the way they are, and gotchas.
