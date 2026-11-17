// Diagrama do laço por quadro (623×468, o tamanho do painel no palco 1280×720):
//   uma vez, ao carregar:  Dados da câmara → Cena → (desenhada pela) Apresentação 3D
//   a cada quadro:         Entrada → Lógica 2D → Apresentação 3D → Quadro → (volta)
// Um pulso de luz percorre as setas; o carregamento acontece só no começo do laço.
import { el, setAttrs, makeSvg, beam, loop, token, arrow, label, clamp01, ease } from './_kit.js';

const W = 623;
const H = 468;
const PERIOD = 10; // s
const SETUP_END = 0.24; // fração do laço dedicada ao carregamento (uma vez)
const FRAMES = 3; // quadros demonstrados depois do carregamento

const ROW_Y = 236;
const BOX_H = 104;
const ROW_CY = ROW_Y + BOX_H / 2;
const TOP_Y = 34;
const TOP_H = 88;

const BLOCKS = [
  { id: 'input', title: 'Entrada', sub: 'teclado, mouse', x: 6, w: 128, color: 'c-yellow', fallback: '#ffe047' },
  { id: 'logic', title: 'Lógica 2D', sub: 'JS puro', x: 160, w: 126, color: 'c-green', fallback: '#2ee66b' },
  { id: 'view', title: 'Apresentação 3D', sub: 'Three.js', x: 312, w: 188, color: 'c-blue', fallback: '#3b9eff' },
  { id: 'frame', title: 'Quadro', sub: 'na tela', x: 526, w: 90, color: 'c-red', fallback: '#ff3b30' },
];
const TOP_BLOCKS = [
  { id: 'data', title: 'Dados da câmara', sub: 'peças e paredes', x: 6, w: 214, color: 'beam', fallback: '#fff1d6' },
  { id: 'scene', title: 'Cena', sub: 'montada por código', x: 300, w: 200, color: 'beam', fallback: '#fff1d6' },
];

function makeBlock(svg, spec, y, h, color, panelFill, paper, dim) {
  const g = el('g', {}, svg);
  const glowRect = el('rect', {
    x: spec.x - 2, y: y - 2, width: spec.w + 4, height: h + 4, rx: 15, fill: 'none', stroke: color, 'stroke-width': 3.5, opacity: 0,
  }, g);
  const box = el('rect', {
    x: spec.x, y, width: spec.w, height: h, rx: 14, fill: panelFill, stroke: color, 'stroke-opacity': 0.52, 'stroke-width': 2.2,
  }, g);
  el('line', {
    x1: spec.x + 16, y1: y + 1.5, x2: spec.x + spec.w - 16, y2: y + 1.5, stroke: color, 'stroke-width': 3, 'stroke-opacity': 0.85, 'stroke-linecap': 'round',
  }, g);
  const cx = spec.x + spec.w / 2;
  const cy = y + h / 2;
  const titleNode = label(g, spec.title, paper, { size: 22, italic: false });
  setAttrs(titleNode, { x: cx, y: cy - 13, 'font-family': 'var(--display)', 'font-weight': 600 });
  const subNode = label(g, spec.sub, dim, { size: 16, italic: false });
  setAttrs(subNode, { x: cx, y: cy + 17, 'font-family': 'var(--text)' });
  return {
    setHighlight(level) {
      box.setAttribute('stroke-opacity', (0.45 + level * 0.55).toFixed(2));
      glowRect.setAttribute('opacity', (level * 0.65).toFixed(2));
    },
  };
}

// 0 fora de [start, end], sino de 0 a 1 dentro (em u de 0 a 1)
function bell(u, start, end) {
  if (u < start || u > end) return 0;
  return Math.sin(((u - start) / (end - start)) * Math.PI);
}

export default function mount(host) {
  const P = 'pipeline';
  const svg = makeSvg(host, W, H, P);
  const paper = token('paper') || '#d9d4c7';
  const dim = token('paper-dim') || '#8d897e';
  const faint = token('paper-faint') || '#5a5851';
  const beamColor = token('beam') || '#fff1d6';
  const panelFill = token('panel') || '#0c1012';
  const color = (b) => token(b.color) || b.fallback;

  const blockViews = BLOCKS.map((b) => makeBlock(svg, b, ROW_Y, BOX_H, color(b), panelFill, paper, dim));
  const topViews = TOP_BLOCKS.map((b) => makeBlock(svg, b, TOP_Y, TOP_H, color(b), panelFill, paper, dim));

  // Rótulos dos dois regimes
  const setupCaption = label(svg, 'uma vez, ao carregar', dim, { size: 17, italic: false, anchor: 'start' });
  setAttrs(setupCaption, { x: 8, y: 18, 'font-family': 'var(--text)' });

  // Retorno por baixo: repetição a cada quadro
  const loopY = 410;
  const firstCx = BLOCKS[0].x + BLOCKS[0].w / 2;
  const lastCx = BLOCKS[3].x + BLOCKS[3].w / 2;
  el('path', {
    d: `M ${lastCx} ${ROW_Y + BOX_H + 6} L ${lastCx} ${loopY} L ${firstCx} ${loopY} L ${firstCx} ${ROW_Y + BOX_H + 14}`,
    fill: 'none', stroke: faint, 'stroke-width': 3, 'stroke-dasharray': '8 8', 'stroke-opacity': 0.72,
  }, svg);
  const loopTip = arrow(svg, faint, { width: 3, head: 12 });
  loopTip.set(firstCx, loopY - 8, firstCx, ROW_Y + BOX_H + 5);
  const loopCaption = label(svg, 'a cada quadro (dt)', dim, { size: 18, italic: false });
  setAttrs(loopCaption, { x: W / 2, y: loopY + 34, 'font-family': 'var(--text)' });

  // Setas: [x1,y1,x2,y2]; "once" = carregamento, senão laço por quadro
  const gap = (a, b) => [BLOCKS[a].x + BLOCKS[a].w + 4, ROW_CY, BLOCKS[b].x - 4, ROW_CY];
  const links = [
    { pts: gap(0, 1), at: 0.00, len: 0.30, once: false }, // Entrada → Lógica
    { pts: gap(1, 2), at: 0.30, len: 0.34, once: false }, // Lógica → Apresentação
    { pts: gap(2, 3), at: 0.66, len: 0.28, once: false }, // Apresentação → Quadro
    { pts: [TOP_BLOCKS[0].x + TOP_BLOCKS[0].w + 4, TOP_Y + TOP_H / 2, TOP_BLOCKS[1].x - 4, TOP_Y + TOP_H / 2], at: 0.02, len: 0.45, once: true },
    {
      pts: [TOP_BLOCKS[1].x + TOP_BLOCKS[1].w / 2, TOP_Y + TOP_H + 4, BLOCKS[2].x + BLOCKS[2].w / 2 - 36, ROW_Y - 4],
      at: 0.50, len: 0.45, once: true, // Cena → Apresentação 3D (desenhada a cada quadro; pulso só no carregamento)
    },
  ];
  for (const link of links) {
    const a = arrow(svg, dim, { width: 3.5, head: 11 });
    a.set(...link.pts);
    link.pulse = beam(svg, beamColor, P, { width: 4.5, halo: 16, opacity: 0 });
    link.dot = el('circle', { r: 5.8, fill: beamColor, filter: `url(#${P}-glow)`, opacity: 0 }, svg);
  }

  function drawLink(link, u) {
    const raw = clamp01((u - link.at) / link.len);
    if (u < link.at || u > link.at + link.len) {
      link.pulse.group.setAttribute('opacity', 0);
      link.dot.setAttribute('opacity', 0);
      return;
    }
    const [x1, y1, x2, y2] = link.pts;
    const k = ease.inOut(raw);
    const tail = clamp01(k - 0.35);
    const op = Math.sin(raw * Math.PI);
    link.pulse.set(x1 + (x2 - x1) * tail, y1 + (y2 - y1) * tail, x1 + (x2 - x1) * k, y1 + (y2 - y1) * k);
    link.pulse.group.setAttribute('opacity', (op * 0.95).toFixed(2));
    setAttrs(link.dot, { cx: x1 + (x2 - x1) * k, cy: y1 + (y2 - y1) * k, opacity: op.toFixed(2) });
  }

  function frame(t) {
    const u = (t % PERIOD) / PERIOD;
    const inSetup = u < SETUP_END;
    // Carregamento: u local de 0 a 1
    const us = clamp01(u / SETUP_END);
    for (const link of links.filter((l) => l.once)) drawLink(link, inSetup ? us : 2);
    topViews[0].setHighlight(inSetup ? bell(us, 0.0, 0.5) : 0);
    topViews[1].setHighlight(inSetup ? bell(us, 0.35, 0.95) : 0);
    setupCaption.setAttribute('opacity', inSetup ? 1 : 0.55);

    // Laço: FRAMES quadros no resto do período
    const uf = clamp01((u - SETUP_END) / (1 - SETUP_END));
    const f = Math.min(FRAMES - 1, Math.floor(uf * FRAMES));
    const uq = inSetup ? 2 : uf * FRAMES - f; // 0..1 dentro do quadro
    for (const link of links.filter((l) => !l.once)) drawLink(link, uq);
    const on = inSetup ? [0, 0, 0, 0] : [
      bell(uq, 0.0, 0.26), bell(uq, 0.26, 0.58), bell(uq, 0.5, 0.86), bell(uq, 0.78, 1.0),
    ];
    // a Apresentação 3D também acende no fim do carregamento (a cena nasce ali)
    const viewOn = Math.max(on[2], inSetup ? bell(us, 0.75, 1.0) * 0.8 : 0);
    blockViews[0].setHighlight(on[0]);
    blockViews[1].setHighlight(on[1]);
    blockViews[2].setHighlight(viewOn);
    blockViews[3].setHighlight(on[3]);
  }

  return loop(frame);
}
