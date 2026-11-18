// Linha do tempo real de um quadro: animate() em src/main.js e update() em
// src/levels/level-runtime.js, na ordem exata de execução, ao lado de uma
// mini planta mostrando o efeito de cada etapa no mesmo quadro.
import { el, setAttrs, makeSvg, beam, loop, token, arrow, clamp01, ease } from './_kit.js';

const W = 534;
const H = 468;
const PERIOD = 11.5; // s por laço (varredura das 13 etapas + pausa final)
const LEAD = 0.5;
const STEP_DUR = 0.65;
const HOLD_AT = LEAD + 13 * STEP_DUR; // 8.95 s, segura resultado até 11.0 s

const STEPS = [
  { id: 'dt', label: 'dt ≤ 0,1 s', group: 'main', msg: 'dt = 16,7 ms (teto 0,1 s)' },
  { id: 'move', label: 'movimento', group: 'main', msg: 'jogador avança Δx, Δz' },
  { id: 'aim', label: 'mira', group: 'main', msg: 'raycast com matrixWorld' },
  { id: 'beams', label: 'feixes', group: 'rt', msg: 'feixe traça e reflete' },
  { id: 'receivers', label: 'receptores', group: 'rt', msg: 'receptor avalia traces' },
  { id: 'portals', label: 'portais', group: 'rt', msg: 'relógio do portal avança' },
  { id: 'devices', label: 'dispositivos', group: 'rt', msg: 'espelho e emissor atualizam' },
  { id: 'blockers', label: 'bloqueadores', group: 'rt', msg: 'bloqueador avalia traces' },
  { id: 'conduits', label: 'condutos', group: 'rt', msg: 'conduto acende no piso' },
  { id: 'doors', label: 'portas', group: 'rt', msg: 'porta destrava (travas soltando)' },
  { id: 'exit', label: 'saída / portal', group: 'rt', msg: 'saída: destravada (ainda 0 %)' },
  { id: 'hud', label: 'interface', group: 'main', msg: 'HUD lê receptor e porta' },
  { id: 'render', label: 'desenho', group: 'main', msg: 'renderer.render(scene)' },
];

const STEP_Y0 = 46;
const STEP_DY = 33;

// Reflexão 2D idêntica a src/gameplay/laser.js: r = d − 2(d·n)n
function reflect(d, n) {
  const dot = d.x * n.x + d.z * n.z;
  return { x: d.x - 2 * dot * n.x, z: d.z - 2 * dot * n.z };
}

export default function mount(host) {
  const P = 'frame-order';
  const svg = makeSvg(host, W, H, P);
  const paper = token('paper') || '#d9d4c7';
  const dim = token('paper-dim') || '#8d897e';
  const faint = token('paper-faint') || '#5a5851';
  const beamColor = token('beam') || '#fff1d6';
  const green = token('c-green') || '#2ee66b';
  const blue = token('c-blue') || '#3b9eff';
  const yellow = token('c-yellow') || '#ffe047';
  const panel = token('panel') || '#0c1012';

  // ---- Coluna esquerda: linha do tempo das 13 etapas ----
  el('text', {
    x: 12, y: 18, text: 'Ordem no quadro', fill: dim, 'font-size': 16,
    'font-family': 'var(--text)', 'dominant-baseline': 'middle',
  }, svg);

  // Fundo sutil agrupando levelRuntime.update() (etapas 3..10)
  el('rect', {
    x: 6, y: STEP_Y0 + 3 * STEP_DY - 15, width: 208, height: 8 * STEP_DY - 3, rx: 8,
    fill: blue, 'fill-opacity': 0.06, stroke: 'none',
  }, svg);

  el('line', {
    x1: 22, y1: STEP_Y0, x2: 22, y2: STEP_Y0 + 12 * STEP_DY,
    stroke: faint, 'stroke-width': 1.5,
  }, svg);

  const stepViews = STEPS.map((step, i) => {
    const y = STEP_Y0 + i * STEP_DY;
    const g = el('g', {}, svg);
    const pill = el('rect', {
      x: 8, y: y - 13, width: 204, height: 26, rx: 6,
      fill: step.group === 'rt' ? blue : beamColor, 'fill-opacity': 0, stroke: 'none',
    }, g);
    const dot = el('circle', {
      cx: 22, cy: y, r: 5, fill: panel, stroke: faint, 'stroke-width': 2,
    }, g);
    const txt = el('text', {
      x: 38, y, text: step.label, fill: dim, 'font-size': 16,
      'font-family': 'var(--text)', 'dominant-baseline': 'middle',
    }, g);
    return { step, pill, dot, txt };
  });

  // ---- Coluna direita: mini planta + consequência ----
  el('text', {
    x: 232, y: 18, text: 'Consequência na câmara', fill: dim, 'font-size': 16,
    'font-family': 'var(--text)', 'dominant-baseline': 'middle',
  }, svg);

  // Caixa de status da etapa atual
  el('rect', {
    x: 232, y: 34, width: 290, height: 36, rx: 8,
    fill: panel, stroke: faint, 'stroke-width': 1.5,
  }, svg);
  const stageReadout = el('text', {
    x: 377, y: 52, text: 'aguardando quadro…', fill: beamColor, 'font-size': 16,
    'font-family': 'var(--text)', 'text-anchor': 'middle', 'dominant-baseline': 'middle',
  }, svg);

  // Sala (planta XZ: [232..522] × [84..366])
  const roomGroup = el('g', {}, svg);
  const roomBox = el('rect', {
    x: 232, y: 84, width: 290, height: 282, rx: 6,
    fill: '#0a0e10', stroke: dim, 'stroke-width': 3,
  }, roomGroup);

  // Porta no topo (vão x = 356..424, y = 84): painel permanece fechado no 1º quadro (releasing)
  const doorPanel = el('rect', {
    x: 356, y: 80, width: 68, height: 8, rx: 2,
    fill: paper, stroke: 'none',
  }, roomGroup);
  const clampL = el('rect', {
    x: 350, y: 78, width: 5, height: 12, rx: 1.5,
    fill: dim, stroke: 'none',
  }, roomGroup);
  const clampR = el('rect', {
    x: 425, y: 78, width: 5, height: 12, rx: 1.5,
    fill: dim, stroke: 'none',
  }, roomGroup);
  el('text', {
    x: 390, y: 108, text: 'porta', fill: paper, 'font-size': 16,
    'text-anchor': 'middle', 'dominant-baseline': 'middle',
  }, roomGroup);

  // Conduto no piso (Receptor -> Porta pela direita, livre de rótulos)
  const conduitPath = 'M 456 324 L 496 324 L 496 98 L 426 98';
  const conduitBase = el('path', {
    d: conduitPath, fill: 'none', stroke: faint, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  }, roomGroup);
  const conduitLit = el('path', {
    d: conduitPath, fill: 'none', stroke: green, 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    filter: `url(#${P}-glow)`, opacity: 0,
  }, roomGroup);
  void conduitBase;

  // Portal (canto superior esquerdo)
  const portalPad = el('rect', {
    x: 256, y: 108, width: 12, height: 26, rx: 4,
    fill: blue, 'fill-opacity': 0.25, stroke: blue, 'stroke-width': 2,
  }, roomGroup);
  el('text', {
    x: 278, y: 121, text: 'portal', fill: blue, 'font-size': 16,
    'text-anchor': 'start', 'dominant-baseline': 'middle',
  }, roomGroup);

  // Emissor (esquerda)
  const EMITTER = { x: 250, z: 178 };
  const emitterBox = el('rect', {
    x: EMITTER.x - 10, y: EMITTER.z - 10, width: 20, height: 20, rx: 4,
    fill: yellow, 'fill-opacity': 0.22, stroke: yellow, 'stroke-width': 2.5,
  }, roomGroup);
  el('text', {
    x: 292, y: 152, text: 'emissor', fill: paper, 'font-size': 16,
    'text-anchor': 'middle', 'dominant-baseline': 'middle',
  }, roomGroup);

  // Espelho (45° no centro-direita)
  const MIRROR = { x: 444, z: 178 };
  const NORMAL = { x: -Math.SQRT1_2, z: Math.SQRT1_2 };
  const reflDir = reflect({ x: 1, z: 0 }, NORMAL);
  const mirrorPlate = el('line', {
    x1: MIRROR.x - 16, y1: MIRROR.z - 16, x2: MIRROR.x + 16, y2: MIRROR.z + 16,
    stroke: paper, 'stroke-width': 5, 'stroke-linecap': 'round',
  }, roomGroup);
  el('text', {
    x: 416, y: 150, text: 'espelho', fill: paper, 'font-size': 16,
    'text-anchor': 'end', 'dominant-baseline': 'middle',
  }, roomGroup);

  // Receptor (embaixo do espelho)
  const RECEIVER = { x: 444, z: 324 };
  const recvBody = el('rect', {
    x: RECEIVER.x - 13, y: RECEIVER.z - 10, width: 26, height: 20, rx: 4,
    fill: panel, stroke: dim, 'stroke-width': 2.5,
  }, roomGroup);
  el('text', {
    x: 444, y: 349, text: 'receptor', fill: paper, 'font-size': 16,
    'text-anchor': 'middle', 'dominant-baseline': 'middle',
  }, roomGroup);

  // Bloqueador (embaixo, fora da linha de mira e do feixe)
  const blockerBox = el('rect', {
    x: 348, y: 304, width: 20, height: 20, rx: 3,
    fill: '#1b2327', stroke: dim, 'stroke-width': 2,
  }, roomGroup);
  el('text', {
    x: 358, y: 344, text: 'bloqueador', fill: dim, 'font-size': 16,
    'text-anchor': 'middle', 'dominant-baseline': 'middle',
  }, roomGroup);

  // Jogador + linha de mira até o espelho
  const PLAYER_0 = { x: 266, z: 304 };
  const PLAYER_1 = { x: 278, z: 294 };
  const aimLine = el('line', {
    x1: PLAYER_1.x, y1: PLAYER_1.z, x2: MIRROR.x - 6, y2: MIRROR.z + 6,
    stroke: beamColor, 'stroke-width': 1.8, 'stroke-dasharray': '5 5', opacity: 0,
  }, roomGroup);
  const playerBox = el('rect', {
    x: PLAYER_0.x - 10, y: PLAYER_0.z - 10, width: 20, height: 20, rx: 4,
    fill: yellow, 'fill-opacity': 0.2, stroke: yellow, 'stroke-width': 2.5,
  }, roomGroup);
  const playerFront = arrow(roomGroup, yellow, { width: 2.5, head: 8 });
  el('text', {
    x: 274, y: 344, text: 'jogador', fill: yellow, 'font-size': 16,
    'text-anchor': 'middle', 'dominant-baseline': 'middle',
  }, roomGroup);

  // Feixe traçado (Emissor -> Espelho -> Receptor)
  const seg1 = beam(roomGroup, yellow, P, { width: 3.5, halo: 13, opacity: 0 });
  const seg2 = beam(roomGroup, yellow, P, { width: 3.5, halo: 13, opacity: 0 });
  const hitDot = el('circle', {
    cx: RECEIVER.x, cy: RECEIVER.z - 10, r: 6, fill: green, filter: `url(#${P}-glow)`, opacity: 0,
  }, roomGroup);

  // Painel de resumo (HUD) embaixo — só atualiza na etapa 11 (interface)
  const hudBox = el('rect', {
    x: 232, y: 382, width: 290, height: 72, rx: 8,
    fill: panel, stroke: faint, 'stroke-width': 1.5,
  }, svg);
  const hudRecv = el('text', {
    x: 248, y: 406, text: 'HUD · receptor: inativo', fill: dim, 'font-size': 16,
    'font-family': 'var(--text)', 'dominant-baseline': 'middle',
  }, svg);
  const hudDoor = el('text', {
    x: 248, y: 434, text: 'HUD · porta: travada · 0 %', fill: dim, 'font-size': 16,
    'font-family': 'var(--text)', 'dominant-baseline': 'middle',
  }, svg);

  function frame(elapsed) {
    const t = elapsed % PERIOD;
    const fade = Math.min(clamp01(t / 0.25), clamp01((PERIOD - t) / 0.35));
    svg.setAttribute('opacity', fade.toFixed(2));

    const clock = (t - LEAD) / STEP_DUR;
    const activeIdx = t < LEAD ? -1 : Math.min(12, Math.floor(clock));
    const localU = activeIdx < 0 ? 0 : (t >= HOLD_AT ? 1 : clamp01(clock - activeIdx));

    // Atualiza lista de 13 etapas
    stepViews.forEach(({ step, pill, dot, txt }, i) => {
      const done = i < activeIdx || (t >= HOLD_AT && i === 12);
      const active = i === activeIdx && t < HOLD_AT;
      const accent = step.group === 'rt' ? blue : beamColor;
      const hiColor = (step.id === 'receivers' || step.id === 'conduits' || step.id === 'doors') ? green : accent;
      pill.setAttribute('fill-opacity', active ? '0.16' : '0');
      setAttrs(dot, {
        r: active ? 6.5 : 5,
        fill: (active || done) ? hiColor : panel,
        stroke: (active || done) ? hiColor : faint,
      });
      txt.setAttribute('fill', active ? paper : (done ? hiColor : dim));
      txt.setAttribute('font-weight', active ? '600' : '400');
    });

    stageReadout.textContent = activeIdx < 0 ? 'aguardando quadro…' : STEPS[activeIdx].msg;

    // 1. Movimento (etapa 1)
    const moveK = activeIdx > 1 ? 1 : (activeIdx === 1 ? ease.smooth(localU) : 0);
    const px = PLAYER_0.x + (PLAYER_1.x - PLAYER_0.x) * moveK;
    const pz = PLAYER_0.z + (PLAYER_1.z - PLAYER_0.z) * moveK;
    setAttrs(playerBox, { x: px - 10, y: pz - 10 });
    playerFront.set(px, pz, px + 18, pz - 15);

    // 2. Mira (etapa 2+)
    const aimOn = activeIdx >= 2;
    aimLine.setAttribute('opacity', aimOn ? (activeIdx === 2 ? '0.9' : '0.35') : '0');
    mirrorPlate.setAttribute('stroke', activeIdx === 2 || activeIdx === 6 ? yellow : paper);

    // 3. Feixes (etapa 3+, traçado real com reflect())
    const beamK = activeIdx > 3 ? 1 : (activeIdx === 3 ? ease.out(localU) : 0);
    const len1 = MIRROR.x - (EMITTER.x + 10);
    const len2 = RECEIVER.z - 10 - MIRROR.z;
    const totalLen = len1 + len2;
    const drawn = beamK * totalLen;
    if (drawn > 1) {
      const d1 = Math.min(len1, drawn);
      seg1.set(EMITTER.x + 10, EMITTER.z, EMITTER.x + 10 + d1, EMITTER.z);
      seg1.group.setAttribute('opacity', '1');
      if (drawn > len1 + 1) {
        const d2 = drawn - len1;
        seg2.set(MIRROR.x, MIRROR.z, MIRROR.x + reflDir.x * d2, MIRROR.z + reflDir.z * d2);
        seg2.group.setAttribute('opacity', '1');
      } else {
        seg2.group.setAttribute('opacity', '0');
      }
    } else {
      seg1.group.setAttribute('opacity', '0');
      seg2.group.setAttribute('opacity', '0');
    }

    // 4. Receptores (etapa 4+)
    const recvOn = activeIdx >= 4;
    hitDot.setAttribute('opacity', beamK >= 0.98 ? '1' : '0');
    setAttrs(recvBody, {
      fill: recvOn ? green : panel,
      'fill-opacity': recvOn ? 0.25 : 1,
      stroke: recvOn ? green : dim,
    });

    // 5. Portais (etapa 5 pulsa)
    portalPad.setAttribute('fill-opacity', activeIdx === 5 ? '0.65' : '0.25');

    // 6. Dispositivos (etapa 6 pulsa emissor)
    emitterBox.setAttribute('fill-opacity', activeIdx === 6 ? '0.55' : '0.22');

    // 7. Bloqueadores (etapa 7 pulsa borda)
    blockerBox.setAttribute('stroke', activeIdx === 7 ? beamColor : dim);

    // 8. Condutos (etapa 8+)
    const condOp = activeIdx > 8 ? 1 : (activeIdx === 8 ? ease.smooth(localU) : 0);
    conduitLit.setAttribute('opacity', condOp.toFixed(2));

    // 9. Portas (etapa 9+: destrava isOpen()=true e entra em 'releasing': travas soltam, painel ainda em 0 %)
    const doorRelease = activeIdx > 9 ? 1 : (activeIdx === 9 ? ease.smooth(localU) : 0);
    const clampShift = doorRelease * 5;
    setAttrs(clampL, {
      x: 350 - clampShift,
      fill: doorRelease > 0.1 ? yellow : dim,
    });
    setAttrs(clampR, {
      x: 425 + clampShift,
      fill: doorRelease > 0.1 ? yellow : dim,
    });
    setAttrs(doorPanel, {
      fill: activeIdx >= 10 ? green : (doorRelease > 0.1 ? yellow : paper),
    });

    // 10. Saída / portal (etapa 10: porta destravada logicamente, mas openness = 0 %)
    if (activeIdx === 10) {
      portalPad.setAttribute('stroke', beamColor);
    } else {
      portalPad.setAttribute('stroke', blue);
    }

    // 11. Interface (hud.update() em src/main.js: só aqui o HUD muda!)
    const hudUpdated = activeIdx >= 11;
    hudBox.setAttribute('stroke', activeIdx === 11 ? beamColor : faint);
    setAttrs(hudRecv, {
      text: hudUpdated ? 'HUD · receptor: ATIVO' : 'HUD · receptor: inativo',
      fill: hudUpdated ? green : dim,
    });
    setAttrs(hudDoor, {
      text: hudUpdated ? 'HUD · porta: destravada · 0 %' : 'HUD · porta: travada · 0 %',
      fill: hudUpdated ? green : dim,
    });
    roomBox.setAttribute('stroke', activeIdx === 12 ? beamColor : dim);
  }

  return loop(frame);
}
