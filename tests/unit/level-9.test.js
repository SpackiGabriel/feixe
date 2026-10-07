import { describe, it, expect } from 'vitest';
import { traceBeam, composeReceiverColor, isReceiverSatisfied, MAX_REFLECTIONS } from '../../src/gameplay/laser.js';
import { COLOR_NAMES } from '../../src/gameplay/colors.js';
import { level9 } from '../../src/levels/data/level-9.js';

// Specific pedagogical states for level 9, beyond the generic solvability
// check in levels.test.js (start-closed + declared solution opens the exit):
// the OR-opens-on-one-beam contrast, the filter's necessity, and the
// blocker biting a mis-turned blue beam. Rebuilds each object's XZ segment
// exactly as the runtime does — every gameplay object shares the half-width
// formula a=(x-h·cosθ, z+h·sinθ), b=(x+h·cosθ, z-h·sinθ) — so these verify
// the actual level-9 data. If someone edits level-9.js and breaks a beam
// route, these fail.
const ROOM_HALF = 5; // matches src/core/scene.js
const PLATE_W = 1; // mirror plate (src/gameplay/mirror.js)
const PANEL_W = 0.8; // filter / receiver panel
const SOLVED_ANGLES = { m1: Math.PI / 4, m2: Math.PI / 4, m3: -Math.PI / 4, m4: -Math.PI / 4 };

function seg(type, x, z, rotY, width, extra = {}) {
  const h = width / 2;
  const c = Math.cos(rotY), s = Math.sin(rotY);
  return { type, a: { x: x - h * c, z: z + h * s }, b: { x: x + h * c, z: z - h * s }, ...extra };
}

const walls = [
  { type: 'wall', a: { x: -ROOM_HALF, z: -ROOM_HALF }, b: { x: ROOM_HALF, z: -ROOM_HALF } },
  { type: 'wall', a: { x: -ROOM_HALF, z: ROOM_HALF }, b: { x: ROOM_HALF, z: ROOM_HALF } },
  { type: 'wall', a: { x: -ROOM_HALF, z: -ROOM_HALF }, b: { x: -ROOM_HALF, z: ROOM_HALF } },
  { type: 'wall', a: { x: ROOM_HALF, z: -ROOM_HALF }, b: { x: ROOM_HALF, z: ROOM_HALF } },
];

function emitterDir(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

// Build the level's segment list for a given mirror-angle map and filter
// slide fraction (filterT: 1 = slid onto the white beam, 0 = parked off it).
function buildSegments({ angles, filterT }) {
  const segs = [...walls];
  for (const m of level9.mirrors) {
    const [x, , z] = m.rail.start; // fixed-position mirrors: start === end
    segs.push(seg('mirror', x, z, angles[m.id], PLATE_W));
  }
  for (const f of level9.filters) {
    const [sx, , sz] = f.rail.start;
    const [, , ez] = f.rail.end;
    const z = sz + (ez - sz) * filterT;
    segs.push(seg('filter', sx, z, f.rotationY, PANEL_W, { primary: COLOR_NAMES[f.primaryName] }));
  }
  for (const r of level9.receivers) {
    segs.push(seg('receiver', r.position[0], r.position[2], r.rotationY, PANEL_W, { id: r.id }));
  }
  for (const b of level9.blockers) {
    segs.push(seg('blocker', b.position[0], b.position[2], b.rotationY, b.width));
  }
  return segs;
}

function traceAll(segs) {
  return level9.emitters.map((e) =>
    traceBeam(segs, { pos: { x: e.position[0], z: e.position[2] }, dir: emitterDir(e.initialRotationY), color: COLOR_NAMES[e.colorName] }, MAX_REFLECTIONS)
  );
}

function satisfied(traces, receiverId) {
  const target = COLOR_NAMES[level9.receivers.find((r) => r.id === receiverId).colorName];
  const { composed, hitCount } = composeReceiverColor(traces, receiverId);
  return isReceiverSatisfied(composed, target, hitCount);
}

describe('level 9 "Circuito" — beam routing', () => {
  it('test_level9_solvedConfig_bothReceiversSatisfied', () => {
    // Arrange
    const segs = buildSegments({ angles: SOLVED_ANGLES, filterT: 1 });

    // Act
    const traces = traceAll(segs);

    // Assert: white→red→r1 and blue→r2 both hold, so the AND/exit door opens.
    expect(satisfied(traces, 'r1')).toBe(true);
    expect(satisfied(traces, 'r2')).toBe(true);
  });

  it('test_level9_onlyWhiteRouted_onlyRedReceiverSatisfied', () => {
    // Arrange: white solved, blue's mirrors left flat.
    const segs = buildSegments({ angles: { ...SOLVED_ANGLES, m3: 0, m4: 0 }, filterT: 1 });

    // Act
    const traces = traceAll(segs);

    // Assert: exactly one receiver lit → OR door opens, AND/exit stays shut.
    expect(satisfied(traces, 'r1')).toBe(true);
    expect(satisfied(traces, 'r2')).toBe(false);
  });

  it('test_level9_filterParkedOffBeam_redReceiverGetsWhiteAndStaysUnsatisfied', () => {
    // Arrange: mirrors solved, but the red filter is not on the white beam.
    const segs = buildSegments({ angles: SOLVED_ANGLES, filterT: 0 });

    // Act
    const traces = traceAll(segs);
    const r1 = composeReceiverColor(traces, 'r1');

    // Assert: r1 is physically hit, but by white (not red), so it never
    // satisfies its red target — the exit stays shut without the filter.
    expect(r1.hitCount).toBe(1);
    expect(satisfied(traces, 'r1')).toBe(false);
    expect(satisfied(traces, 'r2')).toBe(true);
  });

  it('test_level9_blueNotTurnedAtM4_beamDiesInBlocker', () => {
    // Arrange: m4 left flat, so blue overshoots past its turn to r2.
    const segs = buildSegments({ angles: { ...SOLVED_ANGLES, m4: 0 }, filterT: 1 });

    // Act
    const [, blue] = traceAll(segs); // emitters are [white(e1), blue(e2)]

    // Assert: the blocker (the "NÃO" cue) absorbs it before any wall.
    expect(blue.status).toBe('blocked');
    expect(satisfied(traceAll(segs), 'r2')).toBe(false);
  });

  it('test_level9_initialFlatMirrors_nothingSatisfied', () => {
    // Arrange: the level's own initial mirror angles (all 0°).
    const angles = Object.fromEntries(level9.mirrors.map((m) => [m.id, m.initialRotationY]));
    const segs = buildSegments({ angles, filterT: 0 });

    // Act
    const traces = traceAll(segs);

    // Assert: load state solves nothing.
    expect(satisfied(traces, 'r1')).toBe(false);
    expect(satisfied(traces, 'r2')).toBe(false);
  });
});
