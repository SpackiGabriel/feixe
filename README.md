# Feixe

3D first-person laser/mirror puzzle game — Computação Gráfica final project (UTFPR).
Three.js r186, plain ES modules, no build step.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dev tooling (Vitest, ESLint). The game itself has no npm dependencies. |
| `npm start` | Serve the repo at `http://localhost:8000/` (ES modules don't load from `file://`). Works offline: Three.js is vendored in `vendor/three/` (`docs/decisions/0001`). |
| `npm run lint` | ESLint over `src/` and `tests/` — catches undefined names and unused code. |
| `npm test` | Vitest unit tests (~1 s), incl. headless validation of every level. Single file: `npx vitest run tests/unit/laser.test.js`. |
| `npm run e2e` | Plays every level in headless Chromium (software WebGL, ~90 s, offline). Once per machine: `npx playwright-core install chromium`. `node tests/e2e/playthrough.mjs --shots <dir>` also saves a screenshot per level. |

Node ≥ 22. CI (`.github/workflows/ci.yml`) runs lint, unit tests and the e2e playthrough on every push.

## Playing

Open `http://localhost:8000/` and choose **Iniciar / Continuar** (mouse or ↑↓ + Enter). Progress is
saved per browser; **Novo jogo** starts over. The menu also has **Qualidade** (Alta/Baixa) and **Som**.
WASD move · mouse look · click grabs/releases/presses the object under the crosshair ·
while holding: mouse slides or rotates; objects that do both rotate with the wheel or Q/E ·
`R` restart level · `+`/`−` field of view · `M` sound · `Esc` pause.

Debug / level authoring: `http://localhost:8000/?debug&level=N` jumps to level N, shows a live
panel (F3) with positions, the aimed object's rail `t`/rotation, and receiver/door states.
Building levels: `docs/level-authoring.md`.

## Delivering

No build step. The deliverable is the repository as-is (or a zip of it without `node_modules/`):
serve the folder with any static server (`npm start`, or `python3 -m http.server 8000`) and open
`index.html` in a desktop browser with WebGL. No internet needed.

## Where to read next

- `CLAUDE.md` — project rules and workflow (for coding agents and humans alike).
- `STATUS.md` — what's built and what's next.
- `design/game-concept.md` — the game; `feixe-especificacao.pdf` — the closed spec.
- `docs/level-authoring.md` — building a level (designer workflow) or a new gameplay object.
- `docs/presentation.md` — game-feel rules (timing, feedback, affordances) and how to swap in final assets.
- `docs/decisions/`, `docs/findings.md` — why things are the way they are, and gotchas.
