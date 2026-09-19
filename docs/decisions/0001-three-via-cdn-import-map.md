# 0001 — Load Three.js via CDN import map, no npm/bundler

## Context

The project is pinned to "no build step" and `three` as the only
dependency (`.claude/docs/technical-preferences.md`). There's no
`package.json` and no bundler, but plain browser ES modules still need
some way to resolve the bare specifier `import * as THREE from 'three'`.

## Decision

`index.html` declares a native `<script type="importmap">` that maps
`three` to `https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js`
(matching the pinned r186 in `docs/engine-reference/threejs/VERSION.md`).
`src/**` files import `three` normally with no other tooling involved.

## Alternatives considered

- **Vendor `three.module.js` into the repo** (e.g. `vendor/three/`): works
  offline and avoids a CDN dependency, but adds a binary-ish file to
  version control and a manual step to bump it. Reasonable fallback if
  CDN access becomes a problem in grading/demo conditions.
- **npm + bundler**: rejected outright — contradicts the explicit "no
  build step" preference.

## Consequences

Running the game locally requires serving `index.html` over HTTP (ES
modules don't load from `file://`) and an internet connection for the
CDN fetch — e.g. `python3 -m http.server` from the repo root, then open
`http://localhost:<port>/`. If CDN access turns out to be unavailable
during grading/demo, switch to the vendored-file alternative above.
