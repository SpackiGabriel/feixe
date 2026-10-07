// Level 3 — "Ângulo" (spec §11): a mirror fixed in position but free to
// rotate. Emitter and mirror positions are fixed on the beam's line, so
// the only variable is the mirror's angle — the player rotates it until
// the reflection lands on the receiver, teaching the incidence/reflection
// angle relationship (RF03). Starts unsolved (rotationY=0 sends the beam
// straight back toward the emitter instead of sideways).
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

export const level3 = {
  id: 'level-3',
  mirrors: [
    {
      id: 'm1',
      rail: { start: [0, BEAM_HEIGHT, 0], end: [0, BEAM_HEIGHT, 0] }, // fixed position
      initialT: 0.5,
      initialRotationY: 0, // unsolved — the correct angle is -45° (-Math.PI / 4)
      positionEnabled: false,
      rotationEnabled: true,
    },
  ],
  emitters: [{ id: 'e1', position: [0, BEAM_HEIGHT, 4], colorName: 'red', initialRotationY: 0 }],
  receivers: [
    // Left wall this time (opposite of level 2's right-wall receiver), so
    // the 45° angle learned in level 2 doesn't carry over unchanged.
    { id: 'r1', position: [-(ROOM_HALF - 0.1), BEAM_HEIGHT, 0], rotationY: Math.PI / 2, colorName: 'red' },
  ],
  switches: [],
  doors: [
    { id: 'd1', position: [0, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r1'], exit: true },
  ],
  solution: { mirrors: { m1: { rotationY: -Math.PI / 4 } } },
};
