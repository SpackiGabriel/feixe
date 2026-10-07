// Level 7 — "Filtro" (spec §11): a white emitter (the sum of the three
// primaries) fires straight ahead; a red filter must be slid onto that
// exact line to isolate red before it reaches the receiver — an
// unfiltered white beam still physically reaches the receiver (nearest
// segment either way, docs/findings.md), it just never satisfies its
// red target, so the door stays shut. Teaches subtractive decomposition
// (RF04's filter segment ANDs color channels) and the "NOT" rule: the
// filter works by removing green and blue, not by adding red. A fixed
// blocker sits right where the filter starts (off-line, unsolved) as a
// spatial cue to slide clear of it toward the correct spot — no mirror
// in this level, so the blocker never actually intercepts the beam
// itself.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const BEAM_X = 2; // offset from center so the receiver clears the centered exit door

export const level7 = {
  id: 'level-7',
  mirrors: [],
  emitters: [{ id: 'e1', position: [BEAM_X, BEAM_HEIGHT, 4], colorName: 'white', initialRotationY: 0 }],
  receivers: [
    { id: 'r1', position: [BEAM_X, BEAM_HEIGHT, -(ROOM_HALF - 0.1)], rotationY: 0, colorName: 'red' },
  ],
  switches: [],
  filters: [
    {
      id: 'f1',
      rail: { start: [0.5, BEAM_HEIGHT, 2], end: [3.5, BEAM_HEIGHT, 2] },
      initialT: 0, // x=0.5 — off the beam's x=BEAM_X line, must be slid into place
      rotationY: 0,
      primaryName: 'red',
    },
  ],
  blockers: [{ id: 'b1', position: [0.5, BEAM_HEIGHT, 1.4], rotationY: 0 }],
  doors: [
    { id: 'd1', position: [0, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r1'], exit: true },
  ],
  solution: { filters: { f1: { t: 0.5 } } }, // x = BEAM_X on the 0.5..3.5 rail
};
