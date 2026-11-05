// Level 8 — "Sequência" (spec §11): two doors in series. Wall A (z=2,
// with door 1 in its middle) and the dividing wall (z=0, no opening)
// split the room into a start area, a strip between the walls, and the
// north half with the exit. One shared rotate-only mirror feeds both:
// at +45° the beam lights r1 (east wall, start area) and opens door 1; at
// 90° (edge-on) it passes straight through door 1's opening into the
// portal in the strip and comes out north onto r2, opening the exit — but
// that also takes it off r1, closing door 1. So the player must open door
// 1, walk into the strip, then turn the mirror (aimed through the open
// doorway) and take the portal north. Introduces the first portal pair,
// used to get past the dividing wall without more mirrors.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

export const level8 = {
  id: 'level-8',
  name: 'Sequência',
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
  // Facing the mirror and door 1 from the corner, not the glass from 2 m.
  spawn: { position: [3.6, 4.3], yaw: 1.1 },
  blockers: [],
  walls: [
    // The dividing wall: full room width — the portal is the only way across.
    { from: [-ROOM_HALF, 0], to: [ROOM_HALF, 0], thickness: 0.3 },
    // Wall A, with door 1 filling the x ∈ [-1, 1] gap. Frosted glass, so the
    // strip behind it doesn't feel sealed off (it still blocks everything).
    { from: [-ROOM_HALF, 2], to: [-1, 2], style: 'glass' },
    { from: [1, 2], to: [ROOM_HALF, 2], style: 'glass' },
  ],
  portals: [
    {
      // Each end's rotationY faces *away* from the dividing wall, into
      // its own half of the room (matters for the player's landing push
      // in portal-crossing.js, not just the beam's exit direction).
      id: 'p1',
      // Flat on the dividing wall's two faces, so there's room to stand in
      // the strip (aiming back through door 1) without stepping into it.
      a: { position: [0, BEAM_HEIGHT, 0.25], rotationY: Math.PI },
      b: { position: [0, BEAM_HEIGHT, -0.25], rotationY: 0 },
    },
  ],
  doors: [
    { id: 'd1', position: [0, 1.5, 2], rotationY: 0, rule: 'AND', receiverIds: ['r1'] },
    { id: 'd2', position: [3, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r2'], exit: true },
  ],
  scenarios: [
    { name: 'mirror at +45° opens door 1 only', config: { mirrors: { m1: { rotationY: Math.PI / 4 } } }, doors: { d1: true, d2: false } },
    { name: 'mirror edge-on opens the exit and closes door 1', config: { mirrors: { m1: { rotationY: Math.PI / 2 } } }, doors: { d1: false, d2: true } },
  ],
  solution: { mirrors: { m1: { rotationY: Math.PI / 2 } } }, // edge-on: beam passes straight through to the portal
};
