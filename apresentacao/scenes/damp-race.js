// Corrida de suavização (painel 534×468): damp exponencial (independe da taxa
// de quadros) contra lerp com fator fixo por quadro (depende). Simulação real
// em passos discretos por trilha; as leituras de x são feitas nos instantes que
// os quadros de 30 e de 144 FPS têm em comum (múltiplos de 1/6 s), então as
// duas trilhas de damp mostram exatamente o mesmo número.
import { el, setAttrs, makeSvg, loop, token, clamp01 } from './_kit.js';

const W = 534;
const H = 468;
const LAMBDA = 4;
const LERP_FACTOR = 0.1;
const X0 = 36; // x = 0
const X1 = 380; // alvo (as leituras ficam à direita, longe da linha)
const SIM_TOTAL = 1.8; // s simulados por volta (o lerp a 30 FPS chega em 1,47 s)
const MOVE_TIME = 6.2; // s reais em movimento (câmera lenta)
const PERIOD = 8.4; // s reais por volta
const COMMON = 1 / 6; // quadros em comum entre 30 e 144 FPS

const damp = (x, target, dt) => target + (x - target) * Math.exp(-LAMBDA * dt);
const lerp = (x, target) => x + (target - x) * LERP_FACTOR;
const T99 = Math.log(100) / LAMBDA; // tempo analítico em que o damp chega a 99 %

const TRACKS = [
  { name: 'damp · 30 FPS', fps: 30, step: (x, dt) => damp(x, 1, dt), color: 'c-yellow', analytic: true },
  { name: 'damp · 144 FPS', fps: 144, step: (x, dt) => damp(x, 1, dt), color: 'c-yellow', analytic: true },
  { name: 'lerp · 144 FPS', fps: 144, step: (x) => lerp(x, 1), color: 'c-red', analytic: false },
  { name: 'lerp · 30 FPS', fps: 30, step: (x) => lerp(x, 1), color: 'c-red', analytic: false },
];
const ROW_TOP = 40;
const ROW_H = 98;

// Estado depois de n quadros (n = floor(simTime / dt))
function simulate(track, simTime) {
  const dt = 1 / track.fps;
  const frames = Math.floor(simTime / dt + 1e-9);
  const xs = [0];
  let arrived = null;
  let x = 0;
  for (let n = 1; n <= frames; n += 1) {
    x = track.step(x, dt);
    xs.push(x);
    if (arrived === null && x >= 0.99) arrived = n * dt;
  }
  return { xs, arrived, x };
}

export default function mount(host) {
  const PFX = 'damp-race';
  const svg = makeSvg(host, W, H, PFX);
  const paper = token('paper') || '#d9d4c7';
  const dim = token('paper-dim') || '#8d897e';
  const faint = token('paper-faint') || '#5a5851';
  const beamColor = token('beam') || '#fff1d6';
  const px = (x) => X0 + x * (X1 - X0);

  // Alvo
  el('line', { x1: px(1), y1: 28, x2: px(1), y2: ROW_TOP + ROW_H * 4 - 14, stroke: beamColor, 'stroke-width': 2, 'stroke-dasharray': '2 6' }, svg);
  el('text', { x: px(1), y: 22, text: 'alvo', fill: beamColor, 'font-size': 18, 'text-anchor': 'middle' }, svg);
  el('text', { x: X0, y: 22, text: 'início', fill: dim, 'font-size': 18, 'text-anchor': 'middle' }, svg);
  el('line', { x1: X0, y1: 28, x2: X0, y2: ROW_TOP + ROW_H * 4 - 14, stroke: faint, 'stroke-width': 1.5 }, svg);

  const clock = el('text', { x: W - 16, y: H - 10, fill: dim, 'font-size': 17, 'text-anchor': 'end', 'font-family': 'var(--math)' }, svg);

  const rows = TRACKS.map((track, i) => {
    const y0 = ROW_TOP + i * ROW_H;
    const trackY = y0 + 52;
    const color = token(track.color) || (track.color === 'c-red' ? '#ff3b30' : '#ffe047');
    el('text', { x: X0, y: y0 + 22, text: track.name, fill: paper, 'font-size': 19, 'font-weight': 600 }, svg);
    el('line', { x1: X0, y1: trackY, x2: px(1), y2: trackY, stroke: faint, 'stroke-width': 2 }, svg);
    const ticks = el('path', { fill: 'none', stroke: color, 'stroke-opacity': 0.55, 'stroke-width': 1.2 }, svg);
    const ball = el('circle', { cy: trackY, r: 12, fill: color, filter: `url(#${PFX}-glow)` }, svg);
    const info = el('text', { x: W - 16, y: y0 + 22, fill: paper, 'font-size': 18, 'font-family': 'var(--math)', 'text-anchor': 'end' }, svg);
    const hit = el('text', { x: W - 16, y: y0 + 84, fill: color, 'font-size': 17, 'font-family': 'var(--math)', 'text-anchor': 'end' }, svg);
    return { track, trackY, ticks, ball, info, hit };
  });

  function frame(t) {
    const local = t % PERIOD;
    const simTime = Math.min(SIM_TOTAL, (local / MOVE_TIME) * SIM_TOTAL);
    // some e reinicia nos últimos 0,5 s
    svg.setAttribute('opacity', clamp01((PERIOD - local) / 0.5));
    const common = Math.floor(simTime / COMMON + 1e-9) * COMMON; // último instante comum
    // o relógio e as leituras de x se referem ao mesmo instante
    setAttrs(clock, { text: `t = ${common.toFixed(2).replace('.', ',')} s · câmera lenta` });

    for (const row of rows) {
      const { xs, arrived, x } = simulate(row.track, simTime);
      let d = '';
      for (let n = 1; n < xs.length; n += 1) d += `M${px(xs[n]).toFixed(1)} ${row.trackY - 10}v20`;
      row.ticks.setAttribute('d', d);
      row.ball.setAttribute('cx', px(x));
      // leitura de x no instante comum: igual nas duas trilhas de damp
      row.info.textContent = `x = ${simulate(row.track, common).x.toFixed(3).replace('.', ',')}`;
      // damp: 99 % em T99 para qualquer FPS; lerp: o tempo do quadro em que chegou
      const reached = row.track.analytic ? common >= T99 - 1e-9 : arrived !== null && arrived <= common + 1e-9;
      const secs = reached ? (row.track.analytic ? T99 : arrived) : null;
      row.hit.textContent = secs === null ? '' : `99 % em ${secs.toFixed(2).replace('.', ',')} s`;
    }
  }

  return loop(frame);
}
