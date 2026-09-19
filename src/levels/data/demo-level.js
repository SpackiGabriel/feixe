// Declarative level data (spec §10, RF08): plain data only — positions as
// arrays, colors as names, no Three.js objects and no function calls.
// src/levels/level-loader.js is the "construtor de cena comum" that turns
// this into actual scene objects.
//
// TEMPORARY: this is the same rig used to validate the mirror/emitter/
// laser/receiver/door systems, now re-expressed as real declarative data
// to validate the loader itself. It stands in for the real numbered
// levels (design/game-concept.md §11) until those are built — see
// STATUS.md's "Levels 1-10" row.
const BEAM_HEIGHT = 1.2;
const ROOM_HALF = 5; // must match src/core/scene.js's ROOM_SIZE / 2

export const demoLevel = {
  id: 'demo',
  mirrors: [
    {
      id: 'm1',
      rail: { start: [0, BEAM_HEIGHT, 0], end: [0, BEAM_HEIGHT, 0] },
      initialT: 0.5,
      initialRotationY: Math.PI / 4,
      positionEnabled: false,
      rotationEnabled: true,
    },
  ],
  emitters: [{ id: 'e1', position: [0, BEAM_HEIGHT, 4], colorName: 'red', initialRotationY: 0 }],
  receivers: [
    { id: 'r1', position: [ROOM_HALF - 0.1, BEAM_HEIGHT, 0], rotationY: Math.PI / 2, colorName: 'red' },
  ],
  doors: [
    { id: 'd1', position: [0, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r1'] },
  ],
};
