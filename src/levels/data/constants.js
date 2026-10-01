// Values shared by every level's data and by the fixed room in
// src/core/scene.js (docs/decisions/0005). Pure — no Three.js — so level
// data stays importable from tests.
export const ROOM_SIZE = 10;
export const ROOM_HALF = ROOM_SIZE / 2;
export const BEAM_HEIGHT = 1.2; // y of every emitter/mirror/receiver/portal a beam must pass through
