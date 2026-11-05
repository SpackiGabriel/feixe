// Level 7 — "Filtro" (spec §11): a white emitter, a red filter that must
// be slid into the beam to isolate red for a distant receiver, and a trap
// next to the mirror.
//
// Idea (design/campaign.md, L7): two short stages, one new rule each.
//   1. Never feed the hazard. The mirror starts sending the beam into the
//      trap: its diamond pip on the door flashes and its conduit flares,
//      so the reason the door is shut is on screen before anything moves.
//   2. A filter removes colors. Turned west, the white beam reaches the red
//      receiver, which flickers: white contains red, but it isn't red.
//      Sliding the filter into the row strips green and blue away.
// A new-rule level is kept easy on purpose (two moves).
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const H = BEAM_HEIGHT;
const BEAM_X = 2;
const ROW = 1;

export const level7 = {
  id: 'level-7',
  name: 'Filtro',
  spawn: { position: [0.3, 4], yaw: -0.25 },
  mirrors: [
    {
      id: 'm1',
      rail: { start: [BEAM_X, H, ROW], end: [BEAM_X, H, ROW] },
      initialT: 0.5,
      initialRotationY: Math.PI / 4, // east, into the trap
      positionEnabled: false,
      rotationEnabled: true,
      rotationStepDegrees: 45,
    },
  ],
  emitters: [{ id: 'e1', position: [BEAM_X, H, 4.6], colorName: 'white' }],
  receivers: [{ id: 'r1', position: [-(ROOM_HALF - 0.1), H, ROW], rotationY: Math.PI / 2, colorName: 'red' }],
  filters: [
    // Crosses the westward row at a right angle; starts north of it.
    { id: 'f1', rail: { start: [-2, H, -2.5], end: [-2, H, 2.5] }, initialT: 0, rotationY: Math.PI / 2, primaryName: 'red' },
  ],
  blockers: [{ id: 'trap', position: [ROOM_HALF - 0.6, H, ROW], rotationY: Math.PI / 2, trap: true }],
  switches: [],
  doors: [
    { id: 'd1', position: [0, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r1'], forbidIds: ['trap'], exit: true },
  ],
  scenarios: [
    { name: 'filtered but still aimed at the trap stays shut', config: { filters: { f1: { t: 0.7 } } }, doors: { d1: false } },
    { name: 'unfiltered white on the red receiver stays shut', config: { mirrors: { m1: { rotationY: -Math.PI / 4 } } }, doors: { d1: false } },
  ],
  solution: { mirrors: { m1: { rotationY: -Math.PI / 4 } }, filters: { f1: { t: 0.7 } } }, // z = 1 on the -2.5..2.5 rail
};
