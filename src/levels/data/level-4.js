// Level 4 — "Duas cores" (spec §11): red and blue emitters, each with its
// own rotate-only mirror, and two receivers that each want their own color.
//
// Idea (design/campaign.md, L4): color decides, not distance, and beams
// cross without interfering. Each emitter's nearest receiver is the other
// color, so red has to cross the room to the east wall, passing straight
// through blue's beam, and blue goes west.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const H = BEAM_HEIGHT;
const LANE_X = 2.5;
const RED_ROW = 1; // red's eastward row crosses blue's incoming column at (2.5, 1)
const BLUE_ROW = -1;
const mirror = (id, x, z) => ({
  id,
  rail: { start: [x, H, z], end: [x, H, z] },
  initialT: 0.5,
  initialRotationY: 0,
  positionEnabled: false,
  rotationEnabled: true,
  rotationStepDegrees: 15,
});

export const level4 = {
  id: 'level-4',
  name: 'Duas cores',
  spawn: { position: [0, 4.2], yaw: 0 },
  mirrors: [mirror('m-red', -LANE_X, RED_ROW), mirror('m-blue', LANE_X, BLUE_ROW)],
  emitters: [
    { id: 'e-red', position: [-LANE_X, H, 4.6], colorName: 'red' },
    { id: 'e-blue', position: [LANE_X, H, 4.6], colorName: 'blue' },
  ],
  receivers: [
    { id: 'r-red', position: [ROOM_HALF - 0.1, H, RED_ROW], rotationY: Math.PI / 2, colorName: 'red' },
    { id: 'r-blue', position: [-(ROOM_HALF - 0.1), H, BLUE_ROW], rotationY: Math.PI / 2, colorName: 'blue' },
  ],
  switches: [],
  doors: [
    { id: 'd1', position: [0, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r-red', 'r-blue'], exit: true },
  ],
  scenarios: [
    { name: 'one color alone is not enough', config: { mirrors: { 'm-red': { rotationY: Math.PI / 4 } } }, doors: { d1: false } },
  ],
  solution: { mirrors: { 'm-red': { rotationY: Math.PI / 4 }, 'm-blue': { rotationY: -Math.PI / 4 } } },
};
