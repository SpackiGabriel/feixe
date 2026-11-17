// Vista lateral do frustum (profundidade para a direita, painel 534×468). Dois
// postes iguais, um à profundidade w e outro a 2w (depois 2,8w). A projeção no
// plano é a de verdade (y · d / z): o poste do dobro da distância sai com metade
// da altura.
import { el, setAttrs, makeSvg, loop, token, label, ease, clamp01 } from './_kit.js';

const W = 534;
const H = 468;
const PERIOD = 9; // s
const CAM = { x: 44, y: 232 };
const PLANE_D = 70; // distância câmera → plano de projeção
const Z1 = 140; // profundidade do poste próximo (w)
const TAN_HALF = 1; // tan(FOV/2): 90° de campo, para o frustum caber no painel
const POLE_UP = 118; // altura do topo acima do olho
const POLE_DOWN = 78; // base abaixo do olho
const FAR_W_MAX = 2.8;

export default function mount(host) {
  const P = 'frustum-w';
  const svg = makeSvg(host, W, H, P);
  const dim = token('paper-dim') || '#8d897e';
  const faint = token('paper-faint') || '#5a5851';
  const near = token('c-yellow') || '#ffe047';
  const far = token('c-blue') || '#3b9eff';
  const beamColor = token('beam') || '#fff1d6';
  const planeX = CAM.x + PLANE_D;

  // Chão
  el('line', { x1: 16, y1: CAM.y + POLE_DOWN, x2: W - 16, y2: CAM.y + POLE_DOWN, stroke: faint, 'stroke-width': 1.5, 'stroke-dasharray': '3 7' }, svg);

  // Linhas do FOV (do olho até a borda do quadro)
  const reach = W - CAM.x - 8;
  for (const sign of [-1, 1]) {
    el('line', {
      x1: CAM.x, y1: CAM.y, x2: CAM.x + reach, y2: CAM.y + sign * reach * TAN_HALF, stroke: dim, 'stroke-width': 2, 'stroke-opacity': 0.7,
    }, svg);
  }
  // Eixo de profundidade
  el('line', { x1: CAM.x, y1: CAM.y, x2: W - 16, y2: CAM.y, stroke: faint, 'stroke-width': 1.2, 'stroke-dasharray': '2 6' }, svg);

  // Plano de projeção
  const half = PLANE_D * TAN_HALF;
  el('line', { x1: planeX, y1: CAM.y - half, x2: planeX, y2: CAM.y + half, stroke: beamColor, 'stroke-width': 3, 'stroke-opacity': 0.55 }, svg);

  // Câmera
  el('polygon', {
    points: `${CAM.x - 26},${CAM.y - 16} ${CAM.x - 4},${CAM.y - 16} ${CAM.x + 6},${CAM.y} ${CAM.x - 4},${CAM.y + 16} ${CAM.x - 26},${CAM.y + 16}`,
    fill: '#11171a', stroke: dim, 'stroke-width': 2, 'stroke-linejoin': 'round',
  }, svg);

  function makePole(color) {
    const sightTop = el('line', { stroke: color, 'stroke-width': 1.8, 'stroke-opacity': 0.8, 'stroke-dasharray': '6 5' }, svg);
    const sightBase = el('line', { stroke: color, 'stroke-width': 1.8, 'stroke-opacity': 0.8, 'stroke-dasharray': '6 5' }, svg);
    const pole = el('line', { stroke: color, 'stroke-width': 7, 'stroke-linecap': 'round', filter: `url(#${P}-glow)` }, svg);
    const shadow = el('line', { stroke: color, 'stroke-width': 7, 'stroke-linecap': 'round', filter: `url(#${P}-glow)` }, svg);
    const text = label(svg, '', color, { size: 26 });
    return { sightTop, sightBase, pole, projected: shadow, text };
  }
  const nearPole = makePole(near);
  const farPole = makePole(far);
  const ratio = label(svg, '', far, { size: 24, italic: false, anchor: 'start' });
  setAttrs(ratio, { 'font-family': 'var(--text)' });


  // Projeta o poste à profundidade z e devolve a posição na tela.
  function place(p, z, dx) {
    const x = CAM.x + z;
    const wClip = z / PLANE_D; // w do clip space (a perspectiva divide por z)
    // y no mundo relativo ao olho (para cima = negativo na tela)
    const topScreen = CAM.y - POLE_UP;
    const baseScreen = CAM.y + POLE_DOWN;
    const yTopNdc = (topScreen - CAM.y) / wClip;
    const yBaseNdc = (baseScreen - CAM.y) / wClip;
    setAttrs(p.pole, { x1: x, y1: topScreen, x2: x, y2: baseScreen });
    setAttrs(p.sightTop, { x1: CAM.x, y1: CAM.y, x2: x, y2: topScreen });
    setAttrs(p.sightBase, { x1: CAM.x, y1: CAM.y, x2: x, y2: baseScreen });
    setAttrs(p.projected, { x1: planeX + dx, y1: CAM.y + yTopNdc, x2: planeX + dx, y2: CAM.y + yBaseNdc });
    return { x, projHeight: yBaseNdc - yTopNdc, yTopNdc };
  }

  function frame(elapsed) {
    const t = elapsed % PERIOD;
    // w do poste distante: 2 → 2.8 → 2, com pausa em w = 2 no começo e no fim
    const u = clamp01((t - 1.8) / 5.4);
    const wFar = 2 + (FAR_W_MAX - 2) * ease.smooth(1 - Math.abs(1 - 2 * u));

    const a = place(nearPole, Z1, -7);
    const b = place(farPole, Z1 * wFar, 7);

    const wText = wFar.toFixed(1).replace('.', ',');
    const isHalf = Math.abs(wFar - 2) < 0.04;
    nearPole.text.textContent = 'w';
    setAttrs(nearPole.text, { x: a.x, y: CAM.y + POLE_DOWN + 32 });
    farPole.text.textContent = isHalf ? '2w' : `${wText}w`;
    setAttrs(farPole.text, { x: b.x, y: CAM.y + POLE_DOWN + 32 });

    // altura projetada do distante ÷ a do próximo (calculada, não escrita à mão)
    const share = b.projHeight / a.projHeight;
    ratio.textContent = isHalf ? 'metade da altura' : `${share.toFixed(2).replace('.', ',')} da altura`;
    setAttrs(ratio, { x: 24, y: H - 22 });
    ratio.setAttribute('opacity', 1);
  }

  return loop(frame);
}
