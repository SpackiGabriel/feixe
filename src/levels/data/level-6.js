// Level 6 — "Bifurcação" (spec §11): one emitter, three mirrors that slide
// and rotate, and an OR door over two receivers. Only one of the two
// routes is possible, and the room says which if the player reads it.
//
// Idea (design/campaign.md, L6): plan before acting by matching the
// corners a route needs to the rails that can put a mirror there.
//   - Receiver A, on the south wall near the start, looks like the easy
//     one. It needs a beam heading south at x = -3.5, so a mirror must
//     stand at x = -3.5. No rail reaches it: M2's rail stops 0.9 m short,
//     so the best try lands the beam just beside A.
//   - Receiver B, in the side chamber, needs all three mirrors: M1 turns
//     the beam west, M2 turns it north through the chamber's doorway, and
//     M3 (inside the chamber) turns it west onto B.
// The door opens with either receiver (OR); seeing it open with one pip
// is the payoff. Mirrors snap to 45°, so beams only run along the room's
// axes and the plan can be read straight off the floor.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const H = BEAM_HEIGHT;
const ROW = 1.5; // the westward row M1 and M2 share
const COLUMN = -2.6; // the chamber doorway's column, M2 and M3 share

const mirror = (id, start, end, initialT, initialRotationY = 0) => ({
  id,
  rail: { start: [start[0], H, start[1]], end: [end[0], H, end[1]] },
  initialT,
  initialRotationY,
  positionEnabled: true,
  rotationEnabled: true,
  rotationStepDegrees: 45,
});

export const level6 = {
  id: 'level-6',
  name: 'Bifurcação',
  spawn: { position: [1.4, 4.1], yaw: 1.2 }, // facing west-north-west: A to the left, the beam and the chamber doorway ahead
  emitters: [{ id: 'e1', position: [3.5, H, 4.6], colorName: 'red' }],
  mirrors: [
    mirror('m1', [3.5, 3.5], [3.5, 0], 1, -Math.PI / 4), // on the emitter's column; starts sending the beam west along z = 0, a row nothing uses
    mirror('m2', [1, ROW], [COLUMN, ROW], 0), // its rail stops at x = -2.6, short of A's column
    mirror('m3', [COLUMN, -1.6], [COLUMN, -4], 0), // inside the chamber
  ],
  receivers: [
    { id: 'r-a', position: [-3.5, H, ROOM_HALF - 0.1], rotationY: 0, colorName: 'red' },
    { id: 'r-b', position: [-(ROOM_HALF - 0.1), H, -3], rotationY: Math.PI / 2, colorName: 'red' },
  ],
  switches: [],
  walls: [
    // The chamber in the north-west corner. Its doorway is the gap
    // between x = -3.2 and the partition at x = -2.
    { from: [-2, -ROOM_HALF], to: [-2, -1] },
    { from: [-ROOM_HALF, -1], to: [-3.2, -1] },
  ],
  doors: [
    { id: 'd1', position: [2, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'OR', receiverIds: ['r-a', 'r-b'], exit: true },
  ],
  scenarios: [
    {
      name: 'the closest try at A lands beside it and does not open the door',
      config: { mirrors: { m1: { t: 2 / 3.5, rotationY: -Math.PI / 4 }, m2: { t: 1, rotationY: Math.PI / 4 } } },
      doors: { d1: false },
    },
  ],
  solution: {
    mirrors: {
      m1: { t: 2 / 3.5 }, // slid to z = 1.5, already turning the beam west
      m2: { t: 1, rotationY: -Math.PI / 4 }, // x = -2.6, beam north through the doorway
      m3: { t: 1.4 / 2.4, rotationY: -Math.PI / 4 }, // z = -3, beam west onto B
    },
  },
};
