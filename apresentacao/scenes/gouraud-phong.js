// Mesma parede (2 triângulos) iluminada por uma luz pontual: à esquerda a
// intensidade é calculada por fragmento (célula), à direita só nos 4 vértices
// e interpolada por coordenadas baricêntricas.
import { el, setAttrs, makeSvg, loop, token } from './_kit.js';

const W = 623;
const H = 330; // o painel do slide 11 (conferido pelo deck-check)
const COLS = 40;
const ROWS = 24;
const PANEL_W = 292;
const PANEL_H = 175; // 40:24
const PANELS = [{ x: 14, y: 60 }, { x: 317, y: 60 }];
const K = 0.03; // I = 1 / (1 + k·d²), d em células
const LIGHT_HEIGHT = 4; // distância da luz à parede, em células
const PERIOD = 10; // s

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

export default function mount(host) {
  const PFX = 'gouraud-phong';
  const svg = makeSvg(host, W, H, PFX);
  const paper = token('paper') || '#d9d4c7';
  const dim = token('paper-dim') || '#8d897e';
  const beamColor = token('beam') || '#fff1d6';
  const red = hex(token('c-red') || '#ff3b30');
  const beamRgb = hex(beamColor.startsWith('#') ? beamColor : '#fff1d6');
  const cell = { w: PANEL_W / COLS, h: PANEL_H / ROWS };

  // Cor quente: vermelho quase apagado -> feixe branco-quente no pico
  function shade(i) {
    const k = Math.min(1, i * 1.8);
    const mix = k * k;
    const rgb = red.map((c, n) => c * (1 - mix) + beamRgb[n] * mix);
    const f = 0.06 + 0.94 * k;
    return `rgb(${Math.round(rgb[0] * f)},${Math.round(rgb[1] * f)},${Math.round(rgb[2] * f)})`;
  }

  const panels = PANELS.map((origin, index) => {
    const g = el('g', { transform: `translate(${origin.x}, ${origin.y})` }, svg);
    const cells = [];
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        cells.push(el('rect', {
          x: c * cell.w - 0.2, y: r * cell.h - 0.2, width: cell.w + 0.4, height: cell.h + 0.4, 'shape-rendering': 'crispEdges',
        }, g));
      }
    }
    // Moldura, diagonal (aresta compartilhada dos 2 triângulos) e vértices
    el('rect', { width: PANEL_W, height: PANEL_H, fill: 'none', stroke: dim, 'stroke-width': 1.5 }, g);
    el('line', { x1: 0, y1: 0, x2: PANEL_W, y2: PANEL_H, stroke: paper, 'stroke-opacity': 0.55, 'stroke-width': 1 }, g);
    const corners = [[0, 0], [PANEL_W, 0], [PANEL_W, PANEL_H], [0, PANEL_H]];
    if (index === 1) {
      for (const [x, y] of corners) el('circle', { cx: x, cy: y, r: 5, fill: beamColor, stroke: '#07090a', 'stroke-width': 1.5 }, g);
    }
    const marker = el('circle', { r: 7, fill: 'none', stroke: beamColor, 'stroke-width': 2, filter: `url(#${PFX}-glow)` }, g);
    return { cells, marker };
  });

  const title = (x, text) => el('text', {
    x, y: 34, text, fill: paper, 'font-size': 24, 'font-weight': 600, 'text-anchor': 'middle',
  }, svg);
  title(PANELS[0].x + PANEL_W / 2, 'por fragmento');
  title(PANELS[1].x + PANEL_W / 2, 'por vértice');
  const sub = (x, text) => el('text', {
    x, y: 270, text, fill: dim, 'font-size': 17, 'text-anchor': 'middle', 'font-family': 'var(--text)',
  }, svg);
  sub(PANELS[0].x + PANEL_W / 2, 'luz calculada em cada pixel');
  sub(PANELS[1].x + PANEL_W / 2, 'luz só nos 4 cantos, interpolada');

  const intensity = (px, py, lx, ly) => {
    const dx = px - lx;
    const dy = py - ly;
    return 1 / (1 + K * (dx * dx + dy * dy + LIGHT_HEIGHT * LIGHT_HEIGHT));
  };

  function frame(t) {
    const a = (2 * Math.PI * t) / PERIOD;
    const lx = COLS / 2 + 6.5 * Math.cos(a);
    const ly = ROWS / 2 + 3.6 * Math.sin(2 * a);

    // Vértices: TL, TR, BR, BL (diagonal TL–BR)
    const iTL = intensity(0, 0, lx, ly);
    const iTR = intensity(COLS, 0, lx, ly);
    const iBR = intensity(COLS, ROWS, lx, ly);
    const iBL = intensity(0, ROWS, lx, ly);

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const u = (c + 0.5) / COLS;
        const v = (r + 0.5) / ROWS;
        const k = r * COLS + c;
        // por fragmento: a fórmula no centro da célula
        panels[0].cells[k].setAttribute('fill', shade(intensity(c + 0.5, r + 0.5, lx, ly)));
        // por vértice: baricêntrica dentro do triângulo que contém (u, v)
        let value;
        if (v >= u) value = iTL * (1 - v) + iBL * (v - u) + iBR * u; // TL, BL, BR
        else value = iTL * (1 - u) + iTR * (u - v) + iBR * v; // TL, TR, BR
        panels[1].cells[k].setAttribute('fill', shade(value));
      }
    }
    for (const panel of panels) setAttrs(panel.marker, { cx: lx * cell.w, cy: ly * cell.h });
  }

  return loop(frame);
}
