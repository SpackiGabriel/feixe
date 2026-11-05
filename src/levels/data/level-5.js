// Level 5 — "Convergência" (spec §11): the two beams of level 4 (same
// emitters, same mirror spots) must now reach one magenta receiver
// together.
//
// Idea (design/campaign.md, L5): beams that crossed without effect in L4
// add up where they land. Blue's mirror starts already aimed at the
// magenta receiver, so the receiver flickers from the first frame:
// something arrives, but blue alone is not magenta. The receiver's face
// shows both symbols (circle + diamond). Turning red onto it completes
// the color.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const H = BEAM_HEIGHT;
const LANE_X = 2.5;
const RED_ROW = 1;
const BLUE_ROW = -1;
// Blue leaves its mirror 30° west of south and meets red's row here:
// 2.5 - 2 × tan 30° ≈ 1.35.
const MEET_X = LANE_X - 2 * Math.tan(Math.PI / 6);
const mirror = (id, x, z, initialRotationY) => ({
  id,
  rail: { start: [x, H, z], end: [x, H, z] },
  initialT: 0.5,
  initialRotationY,
  positionEnabled: false,
  rotationEnabled: true,
  rotationStepDegrees: 15,
});

export const level5 = {
  id: 'level-5',
  name: 'Convergência',
  spawn: { position: [0, 4.2], yaw: 0 },
  mirrors: [mirror('m-red', -LANE_X, RED_ROW, 0), mirror('m-blue', LANE_X, BLUE_ROW, -Math.PI / 12)],
  emitters: [
    { id: 'e-red', position: [-LANE_X, H, 4.6], colorName: 'red' },
    { id: 'e-blue', position: [LANE_X, H, 4.6], colorName: 'blue' },
  ],
  receivers: [{ id: 'r1', position: [MEET_X, H, RED_ROW], rotationY: Math.PI / 2, colorName: 'magenta' }],
  switches: [],
  doors: [
    { id: 'd1', position: [0, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r1'], exit: true },
  ],
  scenarios: [
    { name: 'red alone on the magenta receiver is not enough', config: { mirrors: { 'm-red': { rotationY: Math.PI / 4 }, 'm-blue': { rotationY: 0 } } }, doors: { d1: false } },
  ],
  solution: { mirrors: { 'm-red': { rotationY: Math.PI / 4 } } }, // blue is already on it
};
