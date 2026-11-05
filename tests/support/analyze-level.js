// Puzzle analyzer (design tool, not part of `npm test`): which player
// configurations open a level's exit, by which beam routes, and how much
// slack each degree of freedom has. Pure — no Three.js, no DOM — so it can
// trace ~10^6 configurations in seconds. It rebuilds the tracer's segments
// from level data with the same formulas the game uses (aabb.js, portal.js,
// wall.js, scene.js) and checks itself against every level's `solution`
// and `scenarios` before reporting, so drift from the engine shows up.
//
// It shows solvability and shortcuts. It says nothing about whether a
// puzzle is understandable or fun.
//
//   node tests/support/analyze-level.js            all levels
//   node tests/support/analyze-level.js 6 9        some levels
import { traceBeam, composeReceiverColor, isReceiverSatisfied, MAX_REFLECTIONS } from '../../src/gameplay/laser.js';
import { segmentFromCenter } from '../../src/gameplay/aabb.js';
import { COLOR_NAMES } from '../../src/gameplay/colors.js';
import { ROOM_HALF } from '../../src/levels/data/constants.js';

const MIRROR_WIDTH = 1;
const FILTER_WIDTH = 0.8;
const RECEIVER_WIDTH = 0.8;
const PORTAL_WIDTH = 1.2;
const BLOCKER_WIDTH = 1;
const DEG = Math.PI / 180;

const lerp = (a, b, t) => ({ x: a[0] + (b[0] - a[0]) * t, z: a[2] + (b[2] - a[2]) * t });

// --- Model: static segments once, movable ones rewritten per config ------

export function buildModel(level) {
  const h = ROOM_HALF;
  const statics = [
    { type: 'wall', a: { x: -h, z: -h }, b: { x: h, z: -h } },
    { type: 'wall', a: { x: -h, z: h }, b: { x: h, z: h } },
    { type: 'wall', a: { x: -h, z: -h }, b: { x: -h, z: h } },
    { type: 'wall', a: { x: h, z: -h }, b: { x: h, z: h } },
  ];
  for (const w of level.walls ?? []) statics.push({ type: 'wall', a: { x: w.from[0], z: w.from[1] }, b: { x: w.to[0], z: w.to[1] } });
  for (const r of level.receivers) {
    statics.push({ type: 'receiver', id: r.id, ...segmentFromCenter({ x: r.position[0], z: r.position[2] }, r.rotationY ?? 0, RECEIVER_WIDTH) });
  }
  for (const b of level.blockers ?? []) {
    statics.push({ type: 'blocker', id: b.id, ...segmentFromCenter({ x: b.position[0], z: b.position[2] }, b.rotationY ?? 0, b.width ?? BLOCKER_WIDTH) });
  }
  for (const p of level.portals ?? []) {
    const posA = { x: p.a.position[0], z: p.a.position[2] };
    const posB = { x: p.b.position[0], z: p.b.position[2] };
    const rotA = p.a.rotationY ?? 0;
    const rotB = p.b.rotationY ?? 0;
    statics.push({ type: 'portal', id: `${p.id}-a`, ...segmentFromCenter(posA, rotA, PORTAL_WIDTH), exitPosition: posB, exitRotationDelta: rotB - rotA + Math.PI });
    statics.push({ type: 'portal', id: `${p.id}-b`, ...segmentFromCenter(posB, rotB, PORTAL_WIDTH), exitPosition: posA, exitRotationDelta: rotA - rotB + Math.PI });
  }
  const mirrorSegs = level.mirrors.map((m) => ({ type: 'mirror', id: m.id, a: { x: 0, z: 0 }, b: { x: 0, z: 0 } }));
  const filterSegs = (level.filters ?? []).map((f) => ({ type: 'filter', id: f.id, a: { x: 0, z: 0 }, b: { x: 0, z: 0 }, primary: COLOR_NAMES[f.primaryName] }));
  const segments = [...statics, ...mirrorSegs, ...filterSegs];
  const exit = level.doors.find((d) => d.exit);
  return { level, segments, mirrorSegs, filterSegs, exit };
}

// Full state: { mirrors: [{t, rot}], filters: [{t}], emitters: [{rot}], switches: Set }
export function initialState(level) {
  return {
    mirrors: level.mirrors.map((m) => ({ t: m.initialT, rot: m.initialRotationY })),
    filters: (level.filters ?? []).map((f) => ({ t: f.initialT })),
    emitters: level.emitters.map((e) => ({ rot: e.initialRotationY ?? 0 })),
    switches: new Set(),
  };
}

const snap = (angle, stepDeg) => (stepDeg ? Math.round(angle / (stepDeg * DEG)) * stepDeg * DEG : angle);

// Applies a `solution`-shaped config on top of the initial state, honouring
// disabled degrees of freedom and snapping exactly like the game's controls.
export function stateFromConfig(level, config = {}) {
  const s = initialState(level);
  level.mirrors.forEach((m, i) => {
    const c = config.mirrors?.[m.id];
    if (!c) return;
    if (c.t !== undefined && m.positionEnabled) s.mirrors[i].t = Math.min(1, Math.max(0, c.t));
    if (c.rotationY !== undefined && m.rotationEnabled) s.mirrors[i].rot = snap(c.rotationY, m.rotationStepDegrees);
  });
  (level.filters ?? []).forEach((f, i) => {
    const c = config.filters?.[f.id];
    if (c?.t !== undefined) s.filters[i].t = Math.min(1, Math.max(0, c.t));
  });
  level.emitters.forEach((e, i) => {
    const c = config.emitters?.[e.id];
    if (c?.rotationY !== undefined && e.rotationEnabled) s.emitters[i].rot = snap(c.rotationY, e.rotationStepDegrees);
  });
  for (const id of config.switches ?? []) s.switches.add(id);
  return s;
}

// Traces every beam for one state. Returns door states plus the routes.
export function evaluate(model, state) {
  const { level, segments, mirrorSegs, filterSegs } = model;
  level.mirrors.forEach((m, i) => {
    const c = lerp(m.rail.start, m.rail.end, state.mirrors[i].t);
    Object.assign(mirrorSegs[i], segmentFromCenter(c, state.mirrors[i].rot, MIRROR_WIDTH));
  });
  (level.filters ?? []).forEach((f, i) => {
    const c = lerp(f.rail.start, f.rail.end, state.filters[i].t);
    Object.assign(filterSegs[i], segmentFromCenter(c, f.rotationY ?? 0, FILTER_WIDTH));
  });
  const traces = level.emitters.map((e, i) => {
    const yaw = state.emitters[i].rot;
    return traceBeam(segments, { pos: { x: e.position[0], z: e.position[2] }, dir: { x: -Math.sin(yaw), z: -Math.cos(yaw) }, color: COLOR_NAMES[e.colorName] }, MAX_REFLECTIONS);
  });
  const active = new Map();
  for (const r of level.receivers) {
    const { composed, hitCount } = composeReceiverColor(traces, r.id);
    active.set(r.id, isReceiverSatisfied(composed, COLOR_NAMES[r.colorName], hitCount));
  }
  for (const id of state.switches) active.set(id, true);
  const trapHit = new Set(traces.filter((t) => t.status === 'blocked').map((t) => t.segment.id));
  const isOn = (entry) => (typeof entry === 'string' ? active.get(entry) === true : entry.any.some(isOn));
  const doors = {};
  for (const d of level.doors) {
    const states = d.receiverIds.map(isOn);
    const vetoed = (d.forbidIds ?? []).some((id) => trapHit.has(id));
    doors[d.id] = !vetoed && (d.rule === 'AND' ? states.every(Boolean) : states.some(Boolean));
  }
  return { doors, traces, active, trapHit };
}

// A route: which objects each beam touched, in order, and where it ended.
function routeOf(level, traces) {
  return traces
    .map((t, i) => {
      const via = t.pieces.filter((p) => p.segment && ['mirror', 'filter', 'portal'].includes(p.end)).map((p) => p.segment.id);
      const end = t.segment?.id ?? t.status;
      return `${level.emitters[i].id}:${[...via, end].join('>')}`;
    })
    .join(' | ');
}

// Which objects differ from the initial state.
function movedObjects(level, state, init) {
  const moved = [];
  level.mirrors.forEach((m, i) => {
    if (Math.abs(state.mirrors[i].t - init.mirrors[i].t) > 1e-6 || angleDiff(state.mirrors[i].rot, init.mirrors[i].rot) > 1e-6) moved.push(m.id);
  });
  (level.filters ?? []).forEach((f, i) => {
    if (Math.abs(state.filters[i].t - init.filters[i].t) > 1e-6) moved.push(f.id);
  });
  return moved;
}

// Two mirror angles are equivalent mod 180° (both faces reflect).
function angleDiff(a, b) {
  const d = (((a - b) % Math.PI) + Math.PI) % Math.PI;
  return Math.min(d, Math.PI - d);
}

// --- Strategies ----------------------------------------------------------

// 1) Tolerance windows: slide each degree of freedom alone around a
// configuration and measure the contiguous range that keeps the door open.
export function toleranceWindows(model, state, doorId = model.exit.id) {
  const { level } = model;
  const opens = (s) => evaluate(model, s).doors[doorId];
  const clone = (s) => ({ mirrors: s.mirrors.map((m) => ({ ...m })), filters: s.filters.map((f) => ({ ...f })), emitters: s.emitters.map((e) => ({ ...e })), switches: s.switches });
  const windows = [];
  const scan = (label, unit, get, set, step, limit, snapped) => {
    if (snapped) {
      windows.push({ label, window: 'snapped' });
      return;
    }
    const base = get(state);
    let lo = 0;
    let hi = 0;
    for (let d = step; d <= limit; d += step) {
      const s = clone(state);
      set(s, base - d);
      if (!opens(s)) break;
      lo = d;
    }
    for (let d = step; d <= limit; d += step) {
      const s = clone(state);
      set(s, base + d);
      if (!opens(s)) break;
      hi = d;
    }
    windows.push({ label, lo, hi, unit });
  };
  level.mirrors.forEach((m, i) => {
    if (m.rotationEnabled) scan(`${m.id} rot`, '°', (s) => s.mirrors[i].rot / DEG, (s, v) => { s.mirrors[i].rot = v * DEG; }, 0.1, 30, !!m.rotationStepDegrees);
    if (m.positionEnabled) {
      const len = Math.hypot(m.rail.end[0] - m.rail.start[0], m.rail.end[2] - m.rail.start[2]);
      scan(`${m.id} rail`, 'm', (s) => s.mirrors[i].t * len, (s, v) => { s.mirrors[i].t = Math.min(1, Math.max(0, v / len)); }, 0.01, len, false);
    }
  });
  (level.filters ?? []).forEach((f, i) => {
    const len = Math.hypot(f.rail.end[0] - f.rail.start[0], f.rail.end[2] - f.rail.start[2]);
    scan(`${f.id} rail`, 'm', (s) => s.filters[i].t * len, (s, v) => { s.filters[i].t = Math.min(1, Math.max(0, v / len)); }, 0.01, len, false);
  });
  return windows;
}

// Candidate values per degree of freedom for the coarse grid: snapped
// mirrors take every step (exact); free ones take the four 45° classes plus
// the values the level itself mentions (initial, solution, scenarios).
function gridAxes(level, extraConfigs, railSteps = 9) {
  const axes = [];
  const mentioned = (kind, id, key) => extraConfigs.map((c) => c?.[kind]?.[id]?.[key]).filter((v) => v !== undefined);
  level.mirrors.forEach((m, i) => {
    if (m.rotationEnabled) {
      let angles;
      if (m.rotationStepDegrees) {
        angles = [];
        for (let a = 0; a < 180; a += m.rotationStepDegrees) angles.push(a * DEG);
      } else {
        angles = [0, 45, 90, 135].map((a) => a * DEG);
        for (const v of [m.initialRotationY, ...mentioned('mirrors', m.id, 'rotationY')]) {
          if (!angles.some((a) => angleDiff(a, v) < 1e-6)) angles.push(v);
        }
      }
      axes.push({ values: angles, apply: (s, v) => { s.mirrors[i].rot = v; } });
    }
    if (m.positionEnabled) {
      const ts = new Set([m.initialT, ...mentioned('mirrors', m.id, 't')]);
      for (let k = 0; k < railSteps; k++) ts.add(k / (railSteps - 1));
      axes.push({ values: [...ts], apply: (s, v) => { s.mirrors[i].t = v; } });
    }
  });
  (level.filters ?? []).forEach((f, i) => {
    const ts = new Set([f.initialT, ...mentioned('filters', f.id, 't')]);
    for (let k = 0; k < railSteps; k++) ts.add(k / (railSteps - 1));
    axes.push({ values: [...ts], apply: (s, v) => { s.filters[i].t = v; } });
  });
  return axes;
}

function tally(model, families, state, init) {
  const result = evaluate(model, state);
  if (!result.doors[model.exit.id]) return false;
  const key = routeOf(model.level, result.traces);
  const moved = movedObjects(model.level, state, init);
  const f = families.get(key);
  if (f) {
    f.count++;
    if (moved.length < f.minMoved.length) f.minMoved = moved;
  } else {
    families.set(key, { count: 1, minMoved: moved });
  }
  return true;
}

// 2) Coarse exhaustive grid (exact for snapped mirrors).
export function exhaustiveGrid(model, { limit = 3e6 } = {}) {
  const { level } = model;
  const configs = [level.solution, ...(level.scenarios ?? []).map((s) => s.config)];
  const axes = gridAxes(level, configs);
  const total = axes.reduce((n, a) => n * a.values.length, 1);
  if (total > limit) return { skipped: true, total };
  const init = initialState(level);
  const state = stateFromConfig(level, {});
  const families = new Map();
  let opening = 0;
  const idx = new Array(axes.length).fill(0);
  for (let n = 0; n < total; n++) {
    let rem = n;
    for (let k = 0; k < axes.length; k++) {
      idx[k] = rem % axes[k].values.length;
      rem = Math.floor(rem / axes[k].values.length);
      axes[k].apply(state, axes[k].values[idx[k]]);
    }
    if (tally(model, families, state, init)) opening++;
  }
  return { total, opening, families };
}

// 3) Random continuous sampling (probabilistic: catches off-grid routes).
export function randomSample(model, { samples = 200000, seed = 1 } = {}) {
  const { level } = model;
  let x = seed >>> 0 || 1;
  const rand = () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
  const init = initialState(level);
  const state = stateFromConfig(level, {});
  const families = new Map();
  let opening = 0;
  for (let n = 0; n < samples; n++) {
    level.mirrors.forEach((m, i) => {
      if (m.rotationEnabled) state.mirrors[i].rot = snap(rand() * Math.PI, m.rotationStepDegrees);
      if (m.positionEnabled) state.mirrors[i].t = rand();
    });
    (level.filters ?? []).forEach((f, i) => { state.filters[i].t = rand(); });
    if (tally(model, families, state, init)) opening++;
  }
  return { samples, opening, families };
}

// Engine fidelity: the analyzer must agree with the level's own tests.
export function selfCheck(model) {
  const { level } = model;
  const problems = [];
  if (evaluate(model, initialState(level)).doors[model.exit.id]) problems.push('exit open at start');
  if (!evaluate(model, stateFromConfig(level, level.solution)).doors[model.exit.id]) problems.push('solution does not open the exit');
  for (const sc of level.scenarios ?? []) {
    const doors = evaluate(model, stateFromConfig(level, sc.config)).doors;
    for (const [id, want] of Object.entries(sc.doors)) if (doors[id] !== want) problems.push(`scenario "${sc.name}": ${id} expected ${want}`);
  }
  return problems;
}

// --- CLI -----------------------------------------------------------------

function printFamilies(families, max = 8) {
  const list = [...families.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [key, f] of list.slice(0, max)) console.log(`      ${String(f.count).padStart(7)}  [${f.minMoved.length} moved: ${f.minMoved.join(',') || '-'}]  ${key}`);
  if (list.length > max) console.log(`      … ${list.length - max} more`);
}

export function report(level) {
  const model = buildModel(level);
  const t0 = performance.now();
  console.log(`\n=== ${level.id} "${level.name}"`);
  const problems = selfCheck(model);
  console.log(problems.length ? `  SELF-CHECK FAILED: ${problems.join('; ')}` : '  self-check ok (start closed, solution opens, scenarios hold)');
  const sol = evaluate(model, stateFromConfig(level, level.solution));
  console.log(`  intended route: ${routeOf(level, sol.traces)}`);
  console.log('  tolerance around solution:');
  for (const w of toleranceWindows(model, stateFromConfig(level, level.solution))) {
    console.log(w.window ? `      ${w.label}: snapped` : `      ${w.label}: -${w.lo.toFixed(2)} / +${w.hi.toFixed(2)} ${w.unit}`);
  }
  const grid = exhaustiveGrid(model);
  if (grid.skipped) console.log(`  grid: skipped (${grid.total.toExponential(1)} configs)`);
  else {
    console.log(`  grid: ${grid.opening}/${grid.total} configs open the exit, ${grid.families.size} route families`);
    printFamilies(grid.families);
  }
  const rnd = randomSample(model);
  console.log(`  random: ${rnd.opening}/${rnd.samples} samples open the exit, ${rnd.families.size} route families`);
  printFamilies(rnd.families, 5);
  console.log(`  (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
  return { problems, grid, rnd };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { getLevels } = await import('../../src/levels/level-manager.js');
  const wanted = process.argv.slice(2).map(Number);
  const levels = getLevels().filter((_, i) => !wanted.length || wanted.includes(i + 1));
  let failed = false;
  for (const level of levels) if (report(level).problems.length) failed = true;
  process.exitCode = failed ? 1 : 0;
}
