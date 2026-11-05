// Level 9 — "Circuito" (spec §11): two emitters (white, blue), a red
// filter, a trap blocker, an OR door and an AND door, all depending on one
// shared set of four mirrors. A dividing wall splits the room; its only
// opening is the OR door (the "gate"). The gate opens with either receiver
// in the south half lit (red on the west wall — needs the filter — or blue
// on the east wall). The exit, in the north half, needs magenta: the
// filtered white beam and the blue beam both sent north through the gate
// opening onto one receiver. Both doors stay shut while the trap is hit.
//
// The two doors can't be open at once (two beams, three receivers), so the
// player has to plan the order: route red north first (M1, M3, filter),
// keep blue on the gate's receiver, walk through, then turn M2 to send blue
// north as well — before the gate closes behind. Aiming the white beam east
// before M3 is in place lands it on the trap and slams the gate shut.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const H = BEAM_HEIGHT;
const WALL_Z = -1; // the dividing wall; the gate door fills x ∈ [-1, 1]

export const level9 = {
  id: 'level-9',
  name: 'Circuito',
  spawn: { position: [0.9, 3.4], yaw: 0 },
  mirrors: [
    // White beam's corner: -45° → west (gate receiver), +45° → east (toward M3).
    { id: 'm1', rail: { start: [-2, H, 2.5], end: [-2, H, 2.5] }, initialT: 0.5, initialRotationY: 0, positionEnabled: false, rotationEnabled: true },
    // Blue beam's corner: +45° → east (gate receiver), -45° → west (toward M4).
    { id: 'm2', rail: { start: [2, H, 1.5], end: [2, H, 1.5] }, initialT: 0.5, initialRotationY: 0, positionEnabled: false, rotationEnabled: true },
    // Slides onto the white beam's eastward line and turns it north.
    { id: 'm3', rail: { start: [-0.3, H, 2.5], end: [-0.3, H, 4.2] }, initialT: 1, initialRotationY: 0, positionEnabled: true, rotationEnabled: true },
    // Turns the westward blue beam north, beside the red one.
    { id: 'm4', rail: { start: [0.3, H, 1.5], end: [0.3, H, 1.5] }, initialT: 0.5, initialRotationY: 0, positionEnabled: false, rotationEnabled: true },
  ],
  emitters: [
    { id: 'e-white', position: [-2, H, 4.6], colorName: 'white', initialRotationY: 0 },
    { id: 'e-blue', position: [2, H, 4.6], colorName: 'blue', initialRotationY: 0 },
  ],
  receivers: [
    { id: 'r-red', position: [-(ROOM_HALF - 0.1), H, 2.5], rotationY: Math.PI / 2, colorName: 'red' },
    { id: 'r-blue', position: [ROOM_HALF - 0.1, H, 1.5], rotationY: Math.PI / 2, colorName: 'blue' },
    { id: 'r-magenta', position: [0, H, -(ROOM_HALF - 0.1)], rotationY: 0, colorName: 'magenta' },
  ],
  switches: [],
  filters: [
    { id: 'f-red', rail: { start: [-3.5, H, 3.5], end: [-0.5, H, 3.5] }, initialT: 1, rotationY: 0, primaryName: 'red' },
  ],
  blockers: [{ id: 'trap', position: [3.5, H, 2.5], rotationY: Math.PI / 2, trap: true }],
  walls: [
    { from: [-ROOM_HALF, WALL_Z], to: [-1, WALL_Z] },
    { from: [1, WALL_Z], to: [ROOM_HALF, WALL_Z] },
  ],
  doors: [
    { id: 'gate', position: [0, 1.5, WALL_Z], rotationY: 0, rule: 'OR', receiverIds: ['r-red', 'r-blue'], forbidIds: ['trap'] },
    { id: 'exit', position: [-3, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r-magenta'], forbidIds: ['trap'], exit: true },
  ],
  // Test-only checks of the intended logic (tests/unit/levels.test.js).
  scenarios: [
    { name: 'blue on its receiver opens the gate', config: { mirrors: { m2: { rotationY: Math.PI / 4 } } }, doors: { gate: true, exit: false } },
    { name: 'filtered white on the west receiver opens the gate', config: { filters: { 'f-red': { t: 0.5 } }, mirrors: { m1: { rotationY: -Math.PI / 4 } } }, doors: { gate: true } },
    { name: 'unfiltered white does not open the gate', config: { mirrors: { m1: { rotationY: -Math.PI / 4 } } }, doors: { gate: false } },
    {
      name: 'white sent east before m3 is placed hits the trap and shuts the gate',
      config: { mirrors: { m1: { rotationY: Math.PI / 4 }, m2: { rotationY: Math.PI / 4 } } },
      doors: { gate: false },
    },
    {
      name: 'red routed north while blue holds the gate (the order that works)',
      config: { filters: { 'f-red': { t: 0.5 } }, mirrors: { m1: { rotationY: Math.PI / 4 }, m2: { rotationY: Math.PI / 4 }, m3: { t: 0, rotationY: Math.PI / 4 } } },
      doors: { gate: true, exit: false },
    },
  ],
  // Final configuration (the exit); the gate is open on the way there.
  solution: {
    filters: { 'f-red': { t: 0.5 } },
    mirrors: {
      m1: { rotationY: Math.PI / 4 },
      m2: { rotationY: -Math.PI / 4 },
      m3: { t: 0, rotationY: Math.PI / 4 },
      m4: { rotationY: -Math.PI / 4 },
    },
  },
};
