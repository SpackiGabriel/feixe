// Level 10 — "Prisma" (spec §11): every element at once — three emitters
// (red, green, blue), six mirrors (some slide, all rotate), a filter, a
// trap blocker, a portal pair, and one final door that needs, at the same
// time, an AND (yellow on one receiver) and an OR (blue on either of two
// receivers), and the trap unlit.
//
// A wall splits the room, open only at its east end. Yellow lives in the
// north half and is only reachable through the portal: red and green both
// enter portal A heading north and leave portal B together on one line —
// the "prism" — onto the yellow receiver. Blue must stay out of the portal
// (it would turn the stream white) and reach either the north wall through
// the gap (M5 → M6) or the south wall by bouncing off the back of the
// mirror red already uses (M2). If M6 isn't turned, blue runs east into the
// trap. The red filter starts on green's line and swallows it until slid
// clear — but slid too far, it swallows blue instead.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const H = BEAM_HEIGHT;
const WALL_Z = 0;

export const level10 = {
  id: 'level-10',
  name: 'Prisma',
  spawn: { position: [3.2, 4], yaw: 0 },
  mirrors: [
    { id: 'm1', rail: { start: [-4, H, 2], end: [-4, H, 2] }, initialT: 0.5, initialRotationY: 0, positionEnabled: false, rotationEnabled: true },
    // Red's turn into the portal; its back face can send blue south (r-blue-s).
    { id: 'm2', rail: { start: [-3.6, H, 2], end: [-2, H, 2] }, initialT: 0, initialRotationY: 0, positionEnabled: true, rotationEnabled: true },
    { id: 'm3', rail: { start: [-1, H, 1], end: [-1, H, 1] }, initialT: 0.5, initialRotationY: 0, positionEnabled: false, rotationEnabled: true },
    { id: 'm4', rail: { start: [-2, H, 1], end: [-2, H, 1] }, initialT: 0.5, initialRotationY: 0, positionEnabled: false, rotationEnabled: true },
    { id: 'm5', rail: { start: [1.5, H, 2], end: [1.5, H, 2] }, initialT: 0.5, initialRotationY: 0, positionEnabled: false, rotationEnabled: true },
    { id: 'm6', rail: { start: [3, H, 2], end: [4.5, H, 2] }, initialT: 0, initialRotationY: 0, positionEnabled: true, rotationEnabled: true },
  ],
  emitters: [
    { id: 'e-red', position: [-4, H, 4.6], colorName: 'red', initialRotationY: 0 },
    { id: 'e-green', position: [-1, H, 4.6], colorName: 'green', initialRotationY: 0 },
    { id: 'e-blue', position: [1.5, H, 4.6], colorName: 'blue', initialRotationY: 0 },
  ],
  receivers: [
    { id: 'r-yellow', position: [ROOM_HALF - 0.1, H, -2.5], rotationY: Math.PI / 2, colorName: 'yellow' },
    { id: 'r-blue-n', position: [3.75, H, -(ROOM_HALF - 0.1)], rotationY: 0, colorName: 'blue' },
    { id: 'r-blue-s', position: [-2.8, H, ROOM_HALF - 0.1], rotationY: 0, colorName: 'blue' },
  ],
  switches: [],
  filters: [
    { id: 'f-red', rail: { start: [-1.6, H, 3], end: [2.1, H, 3] }, initialT: 0.6 / 3.7, rotationY: 0, primaryName: 'red' },
  ],
  blockers: [{ id: 'trap', position: [4.75, H, 2], rotationY: Math.PI / 2, trap: true }],
  walls: [{ from: [-ROOM_HALF, WALL_Z], to: [2.5, WALL_Z] }],
  portals: [
    {
      id: 'p1',
      a: { position: [-2.4, H, WALL_Z + 0.15], rotationY: Math.PI }, // on the wall's south face, facing south
      b: { position: [-(ROOM_HALF - 0.15), H, -2.5], rotationY: -Math.PI / 2 }, // on the west wall, facing east
    },
  ],
  doors: [
    {
      id: 'exit',
      position: [0, 1.5, -(ROOM_HALF - 0.1)],
      rotationY: Math.PI,
      rule: 'AND',
      receiverIds: ['r-yellow', { any: ['r-blue-n', 'r-blue-s'] }],
      forbidIds: ['trap'],
      exit: true,
    },
  ],
  scenarios: [
    {
      name: 'blue bounced off the back of m2 onto the south receiver also works',
      config: {
        filters: { 'f-red': { t: 0.5 } },
        mirrors: { m1: { rotationY: Math.PI / 4 }, m2: { t: 0.5, rotationY: Math.PI / 4 }, m3: { rotationY: -Math.PI / 4 }, m4: { rotationY: -Math.PI / 4 }, m5: { rotationY: -Math.PI / 4 } },
      },
      doors: { exit: true },
    },
    {
      name: 'm6 left edge-on sends blue into the trap',
      config: {
        filters: { 'f-red': { t: 0.5 } },
        mirrors: { m1: { rotationY: Math.PI / 4 }, m2: { t: 0.5, rotationY: Math.PI / 4 }, m3: { rotationY: -Math.PI / 4 }, m4: { rotationY: -Math.PI / 4 }, m5: { rotationY: Math.PI / 4 } },
      },
      doors: { exit: false },
    },
    {
      name: 'filter left on the green line starves the yellow receiver',
      config: { mirrors: { m1: { rotationY: Math.PI / 4 }, m2: { t: 0.5, rotationY: Math.PI / 4 }, m3: { rotationY: -Math.PI / 4 }, m4: { rotationY: -Math.PI / 4 }, m5: { rotationY: Math.PI / 4 }, m6: { t: 0.5, rotationY: Math.PI / 4 } } },
      doors: { exit: false },
    },
    {
      name: 'filter slid onto the blue line starves both blue receivers',
      config: {
        filters: { 'f-red': { t: 3.1 / 3.7 } }, // x = 1.5, on blue's line
        mirrors: { m1: { rotationY: Math.PI / 4 }, m2: { t: 0.5, rotationY: Math.PI / 4 }, m3: { rotationY: -Math.PI / 4 }, m4: { rotationY: -Math.PI / 4 }, m5: { rotationY: Math.PI / 4 }, m6: { t: 0.5, rotationY: Math.PI / 4 } },
      },
      doors: { exit: false },
    },
  ],
  solution: {
    filters: { 'f-red': { t: 0.5 } }, // x = 0.25, clear of green (x=-1) and blue (x=1.5)
    mirrors: {
      m1: { rotationY: Math.PI / 4 },
      m2: { t: 0.5, rotationY: Math.PI / 4 }, // x = -2.8
      m3: { rotationY: -Math.PI / 4 },
      m4: { rotationY: -Math.PI / 4 },
      m5: { rotationY: Math.PI / 4 },
      m6: { t: 0.5, rotationY: Math.PI / 4 }, // x = 3.75
    },
  },
};
