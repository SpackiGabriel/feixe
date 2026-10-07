// Level 9 — "Circuito" (spec §11): the two-beam culmination of the puzzle
// levels. Two emitters, a subtractive filter, a blocker, and four shared
// mirrors feed BOTH an AND door and an OR door that watch the same two
// receivers (r1 red, r2 blue).
//
// Why both doors watch the same receivers (and why this needs NO engine
// change): with two emitters, at most two receivers can be lit at once —
// each beam terminates at exactly one segment (see laser.js: receiver /
// wall / blocker end the trace; mirror / portal redirect; filter only
// recolors and passes through). A genuine AND door (both receivers) already
// consumes both beams, so an *independent* OR door (its own third receiver)
// could never be lit at the same time. So the OR door shares {r1, r2} with
// the AND door — and because r1∧r2 ⟹ r1∨r2, whenever the exit (AND) door
// opens the OR door is necessarily already open. "Both open at once" is
// therefore automatic: the exit is just the AND door, using the existing
// single-exit trigger. The operator contrast is taught *during* the solve —
// route one beam and the OR door opens (one condition is enough) while the
// AND/exit door stays shut until the second beam lands.
//
// The two beams cross the room and swap sides (white starts left → r1 on
// the right; blue starts right → r2 on the left), so the four mirrors share
// the central space — the "circuit" to map before moving anything.
//
//   WHITE: e1 → M1(+45°) → [Red filter, slid onto the beam] → M2(+45°) → r1
//          The filter turns white into red; slid off the beam, white still
//          reaches r1 but as white (≠ red target), so the exit stays shut —
//          teaches subtractive decomposition (the filter's signature role).
//   BLUE:  e2 → M3(−45°) → M4(−45°) → r2
//          The blocker sits just past M4 on blue's line: forget to turn blue
//          at M4 and the beam dies in the blocker instead of reaching r2 —
//          the "NÃO" lesson (a beam that must not go there). Real trace logic
//          here because there are mirrors to route around it (docs/findings.md).
//
// Geometry trace-verified against the production tracer before shipping:
// the solved config lights r1(red)+r2(blue); each single-beam-solved state
// lights exactly one (OR opens, exit stays shut); filter-off gives r1 white;
// mis-turning blue lands it in the blocker. Emitters are aim-locked and the
// mirrors rotate freely (the puzzle is the four mirrors + the filter slide).
import { BEAM_HEIGHT, ROOM_HALF } from './constants.js';

const BACK = -(ROOM_HALF - 0.1);

// Fixed-position, free-rotation mirrors (no 45° snap — matches the fluid
// feel of the other rotation levels; the 0.8 m receiver panels give enough
// tolerance to line up by eye). All start flat (0°), so nothing is lit at
// load; the intended solution is M1,M2 ≈ +45°, M3,M4 ≈ −45°.
function mirror(id, x, z) {
  return {
    id,
    rail: { start: [x, BEAM_HEIGHT, z], end: [x, BEAM_HEIGHT, z] },
    initialT: 0,
    initialRotationY: 0,
    positionEnabled: false,
    rotationEnabled: true,
  };
}

export const level9 = {
  id: 'level-9',
  mirrors: [
    mirror('m1', -3, -1.5),  // white: −z → +x
    mirror('m2', 1.6, -1.5), // white(red): +x → −z into r1
    mirror('m3', 3, -3),     // blue: −z → −x
    mirror('m4', -1.6, -3),  // blue: −x → −z into r2
  ],
  emitters: [
    // Aim locked (rotationEnabled: false): the puzzle is solved with the
    // mirrors, and a free-aimed emitter could otherwise fire straight across
    // the room into a receiver, skipping the whole circuit.
    { id: 'e1', position: [-3, BEAM_HEIGHT, 4.5], colorName: 'white', initialRotationY: 0, rotationEnabled: false },
    { id: 'e2', position: [3, BEAM_HEIGHT, 4.5], colorName: 'blue', initialRotationY: 0, rotationEnabled: false },
  ],
  receivers: [
    { id: 'r1', position: [1.6, BEAM_HEIGHT, BACK], rotationY: 0, colorName: 'red' },
    { id: 'r2', position: [-1.6, BEAM_HEIGHT, BACK], rotationY: 0, colorName: 'blue' },
  ],
  switches: [],
  filters: [
    {
      // Slides in z onto the white beam's horizontal leg (z = −1.5); starts
      // off the beam at z = −0.3. Vertical plate (rotationY = π/2) so a beam
      // travelling +x passes through it.
      id: 'f1',
      rail: { start: [-1, BEAM_HEIGHT, -0.3], end: [-1, BEAM_HEIGHT, -1.5] },
      initialT: 0,
      rotationY: Math.PI / 2,
      primaryName: 'red',
    },
  ],
  blockers: [
    // Perpendicular to blue's −x leg, just past M4: catches blue if it
    // isn't turned toward r2. Narrow (0.8 m) so it only bites that line.
    { id: 'b1', position: [-3, BEAM_HEIGHT, -3], rotationY: Math.PI / 2, width: 0.8 },
  ],
  doors: [
    // OR door — opens as soon as either receiver is lit (visible on partial
    // progress). Placed on the back wall, right of the exit, so the contrast
    // with the still-shut exit is in view while aiming.
    { id: 'd_or', position: [3.5, 1.5, BACK], rotationY: Math.PI, rule: 'OR', receiverIds: ['r1', 'r2'] },
    // AND door — the exit. Opens only when BOTH receivers are lit; whenever
    // it opens the OR door is already open, so "both open" is automatic.
    { id: 'd_exit', position: [0, 1.5, BACK], rotationY: Math.PI, rule: 'AND', receiverIds: ['r1', 'r2'], exit: true },
  ],
  // Declared solution (levels.test.js / docs/level-authoring.md): white's
  // two mirrors to +45°, blue's two to −45°, and the red filter slid onto
  // the white beam (t=1). Opens the AND/exit door.
  solution: {
    mirrors: {
      m1: { rotationY: Math.PI / 4 },
      m2: { rotationY: Math.PI / 4 },
      m3: { rotationY: -Math.PI / 4 },
      m4: { rotationY: -Math.PI / 4 },
    },
    filters: { f1: { t: 1 } },
  },
};
