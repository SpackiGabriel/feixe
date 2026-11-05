// Level 4 — "Duas cores" (spec §11): two emitters (red, blue), each with
// its own rotatable mirror and receiver, side by side and far enough
// apart on x that neither beam's path crosses the other's mirror or
// receiver. Teaches that different colors don't interfere and reinforces
// reading the color language (no receiver accepts the other's color).
// Both mirrors reuse level 3's fixed-position/rotate-only mechanic —
// the new thing here is running two independent instances of it at once.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const LANE_X = 2.5; // half-distance between the two lanes, keeps them well clear of each other

export const level4 = {
  id: 'level-4',
  name: 'Duas cores',
  mirrors: [
    {
      id: 'm-red',
      rail: { start: [-LANE_X, BEAM_HEIGHT, 0], end: [-LANE_X, BEAM_HEIGHT, 0] },
      initialT: 0.5,
      initialRotationY: 0, // unsolved — target is -45° (-Math.PI / 4), bends the beam to -X
      positionEnabled: false,
      rotationEnabled: true,
    },
    {
      id: 'm-blue',
      rail: { start: [LANE_X, BEAM_HEIGHT, 0], end: [LANE_X, BEAM_HEIGHT, 0] },
      initialT: 0.5,
      initialRotationY: 0, // unsolved — target is +45° (Math.PI / 4), bends the beam to +X
      positionEnabled: false,
      rotationEnabled: true,
    },
  ],
  emitters: [
    { id: 'e-red', position: [-LANE_X, BEAM_HEIGHT, 4], colorName: 'red', initialRotationY: 0 },
    { id: 'e-blue', position: [LANE_X, BEAM_HEIGHT, 4], colorName: 'blue', initialRotationY: 0 },
  ],
  receivers: [
    { id: 'r-red', position: [-(ROOM_HALF - 0.1), BEAM_HEIGHT, 0], rotationY: Math.PI / 2, colorName: 'red' },
    { id: 'r-blue', position: [ROOM_HALF - 0.1, BEAM_HEIGHT, 0], rotationY: Math.PI / 2, colorName: 'blue' },
  ],
  switches: [],
  doors: [
    {
      id: 'd1',
      position: [0, 1.5, -(ROOM_HALF - 0.1)],
      rotationY: Math.PI,
      rule: 'AND',
      receiverIds: ['r-red', 'r-blue'],
      exit: true,
    },
  ],
  solution: { mirrors: { 'm-red': { rotationY: -Math.PI / 4 }, 'm-blue': { rotationY: Math.PI / 4 } } },
};
