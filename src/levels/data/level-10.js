// Level 10 — "Prisma" (spec §11): three emitters (red, green, blue), a
// red filter, a trap, a portal pair, and one final door that needs, at
// once, yellow on one receiver (AND) and blue on either of two (OR).
//
// Idea (design/campaign.md, L10): synthesis, plus one new reading of the
// portal: it re-emits every beam from its center (seen in L8), so two
// beams entering it side by side leave as one line. That is how red and
// green become yellow; a reverse prism.
//   - Green's column already runs into the portal; red needs M1 and M2 to
//     shift over and enter beside it. The yellow receiver is only
//     reachable from the portal's far end.
//   - The red filter starts on green's column: to green and blue it is a
//     wall (L7). Slid too far east, it swallows blue instead.
//   - Blue has two ways to satisfy the OR: north through the east gap (M5
//     east, M6 north; forget M6 and blue runs into the trap), or south off
//     the back face of M2, the mirror red already uses (L9's idea).
// 4 mirrors instead of §11's 6: same object count as L8–9, less clutter
// (docs/decisions/0009).
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const H = BEAM_HEIGHT;
const WALL_Z = 0;
const ROW = 2; // red's and blue's shared row
const snapped = { rotationStepDegrees: 45 };

export const level10 = {
  id: 'level-10',
  name: 'Prisma',
  spawn: { position: [3.6, 4], yaw: 0.6 },
  emitters: [
    { id: 'e-red', position: [-4, H, 4.6], colorName: 'red' },
    { id: 'e-green', position: [-2, H, 4.6], colorName: 'green' },
    { id: 'e-blue', position: [2, H, 4.6], colorName: 'blue' },
  ],
  mirrors: [
    { id: 'm1', rail: { start: [-4, H, ROW], end: [-4, H, ROW] }, initialT: 0.5, initialRotationY: 0, positionEnabled: false, rotationEnabled: true, ...snapped },
    // Red's turn into the portal; its back face can send blue south.
    { id: 'm2', rail: { start: [-3.6, H, ROW], end: [-1.2, H, ROW] }, initialT: 1, initialRotationY: 0, positionEnabled: true, rotationEnabled: true, ...snapped },
    { id: 'm5', rail: { start: [2, H, ROW], end: [2, H, ROW] }, initialT: 0.5, initialRotationY: 0, positionEnabled: false, rotationEnabled: true, ...snapped },
    { id: 'm6', rail: { start: [3, H, ROW], end: [4.4, H, ROW] }, initialT: 1, initialRotationY: 0, positionEnabled: true, rotationEnabled: true, ...snapped },
  ],
  filters: [{ id: 'f-red', rail: { start: [-2.2, H, 3], end: [2.4, H, 3] }, initialT: 0, rotationY: 0, primaryName: 'red' }],
  receivers: [
    { id: 'r-yellow', position: [ROOM_HALF - 0.1, H, -2.5], rotationY: Math.PI / 2, colorName: 'yellow' },
    { id: 'r-blue-n', position: [3.7, H, -(ROOM_HALF - 0.1)], rotationY: 0, colorName: 'blue' },
    { id: 'r-blue-s', position: [-2.8, H, ROOM_HALF - 0.1], rotationY: 0, colorName: 'blue' },
  ],
  blockers: [{ id: 'trap', position: [ROOM_HALF - 0.25, H, ROW], rotationY: Math.PI / 2, trap: true }],
  switches: [],
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
      name: 'blue off the back of m2 onto the south receiver also works',
      config: { filters: { 'f-red': { t: 0.45 } }, mirrors: { m1: { rotationY: Math.PI / 4 }, m2: { t: 0.375, rotationY: Math.PI / 4 }, m5: { rotationY: -Math.PI / 4 } } },
      doors: { exit: true },
    },
    {
      name: 'm6 left out sends blue into the trap',
      config: { filters: { 'f-red': { t: 0.45 } }, mirrors: { m1: { rotationY: Math.PI / 4 }, m2: { t: 0.375, rotationY: Math.PI / 4 }, m5: { rotationY: Math.PI / 4 } } },
      doors: { exit: false },
    },
    {
      name: 'filter left on green starves the yellow receiver',
      config: { mirrors: { m1: { rotationY: Math.PI / 4 }, m2: { t: 0.375, rotationY: Math.PI / 4 }, m5: { rotationY: Math.PI / 4 }, m6: { t: 0.5, rotationY: Math.PI / 4 } } },
      doors: { exit: false },
    },
    {
      name: 'filter slid onto blue starves both blue receivers',
      config: { filters: { 'f-red': { t: 1 } }, mirrors: { m1: { rotationY: Math.PI / 4 }, m2: { t: 0.375, rotationY: Math.PI / 4 }, m5: { rotationY: Math.PI / 4 }, m6: { t: 0.5, rotationY: Math.PI / 4 } } },
      doors: { exit: false },
    },
    {
      name: 'green alone through the portal is not yellow',
      config: { filters: { 'f-red': { t: 0.45 } }, mirrors: { m5: { rotationY: Math.PI / 4 }, m6: { t: 0.5, rotationY: Math.PI / 4 } } },
      doors: { exit: false },
    },
  ],
  solution: {
    filters: { 'f-red': { t: 0.45 } }, // x ≈ -0.13, clear of green and blue
    mirrors: {
      m1: { rotationY: Math.PI / 4 }, // red east along the row
      m2: { t: 0.375, rotationY: Math.PI / 4 }, // x = -2.7: red north into the portal beside green
      m5: { rotationY: Math.PI / 4 }, // blue east
      m6: { t: 0.5, rotationY: Math.PI / 4 }, // x = 3.7: blue north through the gap
    },
  },
};
