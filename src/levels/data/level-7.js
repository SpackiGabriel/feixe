// Level 7 — "Filtro" (spec §11): a white emitter (the sum of the three
// primaries) and a red receiver far away on the west wall. A rotate-only
// mirror (taught in level 3) chooses where the beam goes: west, through
// the filter's rail, toward the receiver; or east into a nearby trap
// blocker (spec §7 NOT: while any beam hits it, the exit stays shut). The
// filter must be slid onto the beam's line to strip green and blue off the
// white beam — unfiltered white reaches the receiver but never satisfies
// its red target. Teaches subtractive decomposition and the "NOT" rule.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const BEAM_X = 2; // emitter/mirror column, offset from the centered exit door
const BOUNCE_Z = 0; // the mirror's row; the reflected beam runs along it

export const level7 = {
  id: 'level-7',
  name: 'Filtro',
  mirrors: [
    {
      id: 'm1',
      rail: { start: [BEAM_X, BEAM_HEIGHT, BOUNCE_Z], end: [BEAM_X, BEAM_HEIGHT, BOUNCE_Z] }, // fixed position
      initialT: 0.5,
      initialRotationY: Math.PI / 4, // starts sending the beam east, into the trap
      positionEnabled: false,
      rotationEnabled: true,
    },
  ],
  emitters: [{ id: 'e1', position: [BEAM_X, BEAM_HEIGHT, 4], colorName: 'white', initialRotationY: 0 }],
  receivers: [
    { id: 'r1', position: [-(ROOM_HALF - 0.1), BEAM_HEIGHT, BOUNCE_Z], rotationY: Math.PI / 2, colorName: 'red' },
  ],
  switches: [],
  filters: [
    {
      id: 'f1',
      // Crosses the westward beam line at a right angle; starts off it.
      rail: { start: [-2, BEAM_HEIGHT, -3], end: [-2, BEAM_HEIGHT, 1] },
      initialT: 0,
      rotationY: Math.PI / 2, // panel spans z, facing the beam
      primaryName: 'red',
    },
  ],
  blockers: [{ id: 'trap', position: [3.6, BEAM_HEIGHT, BOUNCE_Z], rotationY: Math.PI / 2, trap: true }],
  doors: [
    {
      id: 'd1',
      position: [0, 1.5, -(ROOM_HALF - 0.1)],
      rotationY: Math.PI,
      rule: 'AND',
      receiverIds: ['r1'],
      forbidIds: ['trap'],
      exit: true,
    },
  ],
  solution: { mirrors: { m1: { rotationY: -Math.PI / 4 } }, filters: { f1: { t: 0.75 } } }, // z = 0 on the -3..1 rail
};
