// Level 3 — "Ângulo" (spec §11): a mirror fixed in place that only
// rotates.
//
// Idea (design/campaign.md, L3): the beam turns twice as far as the
// mirror. The mirror starts face-on, so the beam comes straight back.
// Each 15° step of the mirror swings the beam 30°, along the south wall
// behind the player, to the receiver there. The conduit from the door
// (L1) leads the player to turn around and find it.
// In passing: at 90° the mirror is edge-on and the beam slips past it
// (L8 builds on it).
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const H = BEAM_HEIGHT;

export const level3 = {
  id: 'level-3',
  name: 'Ângulo',
  spawn: { position: [1.8, 3.4], yaw: 0.3 },
  mirrors: [
    {
      id: 'm1',
      rail: { start: [0, H, -1], end: [0, H, -1] }, // fixed position
      initialT: 0.5,
      initialRotationY: 0, // face-on: the beam returns along itself
      positionEnabled: false,
      rotationEnabled: true,
      rotationStepDegrees: 15,
    },
  ],
  emitters: [{ id: 'e1', position: [0, H, 4.6], colorName: 'red' }],
  // 30° west of straight back: 5.9 m × tan 30° ≈ 3.4 m along the south wall.
  receivers: [{ id: 'r1', position: [-3.4, H, ROOM_HALF - 0.1], rotationY: 0, colorName: 'red' }],
  switches: [],
  doors: [
    { id: 'd1', position: [0, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r1'], exit: true },
  ],
  scenarios: [
    { name: 'turning the wrong way swings the beam east, away from the receiver', config: { mirrors: { m1: { rotationY: Math.PI / 12 } } }, doors: { d1: false } },
  ],
  solution: { mirrors: { m1: { rotationY: -Math.PI / 12 } } }, // -15° → beam 30° west of south
};
