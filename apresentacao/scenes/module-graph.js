// Grafo real de dependências entre as pastas de src/ (625×470, painel do palco 1280×720).
// Dados: contagem de `import` relativos entre pastas, calculada a partir dos arquivos de src/
// (fora de levels/data/: 48 módulos, 24 importam Three). Não é desenho de intenção: é o que o código faz.
//   módulos por pasta (com Three / total): core 4/10, gameplay 12/18, levels 1/5, presentation 5/11, ui 1/3, main 1/1.
// Um pulso de luz percorre as arestas; cada ponto é um módulo (azul importa Three, verde é JavaScript puro).
// Fora do grafo: core → levels é só levels/data/constants.js (dados), e os imports de vendor/three (addons).
import { el, setAttrs, makeSvg, beam, loop, token, label, clamp01, ease } from './_kit.js';

const W = 625;
const H = 470;
const PERIOD = 13; // s
const SLOT = 1.0; // s por aresta

// n = módulos da pasta; three = quantos deles importam Three.
const BLOCKS = {
  main: { x: 4, y: 6, w: 617, h: 48, title: 'main', sub: '1 módulo · liga as peças', n: 1, three: 1 },
  levels: { x: 4, y: 118, w: 110, h: 104, title: 'levels', sub: '5 + 12 dados', n: 5, three: 1 },
  core: { x: 154, y: 118, w: 104, h: 104, title: 'core', sub: '10 módulos', n: 10, three: 4 },
  presentation: { x: 304, y: 118, w: 156, h: 104, title: 'presentation', sub: '11 módulos', n: 11, three: 5 },
  ui: { x: 506, y: 118, w: 115, h: 104, title: 'ui', sub: '3 módulos', n: 3, three: 1 },
  gameplay: { x: 200, y: 318, w: 200, h: 104, title: 'gameplay', sub: '18 módulos', n: 18, three: 12 },
};

// Arestas: de, para, nº de imports, geometria (pontos já sobre as bordas), rótulo.
// Ordem = ordem em que o pulso as percorre (main liga tudo; depois as dependências entre pastas).
const EDGES = [
  { from: 'main', to: 'levels', count: 2, pts: [56, 54, 56, 114], lab: [66, 70, 'start'] },
  { from: 'main', to: 'core', count: 10, pts: [206, 54, 206, 114], lab: [216, 70, 'start'] },
  { from: 'main', to: 'presentation', count: 6, pts: [382, 54, 382, 114], lab: [392, 70, 'start'] },
  { from: 'main', to: 'ui', count: 3, pts: [563, 54, 563, 114], lab: [573, 70, 'start'] },
  { from: 'levels', to: 'gameplay', count: 11, pts: [70, 226, 196, 356], lab: [112, 302, 'middle'] },
  { from: 'levels', to: 'core', count: 2, pts: [117, 170, 151, 170], lab: [134, 152, 'middle'] },
  { from: 'levels', to: 'presentation', count: 1, pts: [86, 118, 340, 114], ctrl: [213, 48], lab: [330, 80, 'middle'] },
  { from: 'gameplay', to: 'core', count: 8, pts: [218, 318, 218, 226], lab: [208, 272, 'end'] },
  { from: 'gameplay', to: 'presentation', count: 11, pts: [330, 318, 330, 226], lab: [320, 272, 'end'] },
  { from: 'core', to: 'presentation', count: 2, pts: [261, 170, 301, 170], lab: [281, 152, 'middle'] },
  { from: 'ui', to: 'presentation', count: 2, pts: [503, 170, 463, 170], lab: [483, 152, 'middle'] },
  { from: 'presentation', to: 'gameplay', count: 2, pts: [362, 226, 362, 314], lab: [372, 272, 'start'] },
  { from: 'core', to: 'gameplay', count: 1, pts: [244, 226, 244, 314], lab: [254, 272, 'start'] },
];

// Espessura da seta cresce com o número de imports.
const thickness = (count) => 1.2 + 0.55 * count;

function pointAt(edge, t) {
  const [x1, y1, x2, y2] = edge.pts;
  if (!edge.ctrl) return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
  const [cx, cy] = edge.ctrl;
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return { x: a * x1 + b * cx + c * x2, y: a * y1 + b * cy + c * y2 };
}

function endAngle(edge) {
  const [x1, y1, x2, y2] = edge.pts;
  if (!edge.ctrl) return Math.atan2(y2 - y1, x2 - x1);
  return Math.atan2(y2 - edge.ctrl[1], x2 - edge.ctrl[0]);
}

export default function mount(host) {
  const P = 'module-graph';
  const svg = makeSvg(host, W, H, P);
  const paper = token('paper') || '#d9d4c7';
  const dim = token('paper-dim') || '#8d897e';
  const faint = token('paper-faint') || '#5a5851';
  const beamColor = token('beam') || '#fff1d6';
  const panelFill = token('panel') || '#0c1012';
  const blue = token('c-blue') || '#3b9eff';
  const green = token('c-green') || '#2ee66b';

  // Arestas primeiro (ficam atrás dos blocos)
  const edges = EDGES.map((edge) => {
    const w = thickness(edge.count);
    const [x1, y1, x2, y2] = edge.pts;
    if (edge.ctrl) {
      el('path', {
        d: `M ${x1} ${y1} Q ${edge.ctrl[0]} ${edge.ctrl[1]} ${x2 - Math.cos(endAngle(edge)) * 6} ${y2 - Math.sin(endAngle(edge)) * 6}`,
        fill: 'none', stroke: dim, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-opacity': 0.8,
      }, svg);
    } else {
      const a = Math.atan2(y2 - y1, x2 - x1);
      const back = 6 + w * 0.4;
      el('line', {
        x1, y1, x2: x2 - Math.cos(a) * back, y2: y2 - Math.sin(a) * back,
        stroke: dim, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-opacity': 0.8,
      }, svg);
    }
    const a = endAngle(edge);
    const head = 9 + w * 0.9;
    const l = { x: x2 - Math.cos(a - 0.42) * head, y: y2 - Math.sin(a - 0.42) * head };
    const r = { x: x2 - Math.cos(a + 0.42) * head, y: y2 - Math.sin(a + 0.42) * head };
    el('path', { d: `M ${x2} ${y2} L ${l.x} ${l.y} L ${r.x} ${r.y} Z`, fill: dim, 'fill-opacity': 0.9 }, svg);
    const pulse = beam(svg, beamColor, P, { width: Math.max(3, w * 0.7), halo: 14 + w, opacity: 0 });
    const dot = el('circle', { r: 5.5, fill: beamColor, filter: `url(#${P}-glow)`, opacity: 0 }, svg);
    const [lx, ly, anchor] = edge.lab;
    const text = label(svg, String(edge.count), paper, { size: 17, italic: false, anchor });
    setAttrs(text, { x: lx, y: ly, 'font-family': 'var(--text)', 'font-weight': 600 });
    return { ...edge, pulse, dot };
  });

  // Blocos
  const views = {};
  for (const [id, b] of Object.entries(BLOCKS)) {
    const g = el('g', {}, svg);
    const glowRect = el('rect', {
      x: b.x - 2, y: b.y - 2, width: b.w + 4, height: b.h + 4, rx: 15, fill: 'none', stroke: beamColor, 'stroke-width': 3.5, opacity: 0,
    }, g);
    const box = el('rect', {
      x: b.x, y: b.y, width: b.w, height: b.h, rx: 14, fill: panelFill, stroke: beamColor, 'stroke-opacity': 0.4, 'stroke-width': 2.2,
    }, g);
    const dots = [];
    if (id === 'main') {
      const t = label(g, b.title, paper, { size: 22, italic: false, anchor: 'start' });
      setAttrs(t, { x: 20, y: b.y + b.h / 2, 'font-family': 'var(--display)', 'font-weight': 600 });
      const s = label(g, b.sub, dim, { size: 16, italic: false, anchor: 'start' });
      setAttrs(s, { x: 90, y: b.y + b.h / 2, 'font-family': 'var(--text)' });
      dots.push(el('circle', { cx: 592, cy: b.y + b.h / 2, r: 5.5, fill: blue }, g));
    } else {
      const cx = b.x + b.w / 2;
      const t = label(g, b.title, paper, { size: 20, italic: false });
      setAttrs(t, { x: cx, y: b.y + 24, 'font-family': 'var(--display)', 'font-weight': 600 });
      const s = label(g, b.sub, dim, { size: 16, italic: false });
      setAttrs(s, { x: cx, y: b.y + 46, 'font-family': 'var(--text)' });
      const pitch = 15;
      const cols = Math.floor((b.w - 16) / pitch);
      for (let i = 0; i < b.n; i += 1) {
        const row = Math.floor(i / cols);
        const inRow = Math.min(cols, b.n - row * cols);
        const col = i - row * cols;
        const x = cx + (col - (inRow - 1) / 2) * pitch;
        const y = b.y + 70 + row * 16;
        dots.push(el('circle', { cx: x, cy: y, r: 5.5, fill: i < b.three ? blue : green }, g));
      }
    }
    views[id] = {
      setLevel(level) {
        box.setAttribute('stroke-opacity', (0.4 + level * 0.6).toFixed(2));
        glowRect.setAttribute('opacity', (level * 0.65).toFixed(2));
        for (const d of dots) d.setAttribute('opacity', (0.72 + level * 0.28).toFixed(2));
      },
    };
  }

  // Legenda
  const legendY = 452;
  el('circle', { cx: 14, cy: legendY, r: 5.5, fill: blue }, svg);
  const l1 = label(svg, 'importa Three', dim, { size: 16, italic: false, anchor: 'start' });
  setAttrs(l1, { x: 26, y: legendY, 'font-family': 'var(--text)' });
  el('circle', { cx: 158, cy: legendY, r: 5.5, fill: green }, svg);
  const l2 = label(svg, 'JavaScript puro', dim, { size: 16, italic: false, anchor: 'start' });
  setAttrs(l2, { x: 170, y: legendY, 'font-family': 'var(--text)' });
  const l3 = label(svg, 'espessura = nº de imports', faint, { size: 16, italic: false, anchor: 'start' });
  setAttrs(l3, { x: 318, y: legendY, 'font-family': 'var(--text)' });

  function frame(t) {
    const time = t % PERIOD;
    const levels = {};
    for (const id of Object.keys(BLOCKS)) levels[id] = 0;
    edges.forEach((edge, i) => {
      const start = i * SLOT;
      const raw = clamp01((time - start) / SLOT);
      const active = time >= start && time <= start + SLOT;
      if (!active) {
        edge.pulse.group.setAttribute('opacity', 0);
        edge.dot.setAttribute('opacity', 0);
      } else {
        const k = ease.inOut(raw);
        const tail = clamp01(k - 0.3);
        const p0 = pointAt(edge, tail);
        const p1 = pointAt(edge, k);
        edge.pulse.set(p0.x, p0.y, p1.x, p1.y);
        const op = Math.sin(raw * Math.PI);
        edge.pulse.group.setAttribute('opacity', (op * 0.95).toFixed(2));
        setAttrs(edge.dot, { cx: p1.x, cy: p1.y, opacity: op.toFixed(2) });
      }
      // origem acende no começo; destino, na chegada (e um pouco depois)
      const src = Math.max(0, Math.sin(clamp01((time - start) / (SLOT * 0.6)) * Math.PI));
      const dstU = (time - (start + SLOT * 0.55)) / (SLOT * 0.9);
      const dst = dstU < 0 || dstU > 1 ? 0 : Math.sin(dstU * Math.PI);
      levels[edge.from] = Math.max(levels[edge.from], src * 0.6);
      levels[edge.to] = Math.max(levels[edge.to], dst);
    });
    for (const [id, v] of Object.entries(views)) v.setLevel(levels[id]);
  }

  return loop(frame);
}
