// Level template — every field a level can use, with its defaults. Copy this
// file to level-N.js, rename the export, register it in level-manager.js's
// LEVELS list. Not registered itself, so it never shows up in the game.
// Full workflow: docs/level-authoring.md.
//
// Coordinates: metres. The room is 10×10, x and z both run -5..5. North
// (-Z) is "forward" from the default spawn; rotationY 0 faces -Z, and
// rotationY grows counter-clockwise seen from above (π/2 faces -X).
// Anything a beam must touch sits at y = BEAM_HEIGHT.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const H = BEAM_HEIGHT;

export const levelTemplate = {
  id: 'level-N', // unique, "level-<number>"
  name: 'Nome do nível', // shown on the title card

  // Where the player stands on load and on R (restart). Optional:
  // default is position [0, 4.5], yaw 0 (facing north).
  spawn: { position: [0, 4.5], yaw: 0 },

  // Mirrors: a base (slides on its rail) + a plate (rotates). With a
  // zero-length rail (start === end) the mirror is fixed in place.
  mirrors: [
    {
      id: 'm1',
      rail: { start: [-2, H, 0], end: [2, H, 0] },
      initialT: 0.5, // 0 = rail start, 1 = rail end
      initialRotationY: 0, // radians; π/4 = 45°
      positionEnabled: true, // player can slide it
      rotationEnabled: true, // player can rotate it
      rotationStepDegrees: null, // e.g. 45 to snap; null = free rotation
    },
  ],

  // Emitters: fixed position. Colors: 'red' | 'green' | 'blue' | 'white'.
  // Keep rotationEnabled false unless rotating the emitter IS the puzzle —
  // a rotatable emitter can usually be aimed straight at a receiver
  // (tests/unit/levels.test.js's shortcut test will catch that).
  emitters: [
    { id: 'e1', position: [0, H, 4], colorName: 'red', initialRotationY: 0, rotationEnabled: false, rotationStepDegrees: null },
  ],

  // Receivers: fixed panels, 0.8 m wide. colorName may be a primary or a
  // composite: 'yellow' (R+G), 'magenta' (R+B), 'cyan' (G+B), 'white'.
  // rotationY 0 = panel spans x (faces north/south); π/2 = spans z.
  // On a wall, put it 0.1 m inside: e.g. z = -(ROOM_HALF - 0.1).
  receivers: [
    { id: 'r1', position: [-(ROOM_HALF - 0.1), H, 0], rotationY: Math.PI / 2, colorName: 'red' },
  ],

  // Switches: a button the player clicks (no laser). Toggles on/off.
  switches: [
    // { id: 's1', position: [0, 0, 1], rotationY: 0 },
  ],

  // Filters: slide on a rail (never rotate); pass only their primary.
  filters: [
    // { id: 'f1', rail: { start: [-1, H, 2], end: [1, H, 2] }, initialT: 0, rotationY: 0, primaryName: 'red' },
  ],

  // Blockers: absorb beams and block the player. trap: true makes it a
  // NOT — any door listing it in forbidIds stays shut while it's lit.
  blockers: [
    // { id: 'b1', position: [3, H, 0], rotationY: Math.PI / 2, width: 1, height: 1.4, thickness: 0.2, trap: true },
  ],

  // Interior walls, by endpoints [x, z]. Absorb beams, block the player and
  // block aiming. Keep them axis-aligned (player collision is box-based).
  // style: 'glass' looks like frosted glass and blocks beams and the player
  // the same, but not aiming (devices behind it stay selectable).
  walls: [
    // { from: [-ROOM_HALF, 0], to: [-1, 0], height: 3, thickness: 0.2, style: 'solid' },
  ],

  // Portal pairs: a beam or the player entering one comes out of the
  // other. rotationY = the way the portal faces, away from its wall.
  portals: [
    // { id: 'p1', a: { position: [0, H, 0.25], rotationY: Math.PI }, b: { position: [0, H, -0.25], rotationY: 0 } },
  ],

  // Doors: 2 m wide. rule 'AND' (all listed active) or 'OR' (any).
  // receiverIds lists receiver or switch ids; an entry { any: ['a', 'b'] }
  // counts as active when either is (so: r1 AND (a OR b)).
  // Exactly one door has exit: true — walking up to it while open
  // finishes the level.
  doors: [
    {
      id: 'd1',
      position: [0, 1.5, -(ROOM_HALF - 0.1)],
      rotationY: Math.PI,
      rule: 'AND',
      receiverIds: ['r1'],
      forbidIds: [], // trap blocker ids
      exit: true,
    },
  ],

  // TEST-ONLY. A configuration that opens the exit, applied through the
  // player's own controls (a disabled degree of freedom makes it fail).
  // Get the numbers from the ?debug readout (aim at an object: t and rot).
  solution: {
    mirrors: { m1: { t: 0.5, rotationY: -Math.PI / 4 } },
    // filters: { f1: { t: 0.5 } },
    // emitters: { e1: { rotationY: 0 } },
    // switches: ['s1'],
  },

  // TEST-ONLY, optional: intermediate states to check (gates, traps,
  // alternative routes). Same `config` shape as `solution`.
  scenarios: [
    // { name: 'mirror at +45° misses', config: { mirrors: { m1: { rotationY: Math.PI / 4 } } }, doors: { d1: false } },
  ],
};
