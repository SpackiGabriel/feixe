// Level 9 — "Circuito" (spec §11): two emitters (white, blue), a red
// filter, a trap, an OR door (the gate in the dividing wall) and an AND
// door (the exit), all depending on four shared mirrors.
//
// Idea (design/campaign.md, L9): one mirror can do two jobs at once.
// The exit needs red on the north receiver AND blue on the east receiver;
// the gate opens with blue on the east receiver OR on the decoy one. Both
// doors must be open together, since the player walks through one to the other.
//   - Red (white through the filter) has to go north through the gate's
//     gap at x = 0. The only mirror that can stand on that column is S,
//     and S is also where blue turns east. Red hits one face of S, blue the
//     other: one mirror, two beams.
//   - M2's rail on red's row is the naive plan ("turn red north here"):
//     it stops at x = -0.6, so red lands beside the receiver (as in L6).
//   - M4 is the tempting quick gate: blue onto the decoy receiver opens
//     the gate but starves the exit. The receiver both doors share has two
//     conduits, one to each door.
//   - Start: M1 sends the white beam into the trap (both doors' diamond
//     pips flash) and blue runs up the column onto the red receiver,
//     which flickers: wrong color.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const H = BEAM_HEIGHT;
const ROW = 2; // red's eastward row: M1 → M2's rail → S
const WALL_Z = -1;
const snapped = { rotationStepDegrees: 45 };

export const level9 = {
  id: 'level-9',
  name: 'Circuito',
  spawn: { position: [4.2, 4.3], yaw: 0.7 },
  emitters: [
    { id: 'e-white', position: [-3.5, H, 4.6], colorName: 'white' },
    { id: 'e-blue', position: [0, H, 4.6], colorName: 'blue' },
  ],
  mirrors: [
    // White's corner: -45° → west into the trap (start), +45° → east along the row.
    { id: 'm1', rail: { start: [-3.5, H, ROW], end: [-3.5, H, ROW] }, initialT: 0.5, initialRotationY: -Math.PI / 4, positionEnabled: false, rotationEnabled: true, ...snapped },
    // The naive plan: slides along red's row but stops short of the column.
    { id: 'm2', rail: { start: [-3, H, ROW], end: [-0.6, H, ROW] }, initialT: 0, initialRotationY: 0, positionEnabled: true, rotationEnabled: true, ...snapped },
    // S: slides onto blue's column, where red's row crosses it.
    { id: 's', rail: { start: [-1, H, ROW], end: [2, H, ROW] }, initialT: 1, initialRotationY: 0, positionEnabled: true, rotationEnabled: true, ...snapped },
    // The quick gate: turns blue east, low on the column, onto the decoy receiver.
    { id: 'm4', rail: { start: [-1, H, 3.5], end: [1.5, H, 3.5] }, initialT: 1, initialRotationY: 0, positionEnabled: true, rotationEnabled: true, ...snapped },
  ],
  filters: [{ id: 'f-red', rail: { start: [-4.5, H, 3.5], end: [-2, H, 3.5] }, initialT: 1, rotationY: 0, primaryName: 'red' }],
  receivers: [
    { id: 'r-red', position: [0, H, -(ROOM_HALF - 0.1)], rotationY: 0, colorName: 'red' },
    { id: 'r-blue', position: [ROOM_HALF - 0.1, H, ROW], rotationY: Math.PI / 2, colorName: 'blue' },
    { id: 'r-decoy', position: [ROOM_HALF - 0.1, H, 3.5], rotationY: Math.PI / 2, colorName: 'blue' },
  ],
  blockers: [{ id: 'trap', position: [-(ROOM_HALF - 0.4), H, ROW], rotationY: Math.PI / 2, trap: true }],
  switches: [],
  walls: [
    { from: [-ROOM_HALF, WALL_Z], to: [-1, WALL_Z] },
    { from: [1, WALL_Z], to: [ROOM_HALF, WALL_Z] },
  ],
  doors: [
    { id: 'gate', position: [0, 1.5, WALL_Z], rotationY: 0, rule: 'OR', receiverIds: ['r-blue', 'r-decoy'], forbidIds: ['trap'] },
    { id: 'exit', position: [3, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r-red', 'r-blue'], forbidIds: ['trap'], exit: true },
  ],
  scenarios: [
    { name: 'blue turned by S alone opens the gate only', config: { mirrors: { m1: { rotationY: 0 }, s: { t: 1 / 3, rotationY: Math.PI / 4 } } }, doors: { gate: true, exit: false } },
    { name: 'the quick gate via M4 starves the exit', config: { mirrors: { m1: { rotationY: 0 }, m4: { t: 0.4, rotationY: Math.PI / 4 } } }, doors: { gate: true, exit: false } },
    {
      name: 'unfiltered white on the red receiver does not open the exit',
      config: { mirrors: { m1: { rotationY: Math.PI / 4 }, s: { t: 1 / 3, rotationY: Math.PI / 4 } } },
      doors: { gate: true, exit: false },
    },
    {
      name: 'red turned north by M2 lands beside the receiver',
      config: { filters: { 'f-red': { t: 0.4 } }, mirrors: { m1: { rotationY: Math.PI / 4 }, m2: { t: 1, rotationY: Math.PI / 4 }, s: { t: 1 / 3, rotationY: Math.PI / 4 } } },
      doors: { gate: true, exit: false },
    },
    { name: 'white into the trap holds both doors shut', config: { mirrors: { s: { t: 1 / 3, rotationY: Math.PI / 4 } }, filters: { 'f-red': { t: 0.4 } } }, doors: { gate: false, exit: false } },
  ],
  solution: {
    filters: { 'f-red': { t: 0.4 } }, // x = -3.5, on white's column
    mirrors: {
      m1: { rotationY: Math.PI / 4 }, // white (now red) east along the row
      s: { t: 1 / 3, rotationY: Math.PI / 4 }, // x = 0: red east → north, blue north → east
    },
  },
};
