// O carregamento de uma câmara, em planta (625×468, painel de .body.cols-wide-right).
// Dados: src/levels/data/level-3.js ("Ângulo"), coordenadas reais em metros, plano XZ vista de cima
// (x para a direita, z para baixo; a sala é 10×10, ROOM_HALF = 5, src/levels/data/constants.js).
//   emissor  e1 (0, 4.6)  aponta para −z (rotationY 0 → direção (−sin ψ, −cos ψ), laser-system.js:6-9)
//   espelho  m1 (0, −1)   placa de 1 m (PLATE_WIDTH, mirror.js:9), gira de 15° em 15°
//   receptor r1 (−3.4, 4.9) painel de 0,8 m (receiver.js:10)
//   porta    d1 (0, −4.9) rotationY π, largura 2 m (door-view.js:6)
//   solution { m1: rotationY −π/12 }
// O feixe usa o mesmo algoritmo de src/gameplay/laser.js: interseção raio × segmento,
// reflect(d, n) = d − 2(d·n)n com n = perpendicular da placa. O laço mostra
// instantiateLevel (campos acendem e as peças nascem), a solution, e disposeLevel.
import { el, setAttrs, makeSvg, beam, loop, token, label, clamp01, ease } from './_kit.js';

const W = 625;
const H = 468;
const PERIOD = 18; // s

// --- dados reais de level-3.js ---
const ROOM_HALF = 5;
const PLATE_WIDTH = 1;
const RECEIVER_WIDTH = 0.8;
const DOOR_WIDTH = 2;
const EMITTER = { pos: { x: 0, z: 4.6 }, rotationY: 0 };
const MIRROR = { pos: { x: 0, z: -1 }, rotationY: 0 };
const RECEIVER = { pos: { x: -3.4, z: 4.9 }, rotationY: 0 };
const DOOR = { pos: { x: 0, z: -(ROOM_HALF - 0.1) } };
const SOLUTION_ROT = -Math.PI / 12;

// --- o mesmo cálculo de laser.js (2D no plano XZ) ---
const vec = (x, z) => ({ x, z });
const sub = (a, b) => vec(a.x - b.x, a.z - b.z);
const add = (a, b) => vec(a.x + b.x, a.z + b.z);
const scale = (a, s) => vec(a.x * s, a.z * s);
const dot = (a, b) => a.x * b.x + a.z * b.z;
const normalize = (a) => { const l = Math.hypot(a.x, a.z) || 1; return vec(a.x / l, a.z / l); };
const reflect = (dir, normal) => { const n = normalize(normal); return normalize(sub(dir, scale(n, 2 * dot(dir, n)))); };
function intersectRaySegment(origin, dir, a, b) {
  const v1 = sub(origin, a);
  const v2 = sub(b, a);
  const v3 = vec(-dir.z, dir.x);
  const denom = dot(v2, v3);
  if (Math.abs(denom) < 1e-9) return null;
  const t = (v2.x * v1.z - v2.z * v1.x) / denom;
  const s = dot(v1, v3) / denom;
  return t > 1e-4 && s >= 0 && s <= 1 ? { t, point: add(origin, scale(dir, t)) } : null;
}
// segmento de uma peça de largura w, girada de ψ em torno de Y (segmentFromCenter / getReflectiveSegment)
function segmentOf(pos, rotationY, w) {
  const h = w / 2;
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  return { a: vec(pos.x - h * c, pos.z + h * s), b: vec(pos.x + h * c, pos.z - h * s) };
}
function traceBeam(segments, pos, dir) {
  const pts = [pos];
  let status = 'escaped';
  for (let step = 0; step < 6; step++) {
    let closest = null;
    for (const seg of segments) {
      const hit = intersectRaySegment(pos, dir, seg.a, seg.b);
      if (hit && (!closest || hit.t < closest.hit.t)) closest = { hit, seg };
    }
    if (!closest) break;
    pts.push(closest.hit.point);
    if (closest.seg.type !== 'mirror') { status = closest.seg.type; break; }
    dir = reflect(dir, vec(-(closest.seg.b.z - closest.seg.a.z), closest.seg.b.x - closest.seg.a.x));
    pos = add(closest.hit.point, scale(dir, 1e-4));
  }
  return { pts, status };
}
const ROOM_WALLS = [
  { type: 'wall', a: vec(-5, -5), b: vec(5, -5) },
  { type: 'wall', a: vec(5, -5), b: vec(5, 5) },
  { type: 'wall', a: vec(5, 5), b: vec(-5, 5) },
  { type: 'wall', a: vec(-5, 5), b: vec(-5, -5) },
];

// --- tela ---
const S = 38; // px por metro
const OX = 8;
const OY = 46;
const px = (x) => OX + (x + ROOM_HALF) * S;
const py = (z) => OY + (z + ROOM_HALF) * S;

const FIELDS = [
  { key: 'mirrors', sub: 'm1 · gira 15°' },
  { key: 'emitters', sub: 'e1 · vermelho' },
  { key: 'receivers', sub: 'r1 · vermelho' },
  { key: 'doors', sub: 'd1 · saída' },
  { key: 'solution', sub: 'm1 → −15°' },
];
const COL_X = 410;
const ROW_W = 208;
const ROW_H = 58;
const ROW_Y0 = 56;
const ROW_STEP = 66;

// janelas do laço (fração de PERIOD)
const T_APPEAR = [0.07, 0.17, 0.27, 0.37]; // quando cada campo acende (espelhos, emissores, receptores, portas: a ordem de level-3.js)
const T_BEAM = 0.42; // feixe nasce
const T_SOL = [0.52, 0.66]; // solution: o espelho gira
const T_OPEN = [0.70, 0.78]; // a porta abre
const T_DISPOSE = [0.90, 0.96]; // disposeLevel: tudo some

export default function mount(host) {
  const P = 'lvload';
  const svg = makeSvg(host, W, H, P);
  const paper = token('paper') || '#d9d4c7';
  const dim = token('paper-dim') || '#8d897e';
  const faint = token('paper-faint') || '#5a5851';
  const beamColor = token('beam') || '#fff1d6';
  const panelFill = token('panel') || '#0c1012';
  const red = token('c-red') || '#ff3b30';
  const blue = token('c-blue') || '#3b9eff';
  const yellow = token('c-yellow') || '#ffe047';

  // Sala (fixa: createScene, não faz parte do arquivo da câmara)
  el('rect', { x: px(-5), y: py(-5), width: 10 * S, height: 10 * S, fill: 'none', stroke: faint, 'stroke-width': 3 }, svg);

  // Estágio atual (esquerda) e nome do arquivo (direita)
  const stage = label(svg, '', beamColor, { size: 19, italic: false, anchor: 'start' });
  setAttrs(stage, { x: OX, y: 24, 'font-family': 'var(--mono)', 'font-weight': 600 });
  const fileName = label(svg, 'level-3.js', dim, { size: 19, italic: false, anchor: 'start' });
  setAttrs(fileName, { x: COL_X, y: 24, 'font-family': 'var(--mono)' });

  // Linhas de campos
  const rows = FIELDS.map((f, i) => {
    const y = ROW_Y0 + i * ROW_STEP;
    const g = el('g', {}, svg);
    const glow = el('rect', { x: COL_X - 2, y: y - 2, width: ROW_W + 4, height: ROW_H + 4, rx: 12, fill: 'none', stroke: beamColor, 'stroke-width': 3, opacity: 0 }, g);
    const box = el('rect', { x: COL_X, y, width: ROW_W, height: ROW_H, rx: 11, fill: panelFill, stroke: beamColor, 'stroke-opacity': 0.3, 'stroke-width': 2 }, g);
    const key = label(g, `${f.key}:`, paper, { size: 20, italic: false, anchor: 'start' });
    setAttrs(key, { x: COL_X + 14, y: y + 19, 'font-family': 'var(--mono)', 'font-weight': 600 });
    const val = label(g, f.sub, dim, { size: 16, italic: false, anchor: 'start' });
    setAttrs(val, { x: COL_X + 14, y: y + 42, 'font-family': 'var(--text)' });
    return {
      set(level) {
        box.setAttribute('stroke-opacity', (0.3 + level * 0.7).toFixed(2));
        glow.setAttribute('opacity', (level * 0.7).toFixed(2));
        key.setAttribute('opacity', (0.45 + level * 0.55).toFixed(2));
        val.setAttribute('opacity', (0.45 + level * 0.55).toFixed(2));
      },
    };
  });

  // Peças (cada uma num grupo para aparecer/sumir)
  const gEmitter = el('g', {}, svg);
  const ex = px(EMITTER.pos.x);
  const ey = py(EMITTER.pos.z);
  el('path', { d: `M ${ex} ${ey - 18} L ${ex + 15} ${ey + 12} L ${ex - 15} ${ey + 12} Z`, fill: panelFill, stroke: red, 'stroke-width': 3, 'stroke-linejoin': 'round' }, gEmitter);
  const eLabel = label(gEmitter, 'e1', paper, { size: 17, italic: false, anchor: 'start' });
  setAttrs(eLabel, { x: ex + 24, y: ey - 2, 'font-family': 'var(--mono)' });

  const gMirror = el('g', {}, svg);
  const mirrorLine = el('line', { stroke: blue, 'stroke-width': 7, 'stroke-linecap': 'round' }, gMirror);
  el('circle', { cx: px(MIRROR.pos.x), cy: py(MIRROR.pos.z), r: 3.5, fill: panelFill }, gMirror);
  const mLabel = label(gMirror, 'm1', paper, { size: 17, italic: false, anchor: 'start' });
  setAttrs(mLabel, { x: px(MIRROR.pos.x) + 34, y: py(MIRROR.pos.z) + 4, 'font-family': 'var(--mono)' });

  const gReceiver = el('g', {}, svg);
  const rSeg = segmentOf(RECEIVER.pos, RECEIVER.rotationY, RECEIVER_WIDTH);
  const rBase = el('line', { x1: px(rSeg.a.x), y1: py(rSeg.a.z), x2: px(rSeg.b.x), y2: py(rSeg.b.z), stroke: red, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-opacity': 0.55 }, gReceiver);
  const rGlow = el('circle', { cx: px(RECEIVER.pos.x), cy: py(RECEIVER.pos.z), r: 18, fill: red, opacity: 0, filter: `url(#${P}-glow)` }, gReceiver);
  const rLabel = label(gReceiver, 'r1', paper, { size: 17, italic: false, anchor: 'end' });
  setAttrs(rLabel, { x: px(RECEIVER.pos.x) - 28, y: py(RECEIVER.pos.z) - 26, 'font-family': 'var(--mono)' });

  const gDoor = el('g', {}, svg);
  const dx = px(DOOR.pos.x);
  const dy = py(DOOR.pos.z);
  const doorL = el('line', { stroke: yellow, 'stroke-width': 8, 'stroke-linecap': 'butt' }, gDoor);
  const doorR = el('line', { stroke: yellow, 'stroke-width': 8, 'stroke-linecap': 'butt' }, gDoor);
  const dLabel = label(gDoor, 'd1', paper, { size: 17, italic: false, anchor: 'start' });
  setAttrs(dLabel, { x: dx + DOOR_WIDTH * S / 2 + 12, y: dy + 22, 'font-family': 'var(--mono)' });

  const emitBeams = [beam(svg, red, P, { width: 3.5, halo: 13 }), beam(svg, red, P, { width: 3.5, halo: 13 })];

  const caption = label(svg, 'planta · vista de cima', dim, { size: 17, italic: false, anchor: 'start' });
  setAttrs(caption, { x: 120, y: OY + 10 * S + 24, 'font-family': 'var(--text)' });

  function frame(t) {
    const u = (t % PERIOD) / PERIOD;
    const disp = clamp01((u - T_DISPOSE[0]) / (T_DISPOSE[1] - T_DISPOSE[0]));
    const gone = u > T_DISPOSE[1] ? 1 : disp;
    const fade = 1 - gone;

    // campos e peças
    const appear = T_APPEAR.map((a) => clamp01((u - a) / 0.05) * fade);
    const solAppear = clamp01((u - T_SOL[0] + 0.03) / 0.03) * fade;
    const flash = (a, b) => (u < a || u > b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI));
    rows[0].set(Math.max(flash(T_APPEAR[0], T_APPEAR[0] + 0.1) * 0.9, appear[0] * 0.35));
    rows[1].set(Math.max(flash(T_APPEAR[1], T_APPEAR[1] + 0.1) * 0.9, appear[1] * 0.35));
    rows[2].set(Math.max(flash(T_APPEAR[2], T_APPEAR[2] + 0.1) * 0.9, appear[2] * 0.35));
    rows[3].set(Math.max(flash(T_APPEAR[3], T_APPEAR[3] + 0.1) * 0.9, appear[3] * 0.35));
    rows[4].set(Math.max(flash(T_SOL[0] - 0.03, T_SOL[1]) * 0.9, solAppear * 0.35 * clamp01(1 - (u - 0.8) * 8)));
    gMirror.setAttribute('opacity', appear[0].toFixed(2));
    gEmitter.setAttribute('opacity', appear[1].toFixed(2));
    gReceiver.setAttribute('opacity', appear[2].toFixed(2));
    gDoor.setAttribute('opacity', appear[3].toFixed(2));

    // espelho: gira de 0 até a solution, com o passo real da caixa (animação suave entre 0 e −15°)
    const k = ease.inOut(clamp01((u - T_SOL[0]) / (T_SOL[1] - T_SOL[0])));
    const rot = u > T_DISPOSE[0] ? SOLUTION_ROT : MIRROR.rotationY + (SOLUTION_ROT - MIRROR.rotationY) * k;
    const mSeg = segmentOf(MIRROR.pos, rot, PLATE_WIDTH);
    setAttrs(mirrorLine, { x1: px(mSeg.a.x), y1: py(mSeg.a.z), x2: px(mSeg.b.x), y2: py(mSeg.b.z) });

    // feixe traçado com o algoritmo de laser.js
    const segments = [
      ...ROOM_WALLS,
      { type: 'mirror', ...mSeg },
      { type: 'receiver', ...rSeg },
    ];
    const dir = { x: -Math.sin(EMITTER.rotationY), z: -Math.cos(EMITTER.rotationY) };
    const trace = traceBeam(segments, EMITTER.pos, dir);
    const beamOn = clamp01((u - T_BEAM) / 0.04) * fade;
    emitBeams.forEach((b, i) => {
      const a = trace.pts[i];
      const bb = trace.pts[i + 1];
      if (!a || !bb) { b.group.setAttribute('opacity', 0); return; }
      b.set(px(a.x), py(a.z), px(bb.x), py(bb.z));
      b.group.setAttribute('opacity', beamOn.toFixed(2));
    });

    // receptor trava (o feixe chega nele) e a porta abre
    const locked = trace.status === 'receiver' && beamOn > 0.5;
    rGlow.setAttribute('opacity', locked ? (0.55 * fade).toFixed(2) : 0);
    rBase.setAttribute('stroke-opacity', locked ? 1 : 0.55);
    const open = ease.inOut(clamp01((u - T_OPEN[0]) / (T_OPEN[1] - T_OPEN[0]))) * (locked ? 1 : 0);
    const half = DOOR_WIDTH * S / 2;
    setAttrs(doorL, { x1: dx - half - open * half, y1: dy, x2: dx - open * half, y2: dy });
    setAttrs(doorR, { x1: dx + open * half, y1: dy, x2: dx + half + open * half, y2: dy });

    // estágio
    let text = '';
    if (u >= 0.03 && u < T_BEAM - 0.02) text = 'instantiateLevel';
    else if (u >= T_BEAM - 0.02 && u < T_SOL[0] - 0.03) text = 'traceBeam';
    else if (u >= T_BEAM - 0.02 && u < T_DISPOSE[0]) text = 'solution → traceBeam';
    else if (u >= T_DISPOSE[0]) text = 'disposeLevel';
    stage.textContent = text;
  }

  return loop(frame);
}
