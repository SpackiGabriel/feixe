# Grey-box gallery

Throwaway visual-evaluation page for the Feixe visual identity (`design/visual/`). **Not game code, not final assets** — it reuses the game's real room, factories (`src/gameplay/`), laser system, camera and controls so scale, lighting, readability and the beam/colour relationship are judged under real conditions. It changes nothing in `src/`; its own lighting rig, neutral palette, symbol decals and thick beams are local to this folder.

```
npm install        # three is served from node_modules (works offline)
npm start          # then open http://localhost:8000/gallery/
```

Click the scene to lock the mouse (WASD + mouse as in the game, Esc to use the panel). Keys: `1`–`5` stations · `B` beams · `O` door · `L` lighting preset · `V` cycle view (silhouette / grayscale / colour-blind sims) · `H` hide panel.

Scenes: `lineup` (real beam vignettes: emitter → [filter] → receiver; door; portal pair), `devices` (catalogue row), `symbols` (all 7 colours on receivers + 4 emitters), `level-1…8` (real levels; "Apply level solution" solves them; mirrors/filters are still draggable).

All panel values are knobs for evaluation, not decisions. URL parameters mirror the settings, e.g. `?scene=symbols&symbolStyle=overlay&view=deutan&station=mid`. `window.__gallery` exposes the state for scripted screenshots.

Scripted screenshots: `node gallery/shot.mjs out.png "scene=symbols&station=mid"` (needs the pinned Chromium, see `assets/README.md`).

Known gallery-only substitutions: switch and portal emissive hues are replaced by neutrals (the real factories still hardcode blue/orange/green — that mismatch is a finding, not fixed here); symbols are flat decals, not relief; beams-off is implemented by running the laser system with no emitters.
