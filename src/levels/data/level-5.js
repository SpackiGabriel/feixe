// Level 5 — "Convergência" (spec §11): the same two-lane layout as level
// 4 (independent rotate-only mirrors for a fixed red and blue emitter),
// but both beams now bend *toward* the center instead of away from it,
// converging on one shared receiver that requires the additive composite
// (Magenta) instead of two separate receivers. Teaches additive mixing
// and the "AND" condition (spec §7 — a receiver only activates while both
// colors land on it at once).
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const LANE_X = 2.5; // matches level 4's lane spacing

export const level5 = {
  id: 'level-5',
  mirrors: [
    {
      id: 'm-red',
      rail: { start: [-LANE_X, BEAM_HEIGHT, 0], end: [-LANE_X, BEAM_HEIGHT, 0] },
      initialT: 0.5,
      initialRotationY: 0, // unsolved — target is +45° (Math.PI / 4), bends the beam to +X, toward center
      positionEnabled: false,
      rotationEnabled: true,
    },
    {
      id: 'm-blue',
      rail: { start: [LANE_X, BEAM_HEIGHT, 0], end: [LANE_X, BEAM_HEIGHT, 0] },
      initialT: 0.5,
      initialRotationY: 0, // unsolved — target is -45° (-Math.PI / 4), bends the beam to -X, toward center
      positionEnabled: false,
      rotationEnabled: true,
    },
  ],
  emitters: [
    { id: 'e-red', position: [-LANE_X, BEAM_HEIGHT, 4], colorName: 'red', initialRotationY: 0 },
    { id: 'e-blue', position: [LANE_X, BEAM_HEIGHT, 4], colorName: 'blue', initialRotationY: 0 },
  ],
  receivers: [
    // Sits between the two mirrors on their shared bounce line (z=0), well
    // clear of the opposite mirror's segment either way, so it's always
    // the nearest hit regardless of solve order (docs/findings.md).
    { id: 'r1', position: [0, BEAM_HEIGHT, 0], rotationY: Math.PI / 2, colorName: 'magenta' },
  ],
  switches: [],
  doors: [
    { id: 'd1', position: [0, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r1'], exit: true },
  ],
};
