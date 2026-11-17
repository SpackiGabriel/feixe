// Vista de cima (plano XZ). Colisão por eixo, como em src/core/movement.js:
// tenta Δx (bloqueado → descarta), depois tenta Δz (livre → aplica) → desliza.
import { el, setAttrs, makeSvg, loop, token, label, arrow, ease, clamp01 } from './_kit.js';

const W = 534;
const H = 468;
const PERIOD = 8; // s
const HALF = 28; // meio lado do jogador (PLAYER_RADIUS, ampliado para caber no quadro)
const WALL = { minX: 300, maxX: 360, minZ: 56, maxZ: 440 };
const START = { x: 44, z: 112 }; // 44 + 6·38 = 272: o centro para exatamente no tracejado
const DELTA = { x: 38, z: 20 }; // passo desejado por tick
const STEPS = 12;
const STEP_TIME = 0.45;
const LEAD = 0.6; // pausa antes do primeiro passo
const FLASH = 0.45; // fração do passo em que Δx pisca (se bloqueado)

// Mesma regra de movement.js: sobrepõe a AABB expandida pelo raio.
function overlaps(x, z, c) {
  return x + HALF > c.minX && x - HALF < c.maxX && z + HALF > c.minZ && z - HALF < c.maxZ;
}

// Simulação: cada passo resolve x primeiro, depois z.
function simulate() {
  const steps = [];
  let x = START.x;
  let z = START.z;
  for (let i = 0; i < STEPS; i += 1) {
    const tryX = x + DELTA.x;
    const blockedX = overlaps(tryX, z, WALL);
    const nx = blockedX ? x : tryX;
    const tryZ = z + DELTA.z;
    const blockedZ = overlaps(nx, tryZ, WALL);
    const nz = blockedZ ? z : tryZ;
    steps.push({ from: { x, z }, mid: { x: nx, z }, to: { x: nx, z: nz }, blockedX, blockedZ });
    x = nx;
    z = nz;
  }
  return steps;
}

// "Δx" fica acima do começo da seta, à esquerda do centro: nunca sobre a parede, o tracejado, o rastro ou a borda
// (conferido ao longo do laço inteiro por uma varredura de todas as posições).
export const deltaXLabelPos = (px, pz) => ({ x: Math.max(px - 30, 32), y: pz - 72 });
export const GEOM = { HALF, WALL, START, DELTA, STEPS, STEP_TIME, LEAD, PERIOD };
export { simulate };

export default function mount(host) {
  const P = 'nav-collision';
  const svg = makeSvg(host, W, H, P);
  const accent = token('c-yellow') || '#ffe047';
  const red = token('c-red') || '#ff3b30';
  const green = token('c-green') || '#2ee66b';
  const dim = token('paper-dim') || '#8d897e';
  const beamColor = token('beam') || '#fff1d6';
  const steps = simulate();
  const paperColor = token('paper') || '#d9d4c7';

  // Parede
  el('rect', {
    x: WALL.minX, y: WALL.minZ, width: WALL.maxX - WALL.minX, height: WALL.maxZ - WALL.minZ,
    fill: '#1a2226', stroke: '#cfd6d8', 'stroke-width': 4, rx: 4,
  }, svg);
  // Contorno expandido (onde o CENTRO do jogador é barrado)
  el('rect', {
    x: WALL.minX - HALF, y: WALL.minZ - HALF, width: WALL.maxX - WALL.minX + 2 * HALF, height: WALL.maxZ - WALL.minZ + 2 * HALF,
    fill: 'none', stroke: dim, 'stroke-width': 1.8, 'stroke-dasharray': '5 6', rx: 18,
  }, svg);
  const wallLabel = label(svg, 'parede', paperColor, { size: 17, italic: false, anchor: 'start' });
  setAttrs(wallLabel, { x: WALL.maxX + HALF + 10, y: WALL.minZ + 18, 'font-family': 'var(--text)' });

  const trail = el('g', {}, svg);
  const dots = steps.map(() => el('circle', { r: 6, fill: beamColor, opacity: 0 }, trail));
  const startDot = el('circle', { cx: START.x, cy: START.z, r: 6, fill: beamColor, opacity: 0.5 }, trail);
  void startDot;

  // Tentativa de Δx (fantasma)
  const ghost = el('rect', { width: HALF * 2, height: HALF * 2, rx: 8, fill: 'none', 'stroke-width': 3.5, 'stroke-dasharray': '5 4', opacity: 0 }, svg);

  // Jogador + seta de frente
  // (coordenadas absolutas: o filtro de brilho recorta dentro de grupos com translate)
  const playerBody = el('rect', {
    width: HALF * 2, height: HALF * 2, rx: 8,
    fill: accent, 'fill-opacity': 0.2, stroke: accent, 'stroke-width': 4, filter: `url(#${P}-glow)`,
  }, svg);
  const front = arrow(svg, accent, { width: 5, head: 18 });
  // Legenda fixa (fora do caminho do jogador e longe da parede)
  arrow(svg, accent, { width: 4, head: 12 }).set(16, 418, 56, 418);
  const frontLabel = label(svg, 'frente', accent, { size: 18, italic: false, anchor: 'start' });
  setAttrs(frontLabel, { x: 66, y: 418, 'font-family': 'var(--text)' });
  el('line', { x1: 16, y1: 446, x2: 56, y2: 446, stroke: dim, 'stroke-width': 1.8, 'stroke-dasharray': '5 6' }, svg);
  const limitLabel = label(svg, 'limite do centro', dim, { size: 18, italic: false, anchor: 'start' });
  setAttrs(limitLabel, { x: 66, y: 446, 'font-family': 'var(--text)' });
  const dirLen = Math.hypot(DELTA.x, DELTA.z);

  // Δx (horizontal) e Δz (vertical) saindo do jogador
  const arrX = arrow(svg, green, { width: 4, head: 15 });
  const arrZ = arrow(svg, green, { width: 4, head: 15 });
  const lblX = label(svg, 'Δx', green, { size: 28 });
  const lblZ = label(svg, 'Δz', green, { size: 28 });

  function frame(elapsed) {
    const t = elapsed % PERIOD;
    const clock = (t - LEAD) / STEP_TIME;
    const idx = Math.max(0, Math.min(STEPS - 1, Math.floor(clock)));
    const done = clock >= STEPS;
    const k = done ? 1 : clamp01(clock - idx);
    const s = steps[idx];

    // Posição: fase 1 (Δx) em [0, 0.5], fase 2 (Δz) em [0.5, 1]
    const kx = ease.smooth(clamp01(k / 0.5));
    const kz = ease.smooth(clamp01((k - 0.5) / 0.5));
    const px = s.from.x + (s.mid.x - s.from.x) * kx;
    const pz = s.from.z + (s.to.z - s.from.z) * kz;
    const started = clock >= 0;
    const fade = Math.min(1, clamp01((PERIOD - t) / 0.4), clamp01(t / 0.3));
    setAttrs(playerBody, { x: px - HALF, y: pz - HALF, opacity: fade });
    front.set(px, pz, px + (DELTA.x / dirLen) * 60, pz + (DELTA.z / dirLen) * 60);
    front.group.setAttribute('opacity', fade);

    // Rastro: pontos dos passos já concluídos
    dots.forEach((dot, i) => {
      const finished = started && (i < idx || (i === idx && k >= 1));
      setAttrs(dot, { cx: steps[i].to.x, cy: steps[i].to.z, opacity: finished ? 0.55 * fade : 0 });
    });
    startDot.setAttribute('opacity', 0.5 * fade);

    // Δx: seta horizontal; se bloqueado, vermelha com fantasma que pisca e some
    const phaseX = k < 0.5;
    const flashing = s.blockedX && k < 0.5 + 0.2 && started && !done;
    const colorX = s.blockedX ? red : green;
    arrX.group.setAttribute('opacity', started && !done && phaseX ? fade : 0);
    for (const child of arrX.group.children) {
      child.setAttribute(child.tagName === 'line' ? 'stroke' : 'fill', colorX);
    }
    arrX.set(px - 18, pz - HALF - 20, px + 58, pz - HALF - 20);
    setAttrs(lblX, { ...deltaXLabelPos(px, pz), fill: colorX });
    lblX.setAttribute('opacity', started && !done && (phaseX || flashing) ? fade : 0);

    setAttrs(ghost, { x: s.from.x + DELTA.x - HALF, y: s.from.z - HALF, stroke: red });
    ghost.setAttribute('opacity', s.blockedX && started && !done && k < 0.5 + FLASH * 0.5 ? 0.9 * fade * (1 - clamp01((k - 0.5) / 0.3)) : 0);

    // Δz: seta vertical na fase 2 (bloqueada em z só se também colidir)
    const phaseZ = k >= 0.5;
    arrZ.group.setAttribute('opacity', started && !done && phaseZ ? fade : 0);
    arrZ.set(px - HALF - 22, pz - 20, px - HALF - 22, pz + 48);
    setAttrs(lblZ, { x: px - HALF - 50, y: pz + 14 });
    lblZ.setAttribute('opacity', started && !done && phaseZ ? fade : 0);
  }

  return loop(frame);
}
