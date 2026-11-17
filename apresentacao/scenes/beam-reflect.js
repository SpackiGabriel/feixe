// Cena de referência: vista de cima (plano XZ). O espelho oscila ±θ e o
// feixe refletido, calculado de verdade por r = d − 2(d·n)n, gira 2θ.
import { el, setAttrs, makeSvg, beam, loop, token, arcPath, arrow, label } from './_kit.js';

const W = 623;
const H = 468;
const PIVOT = { x: 372, y: 372 };
const REST_ANGLE = (3 * Math.PI) / 4; // espelho a 135°: feixe horizontal sai para cima
const THETA_MAX = (14 * Math.PI) / 180;
const PERIOD = 9; // s
const MIRROR_HALF = 84;
const REFLECTED_LENGTH = 330;

function reflect(d, n) {
  const k = 2 * (d.x * n.x + d.y * n.y);
  return { x: d.x - k * n.x, y: d.y - k * n.y };
}

export const GEOM = { PIVOT, REST_ANGLE, THETA_MAX, PERIOD, MIRROR_HALF, REFLECTED_LENGTH };

// "2θ" fica ao lado do feixe refletido, do lado de fora (longe da vertical
// tracejada), a 188 px do pivô: nunca em cima do feixe nem da tracejada.
export function twoThetaPos(r) {
  const side = Math.sign(r.x) || 1;
  return { x: PIVOT.x + r.x * 188 + side * -r.y * 36, y: PIVOT.y + r.y * 188 + side * r.x * 36 };
}

export default function mount(host) {
  const P = 'beam-reflect';
  const svg = makeSvg(host, W, H, P);
  const beamColor = token('beam') || '#fff1d6';
  const dim = token('paper-dim') || '#8d897e';
  const faint = token('paper-faint') || '#5a5851';
  const yellow = token('c-yellow') || '#ffe047'; // normal n (a mesma cor da fórmula)
  const accent = token('c-green') || '#2ee66b'; // ângulos θ e 2θ (os mesmos do tópico)
  const steel = '#cfd6d8';

  // Fantasmas da posição de repouso (θ = 0)
  const ghostMirror = el('line', { stroke: faint, 'stroke-width': 2, 'stroke-dasharray': '6 6' }, svg);
  const ghostBeam = el('line', { stroke: faint, 'stroke-width': 2, 'stroke-dasharray': '6 6' }, svg);

  // Emissor
  el('rect', { x: 18, y: PIVOT.y - 22, width: 62, height: 44, rx: 8, fill: '#11171a', stroke: dim, 'stroke-width': 1.5 }, svg);
  el('circle', { cx: 49, cy: PIVOT.y, r: 7, fill: beamColor, filter: `url(#${P}-glow)` }, svg);

  const incoming = beam(svg, beamColor, P);
  const reflected = beam(svg, beamColor, P);
  incoming.set(80, PIVOT.y, PIVOT.x, PIVOT.y);

  // Espelho + pivô
  const mirror = el('line', { stroke: steel, 'stroke-width': 7, 'stroke-linecap': 'round' }, svg);
  el('circle', { cx: PIVOT.x, cy: PIVOT.y, r: 5, fill: '#07090a', stroke: steel, 'stroke-width': 2 }, svg);

  // Normal n
  const normal = arrow(svg, yellow, { width: 3, head: 12, dash: '5 5' });
  const nLabel = label(svg, 'n', yellow, { size: 26 });

  // Arcos θ (espelho) e 2θ (feixe)
  const thetaArc = el('path', { fill: 'none', stroke: accent, 'stroke-width': 3 }, svg);
  const twoThetaArc = el('path', { fill: 'none', stroke: accent, 'stroke-width': 3 }, svg);
  const thetaLabel = label(svg, 'θ', accent, { size: 28 });
  const twoThetaLabel = label(svg, '2θ', accent, { size: 30 });

  label(svg, 'd', beamColor, { size: 26 }).setAttribute('transform', `translate(${(80 + PIVOT.x) / 2}, ${PIVOT.y + 28})`);
  const rLabel = label(svg, 'r', beamColor, { size: 26 });

  const restMirrorUp = REST_ANGLE - Math.PI; // metade do espelho que aponta para cima-direita
  const restBeamAngle = -Math.PI / 2;
  setAttrs(ghostMirror, {
    x1: PIVOT.x - Math.cos(REST_ANGLE) * MIRROR_HALF,
    y1: PIVOT.y - Math.sin(REST_ANGLE) * MIRROR_HALF,
    x2: PIVOT.x + Math.cos(REST_ANGLE) * MIRROR_HALF,
    y2: PIVOT.y + Math.sin(REST_ANGLE) * MIRROR_HALF,
  });
  setAttrs(ghostBeam, { x1: PIVOT.x, y1: PIVOT.y, x2: PIVOT.x, y2: PIVOT.y - REFLECTED_LENGTH });

  function frame(t) {
    const theta = THETA_MAX * Math.sin((2 * Math.PI * t) / PERIOD);
    const angle = REST_ANGLE + theta;
    const m = { x: Math.cos(angle), y: Math.sin(angle) };
    setAttrs(mirror, {
      x1: PIVOT.x - m.x * MIRROR_HALF,
      y1: PIVOT.y - m.y * MIRROR_HALF,
      x2: PIVOT.x + m.x * MIRROR_HALF,
      y2: PIVOT.y + m.y * MIRROR_HALF,
    });

    const d = { x: 1, y: 0 };
    let n = { x: -m.y, y: m.x };
    if (d.x * n.x + d.y * n.y > 0) n = { x: -n.x, y: -n.y }; // normal do lado de onde o feixe vem
    const r = reflect(d, n);
    const end = { x: PIVOT.x + r.x * REFLECTED_LENGTH, y: PIVOT.y + r.y * REFLECTED_LENGTH };
    reflected.set(PIVOT.x, PIVOT.y, end.x, end.y);
    setAttrs(rLabel, { x: PIVOT.x + r.x * 250 + 24, y: PIVOT.y + r.y * 250 });

    normal.set(PIVOT.x, PIVOT.y, PIVOT.x + n.x * 80, PIVOT.y + n.y * 80);
    setAttrs(nLabel, { x: PIVOT.x + n.x * 104, y: PIVOT.y + n.y * 104 });

    const visible = Math.abs(theta) > (2 * Math.PI) / 180 ? 1 : 0;
    const mirrorUp = restMirrorUp + theta;
    const beamAngle = Math.atan2(r.y, r.x);
    thetaArc.setAttribute('d', arcPath(PIVOT.x, PIVOT.y, 92, Math.min(restMirrorUp, mirrorUp), Math.max(restMirrorUp, mirrorUp)));
    twoThetaArc.setAttribute('d', arcPath(PIVOT.x, PIVOT.y, 170, Math.min(restBeamAngle, beamAngle), Math.max(restBeamAngle, beamAngle)));
    const midTheta = (restMirrorUp + mirrorUp) / 2;
    setAttrs(thetaLabel, { x: PIVOT.x + Math.cos(midTheta) * 116, y: PIVOT.y + Math.sin(midTheta) * 116 });
    setAttrs(twoThetaLabel, twoThetaPos(r));
    for (const node of [thetaArc, twoThetaArc, thetaLabel, twoThetaLabel]) node.setAttribute('opacity', visible);
  }

  return loop(frame);
}
