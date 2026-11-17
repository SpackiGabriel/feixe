// Fundo de capa (1280×720): feixe branco entra pela esquerda na metade de
// baixo, atinge um prisma no centro-direita e se abre em R, G, B. O canto
// superior esquerdo até o centro fica livre para o título da capa.
import { el, setAttrs, makeSvg, beam, loop, token } from './_kit.js';

const W = 1280;
const H = 720;
const PERIOD = 12; // s — movimento muito calmo

const PRISM = { x: 820, y: 495 };
const PRISM_R = 68;
const SOURCE = { x: -20, y: 615 };

const PARTICLES = [
  { x: 720, y: 540, r: 1.6, ax: 14, ay: 10, phase: 0.2 },
  { x: 780, y: 420, r: 1.4, ax: 10, ay: 14, phase: 1.1 },
  { x: 860, y: 565, r: 1.8, ax: 16, ay: 11, phase: 2.3 },
  { x: 930, y: 390, r: 1.5, ax: 18, ay: 12, phase: 3.4 },
  { x: 985, y: 485, r: 2.0, ax: 14, ay: 15, phase: 4.2 },
  { x: 1050, y: 350, r: 1.3, ax: 12, ay: 10, phase: 5.0 },
  { x: 1090, y: 555, r: 1.7, ax: 15, ay: 13, phase: 0.8 },
  { x: 1155, y: 430, r: 1.5, ax: 13, ay: 11, phase: 2.9 },
  { x: 1210, y: 515, r: 1.4, ax: 11, ay: 14, phase: 4.7 },
  { x: 640, y: 575, r: 1.3, ax: 12, ay: 8, phase: 1.9 },
];

function lerpPt(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function trianglePoints(cx, cy, r, rot) {
  const pts = [];
  for (let i = 0; i < 3; i += 1) {
    const a = rot - Math.PI / 2 + (i * 2 * Math.PI) / 3;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

export default function mount(host) {
  const P = 'cover-beam';
  const svg = makeSvg(host, W, H, P);

  const white = token('beam') || '#fff1d6';
  const red = token('c-red') || '#ff3b30';
  const green = token('c-green') || '#2ee66b';
  const blue = token('c-blue') || '#3b9eff';
  const paper = token('paper') || '#d9d4c7';

  const sceneGroup = el('g', { opacity: 0.78 }, svg);

  // Anel técnico sutil ao redor do prisma
  el('circle', {
    cx: PRISM.x,
    cy: PRISM.y,
    r: 104,
    fill: 'none',
    stroke: paper,
    'stroke-opacity': 0.08,
    'stroke-width': 1,
    'stroke-dasharray': '4 8',
  }, sceneGroup);

  // Feixe branco de entrada (metade inferior esquerda → prisma)
  const incoming = beam(sceneGroup, white, P, { width: 3.2, halo: 16, opacity: 0.85 });
  const inPulse = beam(sceneGroup, white, P, { width: 5, halo: 22, opacity: 0 });

  // Feixes dispersos R, G, B saindo para a direita
  const outBeams = [
    { color: red, baseY: 315, spread: -16, ray: null, pulse: null, inner: null },
    { color: green, baseY: 455, spread: 2, ray: null, pulse: null, inner: null },
    { color: blue, baseY: 595, spread: 18, ray: null, pulse: null, inner: null },
  ];

  // Leque interno de dispersão dentro do prisma
  const innerGroup = el('g', { opacity: 0.55 }, sceneGroup);
  for (const item of outBeams) {
    item.inner = el('line', {
      stroke: item.color,
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
      filter: `url(#${P}-glow)`,
    }, innerGroup);
    item.ray = beam(sceneGroup, item.color, P, { width: 2.8, halo: 14, opacity: 0.78 });
    item.pulse = beam(sceneGroup, item.color, P, { width: 4.8, halo: 22, opacity: 0 });
  }

  // Prisma triangular translúcido
  const prismBody = el('polygon', {
    fill: white,
    'fill-opacity': 0.05,
    stroke: paper,
    'stroke-opacity': 0.55,
    'stroke-width': 1.8,
    'stroke-linejoin': 'round',
  }, sceneGroup);

  // Brilho no ponto de entrada e saída do prisma
  const hitGlow = el('circle', {
    r: 4.5,
    fill: white,
    filter: `url(#${P}-glow)`,
    opacity: 0.85,
  }, sceneGroup);

  // Partículas sutis flutuando na metade inferior direita
  const particleGroup = el('g', {}, sceneGroup);
  const particleNodes = PARTICLES.map((p, idx) => {
    const color = idx % 3 === 0 ? white : outBeams[idx % 3].color;
    return el('circle', {
      cx: p.x,
      cy: p.y,
      r: p.r,
      fill: color,
      opacity: 0.2,
    }, particleGroup);
  });

  function frame(t) {
    const phase = (2 * Math.PI * t) / PERIOD;
    const sway = Math.sin(phase);
    const rot = -0.06 + sway * 0.035;

    // Vértices do prisma: topo (0), direita-baixo (1), esquerda-baixo (2)
    const v = trianglePoints(PRISM.x, PRISM.y, PRISM_R, rot);
    prismBody.setAttribute('points', v.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));

    // Ponto de incidência na face esquerda (entre v[0] e v[2])
    const hitIn = lerpPt(v[2], v[0], 0.48);
    incoming.set(SOURCE.x, SOURCE.y, hitIn.x, hitIn.y);
    setAttrs(hitGlow, { cx: hitIn.x, cy: hitIn.y, opacity: 0.65 + 0.25 * Math.cos(phase * 2) });

    // Pontos de saída na face direita (entre v[0] e v[1])
    const exitFracs = [0.38, 0.52, 0.66];
    const ends = [];
    for (let i = 0; i < outBeams.length; i += 1) {
      const item = outBeams[i];
      const exitPt = lerpPt(v[0], v[1], exitFracs[i]);
      const endPt = {
        x: W + 30,
        y: item.baseY + sway * item.spread + Math.cos(phase + i) * 10,
      };
      ends.push({ start: exitPt, end: endPt });
      setAttrs(item.inner, { x1: hitIn.x, y1: hitIn.y, x2: exitPt.x, y2: exitPt.y });
      item.ray.set(exitPt.x, exitPt.y, endPt.x, endPt.y);
    }

    // Pulso de luz percorrendo o feixe branco e depois os 3 feixes R, G, B
    // Dois ciclos suaves de pulso a cada período de 12 s (6 s cada travessia)
    const u = ((t % (PERIOD / 2)) / (PERIOD / 2));
    const segLen = 0.16;

    if (u < 0.48) {
      const k = u / 0.48;
      const a = Math.max(0, k - segLen);
      const b = Math.min(1, k + segLen * 0.5);
      const p0 = lerpPt(SOURCE, hitIn, a);
      const p1 = lerpPt(SOURCE, hitIn, b);
      inPulse.set(p0.x, p0.y, p1.x, p1.y);
      inPulse.group.setAttribute('opacity', Math.sin(k * Math.PI) * 0.9);
    } else {
      inPulse.group.setAttribute('opacity', 0);
    }

    if (u >= 0.44 && u <= 0.96) {
      const k = (u - 0.44) / 0.52;
      const a = Math.max(0, k - segLen);
      const b = Math.min(1, k + segLen * 0.5);
      const op = Math.sin(k * Math.PI) * 0.95;
      for (let i = 0; i < outBeams.length; i += 1) {
        const p0 = lerpPt(ends[i].start, ends[i].end, a);
        const p1 = lerpPt(ends[i].start, ends[i].end, b);
        outBeams[i].pulse.set(p0.x, p0.y, p1.x, p1.y);
        outBeams[i].pulse.group.setAttribute('opacity', op);
      }
    } else {
      for (const item of outBeams) item.pulse.group.setAttribute('opacity', 0);
    }

    // Movimento calmo das partículas
    for (let i = 0; i < PARTICLES.length; i += 1) {
      const p = PARTICLES[i];
      const px = p.x + Math.sin(phase + p.phase) * p.ax;
      const py = p.y + Math.cos(phase + p.phase * 1.3) * p.ay;
      const op = 0.14 + 0.16 * (0.5 + 0.5 * Math.sin(phase * 2 + p.phase));
      setAttrs(particleNodes[i], { cx: px, cy: py, opacity: op });
    }
  }

  return loop(frame);
}
