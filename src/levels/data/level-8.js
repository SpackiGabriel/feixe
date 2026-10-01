// Level 8 — "Sequência" (spec §11): one shared rotate-only mirror gates
// two doors that can't both be satisfied at once (rotating it to open
// door 1 necessarily un-satisfies door 2's receiver, and vice versa) —
// the player must open door 1, walk through, then come back and
// reconfigure for door 2. A full-width blocker (the "parede divisória")
// splits the room in two; the only way across is the first portal pair,
// used here purely to route the beam (and the player) around the wall
// instead of adding more mirrors.
//
// Door 1's receiver and the portal both sit on the room's south half —
// physically reachable at all times, since interaction is aim-based with
// no proximity requirement (see .claude/rules — mirrors/emitters can be
// manipulated from anywhere in range) and a closed door has never
// blocked beams (only receivers/blockers/portals/mirrors/walls do — see
// laser-system.js's segment list), only player *movement* past it.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

export const level8 = {
  id: 'level-8',
  mirrors: [
    {
      // Shared by both doors: +45° satisfies door 1 (r1, east wall),
      // 90° (edge-on, beam passes through unchanged) satisfies door 2 via
      // the portal. Starts at neither.
      id: 'm1',
      rail: { start: [0, BEAM_HEIGHT, 3], end: [0, BEAM_HEIGHT, 3] },
      initialT: 0.5,
      initialRotationY: -Math.PI / 4,
      positionEnabled: false,
      rotationEnabled: true,
    },
  ],
  emitters: [{ id: 'e1', position: [0, BEAM_HEIGHT, 4], colorName: 'red', initialRotationY: 0 }],
  receivers: [
    { id: 'r1', position: [ROOM_HALF - 0.1, BEAM_HEIGHT, 3], rotationY: Math.PI / 2, colorName: 'red' },
    { id: 'r2', position: [0, BEAM_HEIGHT, -(ROOM_HALF - 0.1)], rotationY: 0, colorName: 'red' },
  ],
  switches: [],
  filters: [],
  blockers: [
    // The dividing wall: spans the full room width, so the only way
    // across is the portal below — no gap to walk (or beam) around.
    { id: 'divider', position: [0, 1.5, 0], rotationY: 0, width: ROOM_HALF * 2, height: 3, thickness: 0.3 },
  ],
  portals: [
    {
      // Each end's rotationY faces *away* from the dividing wall, into
      // its own half of the room (matters for the player's landing push
      // in portal-crossing.js, not just the beam's exit direction).
      id: 'p1',
      a: { position: [0, BEAM_HEIGHT, 1], rotationY: Math.PI },
      b: { position: [0, BEAM_HEIGHT, -1], rotationY: 0 },
    },
  ],
  doors: [
    { id: 'd1', position: [2, 1.5, 2], rotationY: Math.PI, rule: 'AND', receiverIds: ['r1'] },
    { id: 'd2', position: [0, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r2'], exit: true },
  ],
};
