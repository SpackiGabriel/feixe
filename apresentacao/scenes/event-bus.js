// O barramento de eventos (536×470, o painel de .body.cols no palco 1280×720).
// Emissores à esquerda, assinantes à direita, só o barramento no meio: ninguém
// ali se conhece. A sequência é a de uma porta abrindo, com os eventos e as
// assinaturas reais do código:
//   receiver:on   emitido em src/gameplay/receiver.js:86; assinado por sfx.js:246 (som de travar)
//   door:moving   emitido em src/gameplay/door.js:53; assinado por sfx.js:251 (liga o motor)
//                 e por main.js:184 (camera-fx: a câmera treme)
//   door:settled  emitido em src/gameplay/door.js:54; assinado por sfx.js:252 (para o motor)
//                 e por main.js:185 (camera-fx: tira a porta da lista que treme)
import { el, setAttrs, makeSvg, loop, token, arrow, label, clamp01, ease } from './_kit.js';

const W = 536;
const H = 470;
const PERIOD = 14; // s

const BUS_X = 268;
const BUS_TOP = 62;
const BUS_BOT = 412;
const ROW1 = 155;
const ROW2 = 345;
const BOX_W = 178;
const BOX_H = 90;
const LEFT_X = 4;
const RIGHT_X = W - 4 - BOX_W;

// Cada passo: o evento, quem emite, o que cada assinante faz e a janela (fração do laço).
const STEPS = [
  {
    event: 'receiver:on', from: 0,
    paths: [[[LEFT_X + BOX_W + 4, ROW1], [BUS_X, ROW1], [RIGHT_X - 4, ROW1]]],
    pulse: [0.05, 0.26], name: [0.03, 0.34],
    react: [{ sub: 0, text: 'som de travar', at: [0.22, 0.36] }],
  },
  {
    event: 'door:moving', from: 1,
    paths: [
      [[LEFT_X + BOX_W + 4, ROW2], [BUS_X, ROW2], [BUS_X, ROW1], [RIGHT_X - 4, ROW1]],
      [[LEFT_X + BOX_W + 4, ROW2], [BUS_X, ROW2], [RIGHT_X - 4, ROW2]],
    ],
    pulse: [0.40, 0.62], name: [0.38, 0.70],
    react: [{ sub: 0, text: 'liga o motor', at: [0.56, 0.72] }, { sub: 1, text: 'a câmera treme', at: [0.56, 0.72] }],
  },
  {
    event: 'door:settled', from: 1,
    paths: [
      [[LEFT_X + BOX_W + 4, ROW2], [BUS_X, ROW2], [BUS_X, ROW1], [RIGHT_X - 4, ROW1]],
      [[LEFT_X + BOX_W + 4, ROW2], [BUS_X, ROW2], [RIGHT_X - 4, ROW2]],
    ],
    pulse: [0.76, 0.96], name: [0.74, 0.99],
    react: [{ sub: 0, text: 'para o motor', at: [0.90, 0.99] }, { sub: 1, text: 'para de tremer', at: [0.90, 0.99] }],
  },
];

const EMITTERS = [
  { title: 'receiver.js', sub: 'emite', cy: ROW1 },
  { title: 'door.js', sub: 'emite', cy: ROW2 },
];
const SUBS = [
  { title: 'sfx.js', sub: 'assina', cy: ROW1 },
  { title: 'camera-fx', sub: 'assina', cy: ROW2 },
];

function pathLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}

function pointAt(pts, s) {
  let left = s * pathLength(pts);
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (left <= seg || i === pts.length - 1) {
      const k = seg ? Math.min(1, left / seg) : 0;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    }
    left -= seg;
  }
  return pts[pts.length - 1];
}

function makeBox(svg, x, cy, title, sub, color, panelFill, paper, dim) {
  const y = cy - BOX_H / 2;
  const g = el('g', {}, svg);
  const glow = el('rect', { x: x - 2, y: y - 2, width: BOX_W + 4, height: BOX_H + 4, rx: 15, fill: 'none', stroke: color, 'stroke-width': 3.5, opacity: 0 }, g);
  const box = el('rect', { x, y, width: BOX_W, height: BOX_H, rx: 14, fill: panelFill, stroke: color, 'stroke-opacity': 0.52, 'stroke-width': 2.2 }, g);
  el('line', { x1: x + 16, y1: y + 1.5, x2: x + BOX_W - 16, y2: y + 1.5, stroke: color, 'stroke-width': 3, 'stroke-opacity': 0.85, 'stroke-linecap': 'round' }, g);
  const t = label(g, title, paper, { size: 22, italic: false });
  setAttrs(t, { x: x + BOX_W / 2, y: cy - 13, 'font-family': 'var(--mono)', 'font-weight': 600 });
  const s = label(g, sub, dim, { size: 17, italic: false });
  setAttrs(s, { x: x + BOX_W / 2, y: cy + 18, 'font-family': 'var(--text)' });
  return {
    setHighlight(level) {
      box.setAttribute('stroke-opacity', (0.45 + level * 0.55).toFixed(2));
      glow.setAttribute('opacity', (level * 0.65).toFixed(2));
    },
    setSub(text, fill) {
      s.textContent = text;
      s.setAttribute('fill', fill);
    },
  };
}

const bell = (u, a, b) => (u < a || u > b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI));

export default function mount(host) {
  const P = 'evbus';
  const svg = makeSvg(host, W, H, P);
  const paper = token('paper') || '#d9d4c7';
  const dim = token('paper-dim') || '#8d897e';
  const faint = token('paper-faint') || '#5a5851';
  const beamColor = token('beam') || '#fff1d6';
  const panelFill = token('panel') || '#0c1012';
  
  // Cabeçalhos das colunas
  for (const [text, x] of [['emitem', LEFT_X + BOX_W / 2], ['assinam', RIGHT_X + BOX_W / 2]]) {
    const n = label(svg, text, dim, { size: 18, italic: false });
    setAttrs(n, { x, y: 84, 'font-family': 'var(--text)' });
  }

  // O barramento: uma barra vertical entre as duas colunas
  el('rect', { x: BUS_X - 8, y: BUS_TOP, width: 16, height: BUS_BOT - BUS_TOP, rx: 8, fill: panelFill, stroke: beamColor, 'stroke-opacity': 0.5, 'stroke-width': 2.2 }, svg);
  const busGlow = el('rect', { x: BUS_X - 8, y: BUS_TOP, width: 16, height: BUS_BOT - BUS_TOP, rx: 8, fill: 'none', stroke: beamColor, 'stroke-width': 3, opacity: 0, filter: `url(#${P}-glow)` }, svg);
  const busLabel = label(svg, 'barramento', dim, { size: 18, italic: false });
  setAttrs(busLabel, { x: BUS_X, y: BUS_BOT + 28, 'font-family': 'var(--text)' });

  // Setas fixas: emissor → barramento → assinante (nunca emissor → assinante)
  for (const row of [ROW1, ROW2]) {
    arrow(svg, faint, { width: 3, head: 10 }).set(LEFT_X + BOX_W + 4, row, BUS_X - 10, row);
    arrow(svg, faint, { width: 3, head: 10 }).set(BUS_X + 10, row, RIGHT_X - 4, row);
  }

  const emitters = EMITTERS.map((e) => makeBox(svg, LEFT_X, e.cy, e.title, e.sub, beamColor, panelFill, paper, dim));
  const subs = SUBS.map((s) => makeBox(svg, RIGHT_X, s.cy, s.title, s.sub, beamColor, panelFill, paper, dim));

  // Nome do evento que está passando
  const eventName = label(svg, '', beamColor, { size: 24, italic: false });
  setAttrs(eventName, { x: BUS_X, y: 30, 'font-family': 'var(--mono)', 'font-weight': 600, opacity: 0 });

  // Pulsos: um trecho de luz que corre por cada caminho (pathLength normalizado)
  const pulses = STEPS.map((step) => step.paths.map((pts) => {
    const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');
    const halo = el('path', { d, pathLength: 1, fill: 'none', stroke: beamColor, 'stroke-width': 14, 'stroke-opacity': 0.22, 'stroke-linecap': 'round', opacity: 0 }, svg);
    const core = el('path', { d, pathLength: 1, fill: 'none', stroke: beamColor, 'stroke-width': 4.5, 'stroke-linecap': 'round', filter: `url(#${P}-glow)`, opacity: 0 }, svg);
    const dot = el('circle', { r: 6, fill: beamColor, filter: `url(#${P}-glow)`, opacity: 0 }, svg);
    return { pts, halo, core, dot };
  }));

  const TAIL = 0.28;
  function drawPulse(p, s, op) {
    if (op <= 0) {
      for (const n of [p.halo, p.core, p.dot]) n.setAttribute('opacity', 0);
      return;
    }
    const head = clamp01(s);
    const seg = Math.min(TAIL, head);
    for (const n of [p.halo, p.core]) {
      setAttrs(n, { 'stroke-dasharray': `${seg} 2`, 'stroke-dashoffset': -(head - seg), opacity: op.toFixed(2) });
    }
    const [x, y] = pointAt(p.pts, head);
    setAttrs(p.dot, { cx: x, cy: y, opacity: op.toFixed(2) });
  }

  function frame(t) {
    const u = (t % PERIOD) / PERIOD;
    const emitterOn = [0, 0];
    const subOn = [0, 0];
    const subText = [['assina', dim], ['assina', dim]];
    let busLevel = 0;
    let name = '';
    let nameOp = 0;

    STEPS.forEach((step, i) => {
      const [p0, p1] = step.pulse;
      const raw = clamp01((u - p0) / (p1 - p0));
      const active = u >= p0 && u <= p1;
      pulses[i].forEach((p) => drawPulse(p, ease.inOut(raw), active ? Math.sin(raw * Math.PI) ** 0.5 : 0));
      if (active) {
        emitterOn[step.from] = Math.max(emitterOn[step.from], bell(raw, 0, 0.5));
        busLevel = Math.max(busLevel, bell(raw, 0.15, 0.75));
      }
      const n = bell(u, step.name[0], step.name[1]);
      if (n > nameOp) { nameOp = n; name = step.event; }
      for (const r of step.react) {
        const k = bell(u, r.at[0], r.at[1]);
        if (u >= r.at[0] && u <= r.at[1]) subText[r.sub] = [r.text, paper];
        subOn[r.sub] = Math.max(subOn[r.sub], k);
      }
    });

    emitters.forEach((b, i) => b.setHighlight(emitterOn[i]));
    subs.forEach((b, i) => { b.setHighlight(subOn[i]); b.setSub(subText[i][0], subText[i][1]); });
    busGlow.setAttribute('opacity', (busLevel * 0.9).toFixed(2));
    eventName.textContent = name;
    eventName.setAttribute('opacity', Math.min(1, nameOp * 2.2).toFixed(2));
  }

  return loop(frame);
}
