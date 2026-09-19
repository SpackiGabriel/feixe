// Level 2 — "Reflexo" (spec §11): a fixed emitter and a mirror that only
// moves along a rail (no rotation). The mirror's rail crosses the
// emitter's fixed beam line at a right angle, so the beam only reflects
// once the mirror is slid into that exact spot — teaching reflection and
// moving an interactive object along a rail (RF02).
const BEAM_HEIGHT = 1.2;
const ROOM_HALF = 5; // must match src/core/scene.js's ROOM_SIZE / 2
const BEAM_X = -2; // the emitter's fixed downrange line — the mirror must slide onto this x

export const level2 = {
  id: 'level-2',
  mirrors: [
    {
      id: 'm1',
      // Rail runs perpendicular to the beam (along x, at z=0) so sliding
      // the mirror moves it in and out of the beam's path.
      rail: { start: [-3, BEAM_HEIGHT, 0], end: [3, BEAM_HEIGHT, 0] },
      initialT: 0.5, // x=0 — off the beam line at BEAM_X, must be slid into place
      initialRotationY: Math.PI / 4, // fixed 45°: bends a -Z beam into +X once intercepted
      positionEnabled: true,
      rotationEnabled: false,
    },
  ],
  emitters: [{ id: 'e1', position: [BEAM_X, BEAM_HEIGHT, 4], colorName: 'red', initialRotationY: 0 }],
  receivers: [
    { id: 'r1', position: [ROOM_HALF - 0.1, BEAM_HEIGHT, 0], rotationY: Math.PI / 2, colorName: 'red' },
  ],
  switches: [],
  doors: [
    { id: 'd1', position: [0, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['r1'], exit: true },
  ],
};
