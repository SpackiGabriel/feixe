// Corte 2D do modelo Blinn-Phong (src/presentation/phong-material.js), painel 445×468:
// N, L, V, H = normalize(L + V) e as três parcelas calculadas a cada quadro.
// Cores iguais às da fórmula do slide: ambiente verde, difuso amarelo, especular azul.
import { el, setAttrs, makeSvg, loop, token, arcPath, arrow, label } from './_kit.js';

const W = 445;
const H = 468;
const P = { x: 222, y: 262 }; // ponto na superfície
const ORBIT = 190;
const EYE_R = 150; // o olho fica DENTRO da órbita, a 40 px dela: a luz nunca passa por cima dele
const SHININESS = 32;
const KA = 0.18; // ambiente constante (barra)
const PERIOD = 10; // s
const EYE_ELEV = (40 * Math.PI) / 180;
const BAR = { x: 128, w: 218, h: 16 };

const dot = (a, b) => a.x * b.x + a.y * b.y;
const norm = (v) => {
  const l = Math.hypot(v.x, v.y);
  return { x: v.x / l, y: v.y / l };
};

// ---------- Posição dos rótulos N, V, L, H ----------
// O movimento da luz é periódico e conhecido, então as posições dos rótulos são
// PLANEJADAS no mount (ver createLabelLayout): cada rótulo usa uma posição
// relativa ao próprio vetor que fica livre de setas, luz, olho e outros rótulos
// o laço inteiro e, quando isso é impossível, a sequência com o menor número de
// trocas, cada uma um deslize de ~0,33 s que também não atravessa seta.
// O olho fica dentro da órbita para deixar livre a faixa externa dela.
const V_DIR = { x: Math.cos(EYE_ELEV), y: Math.sin(EYE_ELEV) };
const TIP = { N: 118, V: EYE_R - 26, L: 112, H: 92 };
const LABEL_R = 14; // meio corpo de uma letra de 26 px, com folga
const CLEAR = 17; // distância mínima do centro do rótulo a uma seta
const CLEAR_MOVING = 9; // idem, durante o deslize de uma posição à outra
const SPOTS = [];
for (const r of [104, 142, 172, 222]) {
  for (const sd of [0, 26, -26, 40, -40, 56, -56]) SPOTS.push({ r, sd });
}

const segDist = (p, a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};

export const lightElevation = (t) => (90 + 65 * Math.cos((2 * Math.PI * t) / PERIOD + 0.9)) * (Math.PI / 180);

// Vetores (coordenadas de matemática, y para cima) e pontos de tela para uma luz a `elev` radianos.
export function geometry(elev) {
  const L = { x: Math.cos(elev), y: Math.sin(elev) };
  const Hv = norm({ x: L.x + V_DIR.x, y: L.y + V_DIR.y });
  const dirs = { N: { x: 0, y: 1 }, V: V_DIR, L, H: Hv };
  const pt = (v, k) => ({ x: P.x + v.x * k, y: P.y - v.y * k });
  const arrows = {};
  for (const k of Object.keys(dirs)) arrows[k] = [P, pt(dirs[k], TIP[k])];
  return { dirs, arrows, light: pt(L, ORBIT), eye: pt(V_DIR, EYE_R), pt };
}

const spotAt = (g, key, o) => {
  const u = g.dirs[key];
  return { x: P.x + u.x * o.r + u.y * o.sd, y: P.y - u.y * o.r + u.x * o.sd };
};

// `c` está livre de setas, luz, olho e (se dados) de outros rótulos?
// `relaxed`: folgas menores, usadas só no meio de um deslize (ainda sem tocar numa seta).
function isFree(g, c, others = [], relaxed = false) {
  const clear = relaxed ? CLEAR_MOVING : CLEAR;
  const pad = relaxed ? 2 : 3;
  if (c.x < 18 || c.x > 432 || c.y < 26 || c.y > P.y - 20) return false;
  for (const seg of Object.values(g.arrows)) if (segDist(c, seg[0], seg[1]) < clear) return false;
  if (Math.hypot(c.x - g.light.x, c.y - g.light.y) < 11 + LABEL_R + pad) return false;
  if (Math.hypot(c.x - g.eye.x, c.y - g.eye.y) < 16 + LABEL_R + pad) return false;
  for (const o of others) if (Math.hypot(c.x - o.x, c.y - o.y) < 2 * LABEL_R + 3) return false;
  return true;
}

const FRAMES = 60; // um período do laço em 60 quadros de planejamento
const DT = PERIOD / FRAMES;
const SLIDE_FRAMES = 2; // o deslize de uma posição à outra dura 2 quadros de planejamento (~0,33 s)
const SUB = 4; // amostras por quadro ao conferir que a posição fica livre
const ease = (p) => p * p * (3 - 2 * p);
const mod = (n) => ((n % FRAMES) + FRAMES) % FRAMES;
const offsetBlend = (o1, o2, p) => {
  const k = ease(p);
  return { r: o1.r + (o2.r - o1.r) * k, sd: o1.sd + (o2.sd - o1.sd) * k };
};

// Os rótulos são PLANEJADOS uma vez, no mount, para o laço inteiro (o movimento da luz
// é periódico e conhecido): para cada rótulo, programação dinâmica escolhe a sequência
// de posições candidatas, relativas ao próprio vetor, com o MENOR número de trocas, de
// modo que a posição esteja sempre livre (setas, luz, olho e rótulos já planejados) e
// que cada troca seja um deslize livre de setas. Em tempo de execução só se lê o plano.
export function createLabelLayout() {
  const plans = {}; // key -> { slot: [idx por quadro], slide: [{from,to}|null por quadro de início] }
  const geoAt = (t) => geometry(lightElevation(t));
  // amostras do planejamento: múltiplos de DT/SUB (periódicas), guardadas para não recalcular
  const SAMPLES = FRAMES * SUB;
  const geoCache = new Map();
  const geoIdx = (idx) => {
    const k = ((idx % SAMPLES) + SAMPLES) % SAMPLES;
    if (!geoCache.has(k)) geoCache.set(k, geoAt((k * DT) / SUB));
    return geoCache.get(k);
  };
  const posCache = new Map();
  const posIdx = (key, idx) => {
    const k = ((idx % SAMPLES) + SAMPLES) % SAMPLES;
    const id = key + k;
    if (!posCache.has(id)) posCache.set(id, posOf(key, (k * DT) / SUB, geoIdx(k)));
    return posCache.get(id);
  };
  const offsetOf = (key, t) => {
    const plan = plans[key];
    const u = t / DT;
    const fi = mod(Math.floor(u));
    const frac = u - Math.floor(u);
    if (plan.slide[fi]) return offsetBlend(SPOTS[plan.slide[fi].from], SPOTS[plan.slide[fi].to], frac / SLIDE_FRAMES);
    const prev = plan.slide[mod(fi - 1)];
    if (prev) return offsetBlend(SPOTS[prev.from], SPOTS[prev.to], (1 + frac) / SLIDE_FRAMES);
    return SPOTS[plan.slot[fi]];
  };
  const posOf = (key, t, g = geoAt(t)) => spotAt(g, key, offsetOf(key, t));

  function plan(key, earlier) {
    const others = (idx) => earlier.map((k) => posIdx(k, idx));
    const okAt = (spot, idx) => {
      const g = geoIdx(idx);
      return isFree(g, spotAt(g, key, spot), others(idx), false);
    };
    // livre durante todo o quadro f?
    const free = [];
    for (let f = 0; f < FRAMES; f++) {
      free[f] = SPOTS.map((spot) => {
        for (let i = 0; i < SUB; i++) if (!okAt(spot, f * SUB + i)) return false;
        return true;
      });
    }
    const pathCache = new Map();
    const pathFree = (f, i, j) => {
      const id = (f * SPOTS.length + i) * SPOTS.length + j;
      if (pathCache.has(id)) return pathCache.get(id);
      let ok = true;
      for (let n = 1; n < SLIDE_FRAMES * SUB && ok; n++) {
        const idx = f * SUB + n;
        const o = offsetBlend(SPOTS[i], SPOTS[j], n / (SLIDE_FRAMES * SUB));
        const g = geoIdx(idx);
        ok = isFree(g, spotAt(g, key, o), others(idx), true);
      }
      pathCache.set(id, ok);
      return ok;
    };
    const n = SPOTS.length;
    // caminho rápido: uma posição livre o laço todo (nenhuma troca)
    let still = -1;
    let stillCost = Infinity;
    for (let i = 0; i < n; i++) {
      if (!free.every((row) => row[i])) continue;
      const c = 0.1 * Math.abs(SPOTS[i].sd) + 0.5 * Math.abs(SPOTS[i].r - TIP[key]);
      if (c < stillCost) { stillCost = c; still = i; }
    }
    if (still >= 0) {
      plans[key] = { slot: new Array(FRAMES).fill(still), slide: new Array(FRAMES).fill(null), solved: true };
      return;
    }
    let best = null;
    for (let s0 = 0; s0 < n; s0++) {
      if (!free[0][s0]) continue;
      // cost[f][i]: menor número de trocas para estar em i no início do quadro f
      const cost = Array.from({ length: FRAMES + 1 }, () => new Array(n).fill(Infinity));
      const from = Array.from({ length: FRAMES + 1 }, () => new Array(n).fill(null));
      cost[0][s0] = 0;
      for (let f = 0; f < FRAMES; f++) {
        for (let i = 0; i < n; i++) {
          const c = cost[f][i];
          if (c === Infinity) continue;
          const stay = c + 1e-5 * (0.1 * Math.abs(SPOTS[i].sd) + 0.5 * Math.abs(SPOTS[i].r - TIP[key])); // empate: perto do próprio vetor
          if (free[f][i] && stay < cost[f + 1][i]) { cost[f + 1][i] = stay; from[f + 1][i] = { i, len: 1 }; }
          if (f + SLIDE_FRAMES <= FRAMES && free[f][i]) {
            for (let j = 0; j < n; j++) {
              if (j === i || !free[mod(f + SLIDE_FRAMES)][j]) continue;
              const c2 = c + 1 + 0.001 * Math.abs(SPOTS[j].sd);
              if (c2 < cost[f + SLIDE_FRAMES][j] && pathFree(f, i, j)) { cost[f + SLIDE_FRAMES][j] = c2; from[f + SLIDE_FRAMES][j] = { i, len: SLIDE_FRAMES }; }
            }
          }
        }
      }
      const total = cost[FRAMES][s0] + 0.0001 * Math.abs(SPOTS[s0].sd);
      if (total < (best ? best.total : Infinity)) best = { s0, total, cost, from };
    }
    const result = { slot: new Array(FRAMES).fill(0), slide: new Array(FRAMES).fill(null), solved: !!best };
    if (!best) { // sem plano livre: usa a candidata mais próxima do vetor (a conferência acusa)
      plans[key] = result;
      return;
    }
    let f = FRAMES;
    let i = best.s0;
    while (f > 0) {
      const step = best.from[f][i];
      if (step.len === 1) { result.slot[f - 1] = step.i; } else {
        result.slide[f - SLIDE_FRAMES] = { from: step.i, to: i };
        result.slot[f - 2] = step.i; result.slot[f - 1] = step.i; // (ignorado durante o deslize)
      }
      f -= step.len;
      i = step.i;
    }
    plans[key] = result;
  }
  const keys = ['N', 'V', 'L', 'H'];
  keys.forEach((key, n) => plan(key, keys.slice(0, n)));

  return {
    plans,
    switches: () => Object.fromEntries(keys.map((k) => [k, plans[k].slide.filter(Boolean).length])),
    solved: () => keys.every((k) => plans[k].solved),
    step(t) {
      const tt = ((t % PERIOD) + PERIOD) % PERIOD;
      const g = geoAt(tt);
      const pos = {};
      for (const k of keys) pos[k] = posOf(k, tt, g);
      return { pos, g };
    },
  };
}

export default function mount(host) {
  const PFX = 'blinn-phong';
  const svg = makeSvg(host, W, H, PFX);
  const paper = token('paper') || '#d9d4c7';
  const dim = token('paper-dim') || '#8d897e';
  const faint = token('paper-faint') || '#5a5851';
  const green = token('c-green') || '#2ee66b';
  const yellow = token('c-yellow') || '#ffe047';
  const blue = token('c-blue') || '#3b9eff';
  const beamColor = token('beam') || '#fff1d6';

  // Coordenadas matemáticas (y para cima) -> tela
  const sx = (v, k = 1) => P.x + v.x * k;
  const sy = (v, k = 1) => P.y - v.y * k;

  // Superfície e órbita da luz
  el('line', { x1: 14, y1: P.y, x2: W - 14, y2: P.y, stroke: paper, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  el('path', {
    d: arcPath(P.x, P.y, ORBIT, -Math.PI + 0.44, -0.44), fill: 'none', stroke: faint, 'stroke-width': 1.5, 'stroke-dasharray': '3 7',
  }, svg);

  // Brilho em P (halo proporcional à intensidade)
  const halo = el('ellipse', { cx: P.x, cy: P.y, fill: beamColor, filter: `url(#${PFX}-glow)` }, svg);
  const core = el('ellipse', { cx: P.x, cy: P.y, ry: 3.5, fill: beamColor }, svg);
  el('circle', { cx: P.x, cy: P.y, r: 4, fill: '#07090a', stroke: paper, 'stroke-width': 2 }, svg);

  // Olho (fixo): neutro, não pertence a nenhuma parcela
  const V = { x: Math.cos(EYE_ELEV), y: Math.sin(EYE_ELEV) };
  const eye = el('g', {}, svg);
  el('ellipse', { cx: sx(V, EYE_R), cy: sy(V, EYE_R), rx: 16, ry: 10, fill: '#07090a', stroke: dim, 'stroke-width': 2.5 }, eye);
  el('circle', { cx: sx(V, EYE_R), cy: sy(V, EYE_R), r: 5, fill: dim }, eye);

  // Luz
  const lightDot = el('circle', { r: 11, fill: yellow, filter: `url(#${PFX}-glow)` }, svg);

  // Setas
  const aN = arrow(svg, paper, { width: 2.5, head: 12 });
  const aV = arrow(svg, dim, { width: 2.5, head: 12 });
  const aL = arrow(svg, yellow, { width: 3, head: 12 });
  const aH = arrow(svg, blue, { width: 3.5, head: 13 });
  aN.set(P.x, P.y, P.x, P.y - 118);
  aV.set(P.x, P.y, sx(V, EYE_R - 26), sy(V, EYE_R - 26));
  const texts = {
    N: label(svg, 'N', paper, { size: 26 }),
    V: label(svg, 'V', dim, { size: 26 }),
    L: label(svg, 'L', yellow, { size: 26 }),
    H: label(svg, 'H', blue, { size: 26 }),
  };
  const layout = createLabelLayout();

  // Barras: ambiente, difuso, especular
  const rows = [
    { name: 'ambiente', y: 328, color: green },
    { name: 'difuso', y: 384, color: yellow },
    { name: 'especular', y: 440, color: blue },
  ];
  const bars = rows.map((row) => {
    el('text', { x: 16, y: row.y + 5, text: row.name, fill: row.color, 'font-size': 19, 'font-weight': 600 }, svg);
    el('rect', { x: BAR.x, y: row.y - 8, width: BAR.w, height: BAR.h, rx: 4, fill: '#11171a', stroke: faint, 'stroke-width': 1 }, svg);
    const fill = el('rect', { x: BAR.x, y: row.y - 8, height: BAR.h, rx: 4, fill: row.color }, svg);
    const value = el('text', {
      x: BAR.x + BAR.w + 12, y: row.y + 5, fill: paper, 'font-size': 18, 'font-family': 'var(--math)',
    }, svg);
    return { fill, value };
  });

  const arcAngle = el('path', { fill: 'none', stroke: blue, 'stroke-opacity': 0.7, 'stroke-width': 2.5 }, svg);

  function frame(t) {
    // Luz oscila 25°..155° de elevação, passando pelo espelhamento de V (140°)
    const elev = lightElevation(t);
    const L = { x: Math.cos(elev), y: Math.sin(elev) };
    const N = { x: 0, y: 1 };
    const Hv = norm({ x: L.x + V.x, y: L.y + V.y });

    const diffuse = Math.max(dot(N, L), 0);
    const specular = dot(N, L) > 0 ? Math.pow(Math.max(dot(N, Hv), 0), SHININESS) : 0;

    setAttrs(lightDot, { cx: sx(L, ORBIT), cy: sy(L, ORBIT) });
    aL.set(P.x, P.y, sx(L, 120), sy(L, 120));
    aH.set(P.x, P.y, sx(Hv, 92), sy(Hv, 92));
    const { pos } = layout.step(t);
    for (const key of Object.keys(texts)) setAttrs(texts[key], pos[key]);
    // ângulo entre N e H: o que o especular mede
    const hAng = Math.atan2(Hv.y, Hv.x);
    // arcPath usa y de tela: espelhar os ângulos
    arcAngle.setAttribute('d', arcPath(P.x, P.y, 60, -Math.max(hAng, Math.PI / 2), -Math.min(hAng, Math.PI / 2)));

    const values = [KA, diffuse, specular];
    values.forEach((v, i) => {
      bars[i].fill.setAttribute('width', Math.max(v, 0.004) * BAR.w);
      bars[i].value.textContent = v.toFixed(2).replace('.', ',');
    });

    // Brilho em P: ka·Ia + kd·difuso + ks·especular (pesos só para ler bem)
    const glow = Math.min(1, KA * 0.6 + diffuse * 0.5 + specular * 1.1);
    setAttrs(halo, { rx: 24 + glow * 62, ry: 4 + glow * 16, 'fill-opacity': 0.12 + glow * 0.55 });
    setAttrs(core, { rx: 12 + glow * 70, 'fill-opacity': 0.2 + glow * 0.8 });
  }

  return loop(frame);
}
