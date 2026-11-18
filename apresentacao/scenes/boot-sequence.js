// Sequência real de inicialização (625×470, painel do palco 1280×720). Ordem e nomes de:
//   index.html (import map: "three" → ./vendor/three/three.module.js; <script type="module" src="./src/main.js">)
//   → src/main.js: os `import` estáticos chegam primeiro, pasta por pasta (contagens de src/:
//     core 10, gameplay 18, levels 5 + 12 de dados, presentation 11, ui 3; com main.js são 48 fora de levels/data/)
//   → createRenderer (src/core/renderer.js: new THREE.WebGLRenderer, canvas no body)
//   → renderer.setAnimationLoop(animate) (src/main.js, última linha): os quadros começam a bater.
// À direita, as ferramentas que só rodam no Node (package.json / ci.yml): o navegador nunca as carrega.
import { el, setAttrs, makeSvg, beam, loop, token, label, clamp01, ease } from './_kit.js';

const W = 625;
const H = 470;
const PERIOD = 10; // s

const CHIP_X = 40;
const CHIP_W = 388;
const SPINE_X = 22;

// Chips de duas linhas: título + subtítulo. at = instante (s) em que o passo se revela.
const STEPS = [
  { id: 'html', y: 38, h: 50, title: 'index.html', sub: '<script type="module">', at: 0.2 },
  { id: 'map', y: 102, h: 56, title: 'import map', sub: '"three" → ./vendor/three/three.module.js', at: 1.6 },
  { id: 'main', y: 172, h: 50, title: 'src/main.js', sub: 'ponto de entrada · 346 linhas', at: 3.0 },
];
const MODULES = { y: 236, h: 112, at: 4.0 };
const RENDERER = { y: 362, h: 40, at: 6.9 };
const LOOP = { y: 416, h: 40, at: 7.9 };

// Pastas que chegam (contagens de src/; "total" conta também o main.js).
const CELLS = [
  { name: 'core', value: '10', n: 10, col: 0, row: 0 },
  { name: 'gameplay', value: '18', n: 18, col: 0, row: 1 },
  { name: 'levels', value: '5 + 12 dados', n: 5, col: 0, row: 2 },
  { name: 'presentation', value: '11', n: 11, col: 1, row: 0 },
  { name: 'ui', value: '3', n: 3, col: 1, row: 1 },
  { name: 'total', value: '48', n: 48, col: 1, row: 2 },
];
const CELL_W = 184;
const CELL_H = 28;
const CELL_GAP = 4;
const CELL_STEP = 0.4;
const TICKS = 12;
const TICK_PERIOD = 0.17;

const bell = (u, a, b) => (u < a || u > b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI));

export default function mount(host) {
  const P = 'boot-sequence';
  const svg = makeSvg(host, W, H, P);
  const paper = token('paper') || '#d9d4c7';
  const dim = token('paper-dim') || '#8d897e';
  const faint = token('paper-faint') || '#5a5851';
  const beamColor = token('beam') || '#fff1d6';
  const panelFill = token('panel') || '#0c1012';
  const blue = token('c-blue') || '#3b9eff';
  const green = token('c-green') || '#2ee66b';

  // Faixas: navegador e Node
  const laneLabel = label(svg, 'no navegador', dim, { size: 16, italic: false, anchor: 'start' });
  setAttrs(laneLabel, { x: 8, y: 14, 'font-family': 'var(--text)' });
  el('rect', { x: 4, y: 26, width: 436, height: 438, rx: 16, fill: 'none', stroke: faint, 'stroke-width': 1.6, 'stroke-opacity': 0.8 }, svg);
  const nodeLabel = label(svg, 'só no Node', dim, { size: 16, italic: false, anchor: 'start' });
  setAttrs(nodeLabel, { x: 456, y: 14, 'font-family': 'var(--text)' });
  el('rect', { x: 452, y: 26, width: 169, height: 232, rx: 16, fill: 'none', stroke: faint, 'stroke-width': 1.6, 'stroke-dasharray': '7 6', 'stroke-opacity': 0.8 }, svg);
  ['Vitest', 'Playwright', 'ESLint'].forEach((name, i) => {
    const y = 40 + i * 48;
    el('rect', { x: 464, y, width: 145, height: 40, rx: 10, fill: panelFill, stroke: faint, 'stroke-width': 1.8, 'stroke-opacity': 0.9 }, svg);
    const t = label(svg, name, dim, { size: 19, italic: false });
    setAttrs(t, { x: 536.5, y: y + 20, 'font-family': 'var(--display)', 'font-weight': 600 });
  });
  ['nunca entram', 'no navegador'].forEach((line, i) => {
    const t = label(svg, line, faint, { size: 16, italic: false });
    setAttrs(t, { x: 536.5, y: 202 + i * 22, 'font-family': 'var(--text)' });
  });

  // Espinha vertical (o pulso desce por ela)
  el('line', { x1: SPINE_X, y1: 63, x2: SPINE_X, y2: 436, stroke: faint, 'stroke-width': 2, 'stroke-opacity': 0.7 }, svg);

  // Constrói um chip (retângulo + textos); devolve controle de brilho
  function chip(y, h, texts, colorStroke) {
    const g = el('g', {}, svg);
    const glowRect = el('rect', { x: CHIP_X - 2, y: y - 2, width: CHIP_W + 4, height: h + 4, rx: 13, fill: 'none', stroke: colorStroke, 'stroke-width': 3.5, opacity: 0 }, g);
    const box = el('rect', { x: CHIP_X, y, width: CHIP_W, height: h, rx: 12, fill: panelFill, stroke: colorStroke, 'stroke-width': 2.2, 'stroke-opacity': 0.4 }, g);
    const nodes = texts.map((t) => {
      const node = label(g, t.text, t.color ?? paper, { size: t.size, italic: false, anchor: t.anchor ?? 'start' });
      setAttrs(node, { x: t.x, y: t.y, 'font-family': t.font ?? 'var(--text)', 'font-weight': t.weight ?? 400 });
      return node;
    });
    const spine = el('circle', { cx: SPINE_X, cy: y + h / 2, r: 5.5, fill: colorStroke, opacity: 0.4 }, svg);
    return {
      cy: y + h / 2,
      set(revealed, glow) {
        box.setAttribute('stroke-opacity', (revealed ? 0.55 + glow * 0.45 : 0.3).toFixed(2));
        glowRect.setAttribute('opacity', (glow * 0.65).toFixed(2));
        nodes.forEach((n) => n.setAttribute('opacity', revealed ? 1 : 0.45));
        spine.setAttribute('opacity', revealed ? 1 : 0.4);
      },
    };
  }
  const two = (s) => [
    { text: s.title, x: CHIP_X + 14, y: s.y + 16, size: 20, font: 'var(--display)', weight: 600 },
    { text: s.sub, x: CHIP_X + 14, y: s.y + s.h - 13, size: 16, color: dim },
  ];
  const stepViews = STEPS.map((s) => ({ ...s, view: chip(s.y, s.h, two(s), beamColor) }));
  const modulesView = chip(MODULES.y, MODULES.h, [], blue);
  const rendererView = chip(RENDERER.y, RENDERER.h, [
    { text: 'WebGLRenderer', x: CHIP_X + 14, y: RENDERER.y + 20, size: 20, font: 'var(--display)', weight: 600 },
    { text: 'canvas no body', x: CHIP_X + CHIP_W - 14, y: RENDERER.y + 20, size: 16, color: dim, anchor: 'end' },
  ], blue);
  const loopView = chip(LOOP.y, LOOP.h, [
    { text: 'setAnimationLoop', x: CHIP_X + 14, y: LOOP.y + 20, size: 20, font: 'var(--display)', weight: 600 },
  ], green);

  // Células das pastas (preenchimento = chegada)
  const cellsOrigin = { x: CHIP_X + 8, y: MODULES.y + 10 };
  const cellViews = CELLS.map((c) => {
    const x = cellsOrigin.x + c.col * (CELL_W + 4);
    const y = cellsOrigin.y + c.row * (CELL_H + CELL_GAP) + 4;
    const fillColor = c.name === 'total' ? beamColor : blue;
    // sublinhado fino (não um bloco por trás do texto): a barra nunca corta uma letra
    const fill = el('rect', { x: x + 8, y: y + CELL_H - 4, width: 0, height: 4, rx: 2, fill: fillColor, 'fill-opacity': 0.85 }, svg);
    const name = label(svg, c.name, paper, { size: 18, italic: false, anchor: 'start' });
    setAttrs(name, { x: x + 10, y: y + CELL_H / 2, 'font-family': 'var(--display)', 'font-weight': 600 });
    const value = label(svg, c.value, dim, { size: 16, italic: false, anchor: 'end' });
    setAttrs(value, { x: x + CELL_W - 10, y: y + CELL_H / 2, 'font-family': 'var(--text)' });
    return { ...c, key: c.name, x, y, fill, name, value };
  });

  // Barras de quadro
  const tickX0 = CHIP_X + 190;
  const tickPitch = 15;
  const ticks = Array.from({ length: TICKS }, (_, i) => el('rect', {
    x: tickX0 + i * tickPitch, y: LOOP.y + 10, width: 10, height: 20, rx: 3, fill: green, opacity: 0.2,
  }, svg));

  // Pulso na espinha entre dois chips
  const pulse = beam(svg, beamColor, P, { width: 4.5, halo: 16, opacity: 0 });
  const dot = el('circle', { r: 6, fill: beamColor, filter: `url(#${P}-glow)`, opacity: 0 }, svg);
  const hops = [
    { from: stepViews[0].view.cy, to: stepViews[1].view.cy, start: 0.9, len: 0.7 },
    { from: stepViews[1].view.cy, to: stepViews[2].view.cy, start: 2.3, len: 0.7 },
    { from: stepViews[2].view.cy, to: modulesView.cy, start: 3.5, len: 0.5 },
    { from: modulesView.cy, to: rendererView.cy, start: 6.3, len: 0.6 },
    { from: rendererView.cy, to: loopView.cy, start: 7.3, len: 0.6 },
  ];

  function frame(t) {
    const time = t % PERIOD;
    // chips de duas linhas
    for (const s of stepViews) s.view.set(time >= s.at, bell(time, s.at, s.at + 0.9));
    // módulos: cada célula preenche e acende; o chip fica "revelado" com a primeira
    modulesView.set(time >= MODULES.at, bell(time, MODULES.at, MODULES.at + 0.8));
    cellViews.forEach((c, i) => {
      const start = MODULES.at + 0.3 + i * CELL_STEP;
      const k = clamp01((time - start) / 0.5);
      const grow = time < start ? 0 : ease.out(k);
      const width = c.key === 'total' ? (CELL_W - 16) * grow : Math.max(8, ((CELL_W - 16) * c.n) / 18) * grow;
      c.fill.setAttribute('width', width.toFixed(1));
      const on = time >= start ? 1 : 0.4;
      c.name.setAttribute('opacity', on);
      c.value.setAttribute('opacity', on);
    });
    rendererView.set(time >= RENDERER.at, bell(time, RENDERER.at, RENDERER.at + 0.9));
    const loopRevealed = time >= LOOP.at;
    loopView.set(loopRevealed, bell(time, LOOP.at, LOOP.at + 0.9));
    // quadros batendo: uma barra por quadro, em sequência
    const tickTime = time - (LOOP.at + 0.4);
    const head = tickTime < 0 ? -1 : Math.floor(tickTime / TICK_PERIOD) % TICKS;
    ticks.forEach((tick, i) => {
      const behind = head < 0 ? TICKS : (head - i + TICKS) % TICKS;
      tick.setAttribute('opacity', (behind === 0 ? 1 : 0.2 + 0.45 * Math.max(0, 1 - behind / 4)).toFixed(2));
    });
    // pulso
    let shown = false;
    for (const hop of hops) {
      const raw = (time - hop.start) / hop.len;
      if (raw < 0 || raw > 1) continue;
      const k = ease.inOut(raw);
      const y1 = hop.from + (hop.to - hop.from) * clamp01(k - 0.35);
      const y2 = hop.from + (hop.to - hop.from) * k;
      pulse.set(SPINE_X, y1, SPINE_X, y2);
      const op = Math.sin(raw * Math.PI);
      pulse.group.setAttribute('opacity', (op * 0.95).toFixed(2));
      setAttrs(dot, { cx: SPINE_X, cy: y2, opacity: op.toFixed(2) });
      shown = true;
    }
    if (!shown) {
      pulse.group.setAttribute('opacity', 0);
      dot.setAttribute('opacity', 0);
    }
  }

  return loop(frame);
}
