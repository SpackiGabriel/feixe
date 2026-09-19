// Level 1 — "Primeiros passos" (spec §11): no laser at all. Just first-
// person movement and one switch that opens the exit door on aim+confirm.
// Teaches camera/movement control and the "mirar e ativar" gesture RF01,
// RF07 build on later.
const ROOM_HALF = 5; // must match src/core/scene.js's ROOM_SIZE / 2

export const level1 = {
  id: 'level-1',
  mirrors: [],
  emitters: [],
  receivers: [],
  switches: [{ id: 's1', position: [0, 0, 1], rotationY: 0 }],
  doors: [
    { id: 'd1', position: [0, 1.5, -(ROOM_HALF - 0.1)], rotationY: Math.PI, rule: 'AND', receiverIds: ['s1'], exit: true },
  ],
};
