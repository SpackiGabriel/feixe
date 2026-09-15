// PROTOTYPE — throwaway TUI shell over engine.mjs. See README.md for the
// question this answers. Run: node prototypes/mirror-reflection/tui.mjs

import {
  vec,
  add,
  scale,
  fromAngle,
  traceBeam,
  evaluateReceiver,
} from "./engine.mjs";

const W = 60;
const H = 22;
const SCALE_X = W / 20; // world units 0..20 -> grid cols
const SCALE_Y = H / 10; // world units 0..10 -> grid rows

const COLOR = {
  r: "\x1b[31m",
  g: "\x1b[32m",
  b: "\x1b[34m",
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

function beamAnsi(color) {
  if (color.r && color.g && color.b) return "\x1b[37m"; // white
  if (color.r && color.b) return "\x1b[35m"; // magenta
  if (color.r && color.g) return "\x1b[33m"; // yellow
  if (color.g && color.b) return "\x1b[36m"; // cyan
  if (color.r) return COLOR.r;
  if (color.g) return COLOR.g;
  if (color.b) return COLOR.b;
  return COLOR.dim;
}

// --- Scene state (mutable, driven by keypresses) ---

function makeMirror(id, centerX, centerY, angleDeg, length = 2) {
  const dir = fromAngle(angleDeg);
  const half = scale(dir, length / 2);
  return {
    id,
    type: "mirror",
    a: vec(centerX - half.x, centerY - half.y),
    b: vec(centerX + half.x, centerY + half.y),
    center: vec(centerX, centerY),
    angle: angleDeg,
  };
}

const state = {
  scene: "convergence", // 'convergence' | 'filter-blocker'
  mirror1: { x: 10, y: 3, angle: 45 },
  mirror2: { x: 10, y: 7, angle: -45 },
};

function buildSegments() {
  const walls = [
    { id: "wall-n", type: "wall", a: vec(0, 0), b: vec(20, 0) },
    { id: "wall-s", type: "wall", a: vec(0, 10), b: vec(20, 10) },
    { id: "wall-w", type: "wall", a: vec(0, 0), b: vec(0, 10) },
    { id: "wall-e", type: "wall", a: vec(20, 0), b: vec(20, 10) },
  ];

  const mirror1 = makeMirror(
    "mirror1",
    state.mirror1.x,
    state.mirror1.y,
    state.mirror1.angle
  );
  const mirror2 = makeMirror(
    "mirror2",
    state.mirror2.x,
    state.mirror2.y,
    state.mirror2.angle
  );

  // Sits on the shared x=10 column between the two mirrors so each beam's
  // single reflection (down from mirror1, up from mirror2) lands here
  // before either beam could reach the *other* mirror further up/down the
  // same column — see README for why that ordering matters.
  const receiver = {
    id: "receiver1",
    type: "receiver",
    a: vec(9.5, 5),
    b: vec(10.5, 5),
    target: { r: 1, g: 0, b: 1 }, // magenta
  };

  const emitters = [
    { id: "e1", pos: vec(1, 3), dir: vec(1, 0), color: { r: 1, g: 0, b: 0 } },
    { id: "e2", pos: vec(1, 7), dir: vec(1, 0), color: { r: 0, g: 0, b: 1 } },
  ];

  const extras = [];
  if (state.scene === "filter-blocker") {
    extras.push({
      id: "filter1",
      type: "filter",
      a: vec(14, 4),
      b: vec(14, 6),
      primary: { r: 1, g: 0, b: 0 },
    });
    extras.push({
      id: "blocker1",
      type: "blocker",
      a: vec(16, 6),
      b: vec(16, 10),
    });
  }

  return {
    segments: [...walls, mirror1, mirror2, receiver, ...extras],
    receiver,
    emitters,
  };
}

function segChar(seg) {
  if (seg.type === "wall") return "#";
  if (seg.type === "blocker") return "X";
  if (seg.type === "filter") return "F";
  if (seg.type === "receiver") return "R";
  if (seg.type === "mirror") {
    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    if (Math.abs(dx) < 0.3) return "|";
    if (Math.abs(dy) < 0.3) return "-";
    return dx * dy > 0 ? "\\" : "/";
  }
  return "?";
}

function toGrid(p) {
  return { col: Math.round(p.x * SCALE_X), row: Math.round(p.y * SCALE_Y) };
}

function plotLine(grid, colorGrid, a, b, ch, ansi) {
  const g1 = toGrid(a);
  const g2 = toGrid(b);
  const steps = Math.max(Math.abs(g2.col - g1.col), Math.abs(g2.row - g1.row), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const col = Math.round(g1.col + (g2.col - g1.col) * t);
    const row = Math.round(g1.row + (g2.row - g1.row) * t);
    if (row >= 0 && row < H && col >= 0 && col < W) {
      grid[row][col] = ch;
      colorGrid[row][col] = ansi;
    }
  }
}

function render() {
  const { segments, receiver, emitters } = buildSegments();
  const grid = Array.from({ length: H }, () => Array(W).fill(" "));
  const colorGrid = Array.from({ length: H }, () => Array(W).fill(""));

  for (const seg of segments) {
    plotLine(grid, colorGrid, seg.a, seg.b, segChar(seg), COLOR.dim);
  }
  for (const e of emitters) {
    const g = toGrid(e.pos);
    if (g.row >= 0 && g.row < H && g.col >= 0 && g.col < W) grid[g.row][g.col] = "E";
  }

  const traces = emitters.map((e) => ({
    emitter: e,
    ...traceBeam(segments, e, 8),
  }));

  for (const t of traces) {
    const ansi = beamAnsi(t.color);
    for (let i = 0; i < t.path.length - 1; i++) {
      plotLine(grid, colorGrid, t.path[i], t.path[i + 1], "*", ansi);
    }
  }

  const evalResult = evaluateReceiver(traces, "receiver1", receiver.target);

  console.clear();
  let out = "";
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const ch = grid[r][c];
      const ansi = colorGrid[r][c];
      out += ansi ? ansi + ch + COLOR.reset : ch;
    }
    out += "\n";
  }
  console.log(out);

  console.log(`${COLOR.bold}Scene:${COLOR.reset} ${state.scene}   ` +
    `${COLOR.bold}Mirror1:${COLOR.reset} angle=${state.mirror1.angle}° y=${state.mirror1.y.toFixed(1)}   ` +
    `${COLOR.bold}Mirror2:${COLOR.reset} angle=${state.mirror2.angle}° y=${state.mirror2.y.toFixed(1)}`);

  for (const t of traces) {
    console.log(
      `  ${t.emitter.id} (${JSON.stringify(t.emitter.color)}) -> ${t.status}` +
        (t.segment ? ` @ ${t.segment.id}` : "")
    );
  }

  console.log(
    `${COLOR.bold}Receiver1 target=magenta(R+B):${COLOR.reset} composed=${JSON.stringify(
      evalResult.composed
    )} satisfied=${evalResult.satisfied ? COLOR.g + "YES" + COLOR.reset : COLOR.r + "no" + COLOR.reset}`
  );

  console.log(
    `\n${COLOR.bold}[a/d]${COLOR.reset} rotate mirror1  ${COLOR.bold}[w/s]${COLOR.reset} move mirror1  ` +
      `${COLOR.bold}[j/l]${COLOR.reset} rotate mirror2  ${COLOR.bold}[i/k]${COLOR.reset} move mirror2  ` +
      `${COLOR.bold}[f]${COLOR.reset} toggle filter/blocker scene  ${COLOR.bold}[q]${COLOR.reset} quit`
  );
}

readline_setup();
render();

function readline_setup() {
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  stdin.on("data", (key) => {
    if (key === "q" || key === "") {
      process.exit(0);
    }
    if (key === "a") state.mirror1.angle -= 5;
    if (key === "d") state.mirror1.angle += 5;
    if (key === "w") state.mirror1.y = Math.max(0.5, state.mirror1.y - 0.5);
    if (key === "s") state.mirror1.y = Math.min(9.5, state.mirror1.y + 0.5);
    if (key === "j") state.mirror2.angle -= 5;
    if (key === "l") state.mirror2.angle += 5;
    if (key === "i") state.mirror2.y = Math.max(0.5, state.mirror2.y - 0.5);
    if (key === "k") state.mirror2.y = Math.min(9.5, state.mirror2.y + 0.5);
    if (key === "f")
      state.scene = state.scene === "convergence" ? "filter-blocker" : "convergence";
    render();
  });
}
