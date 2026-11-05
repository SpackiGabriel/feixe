// Level 1 — "Primeiros passos" (spec §11): no laser. First-person
// movement and one switch that opens the exit on aim + confirm.
//
// Idea (design/campaign.md, L1): follow the line from the door to its
// cause. The player starts facing the locked door; its floor conduit runs
// back past their feet and turns east to the switch, which is out of view
// at the start. Every later level is read the same way (receiver → conduit
// → door pip).
// Hook: an unpowered mirror and receiver stand behind frosted glass in
// the north-west corner, a glimpse of what the next rooms are made of.
// They are not wired to anything.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const H = BEAM_HEIGHT;

export const level1 = {
  id: 'level-1',
  name: 'Primeiros passos',
  spawn: { position: [0, 3.6], yaw: 0 },
  mirrors: [
    // Display only: no degree of freedom, behind glass.
    { id: 'm-display', rail: { start: [-3.5, H, -3.2], end: [-3.5, H, -3.2] }, initialT: 0.5, initialRotationY: Math.PI / 4, positionEnabled: false, rotationEnabled: false },
  ],
  emitters: [],
  receivers: [{ id: 'r-display', position: [-(ROOM_HALF - 0.1), H, -3.2], rotationY: Math.PI / 2, colorName: 'red' }],
  switches: [{ id: 's1', position: [3.6, 0, 4], rotationY: -Math.PI / 2 }],
  walls: [
    { from: [-ROOM_HALF, -1.6], to: [-2, -1.6], style: 'glass' },
    { from: [-2, -1.6], to: [-2, -ROOM_HALF], style: 'glass' },
  ],
  doors: [
    { id: 'd1', position: [0, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['s1'], exit: true },
  ],
  solution: { switches: ['s1'] },
};
