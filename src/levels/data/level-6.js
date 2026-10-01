// Level 6 — "Bifurcação" (spec §11, first "quebra-cabeças" level): one
// emitter, three mirrors (all move *and* rotate — the first level to ask
// for both degrees of freedom on every mirror at once), and an OR door
// over two receivers reachable by two independent, symmetric paths. No
// blocker object exists yet (that's level 7) — the "obstáculos" the
// player reasons about here are just the room's own walls: an unsolved
// or half-solved mirror simply sends the beam into a wall instead of
// either receiver, so the player has to work out a full path (junction
// mirror, then the matching branch mirror) rather than solving each
// mirror in isolation.
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

export const level6 = {
  id: 'level-6',
  mirrors: [
    {
      // Sits on the emitter's straight line and picks the branch: -45°
      // sends the beam left (toward m-left), +45° sends it right (toward
      // m-right). Starts off-line and unsolved, so both slide and rotate
      // are needed just to get the beam moving anywhere.
      id: 'm-junction',
      rail: { start: [-1, BEAM_HEIGHT, 2], end: [1, BEAM_HEIGHT, 2] },
      initialT: 0,
      initialRotationY: 0,
      positionEnabled: true,
      rotationEnabled: true,
    },
    {
      // Left branch: slides into the junction's z=2 bounce line, then
      // bends the beam from -X to +Z, toward r-left on the front wall.
      id: 'm-left',
      rail: { start: [-3, BEAM_HEIGHT, 0], end: [-3, BEAM_HEIGHT, 4] },
      initialT: 0,
      initialRotationY: 0,
      positionEnabled: true,
      rotationEnabled: true,
    },
    {
      // Right branch: mirror image of m-left.
      id: 'm-right',
      rail: { start: [3, BEAM_HEIGHT, 0], end: [3, BEAM_HEIGHT, 4] },
      initialT: 0,
      initialRotationY: 0,
      positionEnabled: true,
      rotationEnabled: true,
    },
  ],
  emitters: [{ id: 'e1', position: [0, BEAM_HEIGHT, 4], colorName: 'red', initialRotationY: 0 }],
  receivers: [
    { id: 'r-left', position: [-3, BEAM_HEIGHT, ROOM_HALF - 0.1], rotationY: 0, colorName: 'red' },
    { id: 'r-right', position: [3, BEAM_HEIGHT, ROOM_HALF - 0.1], rotationY: 0, colorName: 'red' },
  ],
  switches: [],
  doors: [
    {
      id: 'd1',
      position: [0, 1.5, -(ROOM_HALF - 0.1)],
      rotationY: Math.PI,
      rule: 'OR',
      receiverIds: ['r-left', 'r-right'],
      exit: true,
    },
  ],
  solution: {
    mirrors: {
      'm-junction': { t: 0.5, rotationY: -Math.PI / 4 }, // onto the beam line, bend left
      'm-left': { t: 0.5, rotationY: Math.PI / 4 }, // onto the z=2 bounce line
    },
  },
};
