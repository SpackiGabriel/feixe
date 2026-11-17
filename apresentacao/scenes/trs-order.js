// Planta de uma parede (vista de cima). Duas colunas aplicam as mesmas três
// operações em ordens diferentes, com matrizes 3×3 de verdade:
//   T·R·S (certo): escala no eixo da própria parede, depois gira, depois move.
//   T·S·R (errado): gira o quadrado e escala nos eixos do MUNDO → losango cisalhado.
// Cada coluna mostra a sequência já aplicada e termina nomeando o resultado.
import { el, setAttrs, makeSvg, loop, token, label, ease, clamp01 } from './_kit.js';

const W = 623;
const H = 468;
const U = 60; // pixels por unidade
const PERIOD = 10; // s
const START = 1.0; // pausa inicial
const STEP = 2.0; // duração de cada etapa (movimento + pausa)
const MOVE = 1.3; // parte da etapa em movimento
const FADE = 0.4;
const RESULT_AT = START + 3 * STEP; // quando o resultado aparece
const SCALE = { x: 2.4, y: 0.35 };
const ANGLE = Math.PI / 4;
const SHIFT = { x: 0.5, y: -0.45 };
const CENTER_Y = 228;

const SQUARE = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];

// Matrizes 3×3 homogêneas (linha por linha) em coordenadas de tela (y para baixo).
const identity = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
function mul(a, b) {
  const out = new Array(9).fill(0);
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      for (let k = 0; k < 3; k += 1) out[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
    }
  }
  return out;
}
const scaleM = (sx, sy) => [sx, 0, 0, 0, sy, 0, 0, 0, 1];
const rotateM = (a) => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];
const translateM = (tx, ty) => [1, 0, tx, 0, 1, ty, 0, 0, 1];
const apply = (m, [x, y]) => [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]];

// Cada operação como função de progresso p∈[0,1] → matriz (identidade em p=0).
const ops = {
  S: (p) => scaleM(1 + (SCALE.x - 1) * p, 1 + (SCALE.y - 1) * p),
  R: (p) => rotateM(ANGLE * p),
  T: (p) => translateM(SHIFT.x * p, SHIFT.y * p),
};

const COLUMNS = [
  { title: 'T · R · S', order: ['S', 'R', 'T'], cx: 156, colorName: 'c-green', fallback: '#2ee66b', result: 'parede girada' },
  { title: 'T · S · R', order: ['R', 'S', 'T'], cx: 467, colorName: 'c-red', fallback: '#ff3b30', result: 'losango: errado' },
];

export default function mount(host) {
  const P = 'trs-order';
  const svg = makeSvg(host, W, H, P);
  const faint = token('paper-faint') || '#5a5851';
  const dim = token('paper-dim') || '#8d897e';
  const accent = token('c-yellow') || '#ffe047';

  const cols = COLUMNS.map((def) => {
    const color = token(def.colorName) || def.fallback;
    const g = el('g', { transform: `translate(${def.cx}, 0)` }, svg);
    // Eixos do mundo (a escala da coluna errada age nestes eixos)
    el('line', { x1: -140, y1: CENTER_Y, x2: 140, y2: CENTER_Y, stroke: faint, 'stroke-width': 1.5, 'stroke-dasharray': '4 6' }, g);
    el('line', { x1: 0, y1: CENTER_Y - 110, x2: 0, y2: CENTER_Y + 110, stroke: faint, 'stroke-width': 1.5, 'stroke-dasharray': '4 6' }, g);
    label(g, 'x', faint, { size: 18 }).setAttribute('transform', `translate(130, ${CENTER_Y - 14})`);
    label(g, 'z', faint, { size: 18 }).setAttribute('transform', `translate(12, ${CENTER_Y + 102})`);

    const title = label(g, def.title, color, { size: 32, italic: false });
    setAttrs(title, { x: 0, y: 44 });
    el('line', { x1: -60, y1: 72, x2: 60, y2: 72, stroke: color, 'stroke-width': 2, 'stroke-opacity': 0.5 }, g);

    // Sequência aplicada: três letras na ordem em que a coluna as aplica
    const chips = def.order.map((letter, i) => {
      const node = label(g, letter, dim, { size: 30, italic: false });
      setAttrs(node, { x: (i - 1) * 46, y: CENTER_Y + 150 });
      if (i < 2) {
        const arrow = label(g, '→', faint, { size: 24, italic: false });
        setAttrs(arrow, { x: (i - 0.5) * 46, y: CENTER_Y + 149 });
      }
      return node;
    });
    const result = label(g, def.result, color, { size: 24, italic: false });
    setAttrs(result, { x: 0, y: CENTER_Y + 192, 'font-family': 'var(--text)', 'font-weight': 600 });

    const shapeGroup = el('g', {}, svg); // fora do translate: o filtro de brilho usa coordenadas absolutas
    const ghost = el('polygon', { fill: 'none', stroke: faint, 'stroke-width': 1.5, 'stroke-dasharray': '5 5' }, shapeGroup);
    const poly = el('polygon', {
      fill: color, 'fill-opacity': 0.22, stroke: color, 'stroke-width': 3, 'stroke-linejoin': 'round', filter: `url(#${P}-glow)`,
    }, shapeGroup);
    const mark = el('circle', { r: 6, fill: accent }, shapeGroup); // vértice 0: mostra a orientação
    return { def, shapeGroup, ghost, poly, mark, chips, result };
  });

  function placeColumn(col, t) {
    // etapa atual k (0 = original) e progresso p dentro do movimento
    const local = t - START;
    const stage = local < 0 ? 0 : Math.min(3, Math.floor(local / STEP) + 1);
    const into = local - (stage - 1) * STEP;
    const p = stage === 0 ? 0 : ease.inOut(clamp01(into / MOVE));

    // M = (operação em andamento) · (operações já aplicadas)
    let m = identity();
    for (let i = 0; i < stage - 1; i += 1) m = mul(ops[col.def.order[i]](1), m);
    const ghostM = m;
    if (stage > 0) m = mul(ops[col.def.order[stage - 1]](p), m);

    const toScreen = (matrix, v) => {
      const [x, y] = apply(matrix, v);
      return [col.def.cx + x * U, CENTER_Y + y * U];
    };
    const pts = SQUARE.map((v) => toScreen(m, v));
    col.poly.setAttribute('points', pts.map((q) => q.join(',')).join(' '));
    col.ghost.setAttribute('points', SQUARE.map((v) => toScreen(ghostM, v).join(',')).join(' '));
    col.ghost.setAttribute('opacity', stage > 0 ? 1 : 0);
    setAttrs(col.mark, { cx: pts[0][0], cy: pts[0][1] });

    const fade = Math.min(1, clamp01(t / FADE), clamp01((PERIOD - t) / FADE));
    col.shapeGroup.setAttribute('opacity', fade);
    // letras já aplicadas (e a em curso) acendem; as próximas ficam apagadas
    col.chips.forEach((chip, i) => {
      const lit = i < stage;
      setAttrs(chip, { fill: lit ? accent : faint, opacity: fade });
    });
    col.result.setAttribute('opacity', clamp01((t - RESULT_AT) / 0.5) * fade);
  }

  function frame(elapsed) {
    const t = elapsed % PERIOD;
    for (const col of cols) placeColumn(col, t);
  }

  return loop(frame);
}
