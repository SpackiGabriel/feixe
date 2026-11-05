// Level 2 — "Reflexo" (spec §11): one fixed emitter and one mirror that
// only slides along a rail (fixed at 45°).
//
// Idea (design/campaign.md, L2): a mirror bends light where it stands,
// so moving it moves the reflected beam. The rail runs along the beam and
// the mirror already catches it, so the reflection is on screen from the
// first frame. Sliding sweeps it along the east wall, which is continuous
// feedback rather than a hit-or-miss switch.
// Hook: a short wall in the middle swallows the reflection for part of the
// slide (light stops at solid things; L6 builds on it), and the receiver
// sits past it, at the far end of the rail.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const H = BEAM_HEIGHT;
const BEAM_X = -3;
const RAIL_NEAR_Z = 3;
const RAIL_FAR_Z = -3.5;
const RECEIVER_Z = -2.5;

export const level2 = {
  id: 'level-2',
  name: 'Reflexo',
  spawn: { position: [1.4, 4.2], yaw: 0.35 },
  mirrors: [
    {
      id: 'm1',
      rail: { start: [BEAM_X, H, RAIL_NEAR_Z], end: [BEAM_X, H, RAIL_FAR_Z] },
      initialT: 0,
      initialRotationY: Math.PI / 4, // north-going beam → east
      positionEnabled: true,
      rotationEnabled: false,
    },
  ],
  emitters: [{ id: 'e1', position: [BEAM_X, H, 4.6], colorName: 'red' }],
  receivers: [{ id: 'r1', position: [ROOM_HALF - 0.1, H, RECEIVER_Z], rotationY: Math.PI / 2, colorName: 'red' }],
  switches: [],
  walls: [{ from: [0.5, -1], to: [0.5, 1.5] }],
  doors: [
    { id: 'd1', position: [2.5, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r1'], exit: true },
  ],
  scenarios: [
    { name: 'mid-rail the short wall swallows the reflection', config: { mirrors: { m1: { t: (RAIL_NEAR_Z - 0.2) / (RAIL_NEAR_Z - RAIL_FAR_Z) } } }, doors: { d1: false } },
  ],
  solution: { mirrors: { m1: { t: (RAIL_NEAR_Z - RECEIVER_Z) / (RAIL_NEAR_Z - RAIL_FAR_Z) } } },
};
