// Pipeline real de CI (.github/workflows/ci.yml):
//   push -> npm run lint -> npm test (23 arquivos reais em tests/unit/) ->
//   npm run e2e (tests/e2e/playthrough.mjs: câmaras 01..10 + final) -> verde.
import { el, setAttrs, makeSvg, beam, loop, token, arrow, clamp01, ease } from './_kit.js';

const W = 623;
const H = 468;
const PERIOD = 11.2;

// Lista real de arquivos em tests/unit/
const UNIT_FILES = [
  'aabb.test.js',
  'analyze-cli.test.js',
  'colors.test.js',
  'conduits.test.js',
  'door-logic.test.js',
  'door-motion.test.js',
  'exit-trigger.test.js',
  'laser.test.js',
  'level-manager.test.js',
  'levels.test.js',
  'matrix.test.js',
  'mirror-reflection.test.js',
  'modules.test.js',
  'motion.test.js',
  'mouse.test.js',
  'movement.test.js',
  'phong-material.test.js',
  'portal-crossing.test.js',
  'quality.test.js',
  'rotation.test.js',
  'sfx.test.js',
  'three-version.test.js',
  'wall.test.js',
];

const STAGES = [
  { id: 'lint', title: '1 · lint', sub: 'eslint .', x: 12, w: 116 },
  { id: 'unit', title: '2 · unitários', sub: 'npm test', x: 154, w: 142 },
  { id: 'e2e', title: '3 · e2e', sub: 'Chromium', x: 322, w: 148 },
  { id: 'green', title: 'verde', sub: 'aprovado', x: 496, w: 115 },
];

const STAGE_Y = 74;
const STAGE_H = 88;
const STAGE_CY = STAGE_Y + STAGE_H / 2;

export default function mount(host) {
  const P = 'ci-pipeline';
  const svg = makeSvg(host, W, H, P);
  const paper = token('paper') || '#d9d4c7';
  const dim = token('paper-dim') || '#8d897e';
  const faint = token('paper-faint') || '#5a5851';
  const beamColor = token('beam') || '#fff1d6';
  const green = token('c-green') || '#2ee66b';
  const blue = token('c-blue') || '#3b9eff';
  const yellow = token('c-yellow') || '#ffe047';
  const panel = token('panel') || '#0c1012';

  // ---- Barra superior: commit e status do workflow ----
  const commitBadge = el('rect', {
    x: 12, y: 14, width: 158, height: 34, rx: 8,
    fill: panel, stroke: beamColor, 'stroke-opacity': 0.5, 'stroke-width': 1.5,
  }, svg);
  el('text', {
    x: 91, y: 31, text: 'push · main', fill: beamColor, 'font-size': 16,
    'text-anchor': 'middle', 'dominant-baseline': 'middle',
  }, svg);

  const statusBadge = el('rect', {
    x: 416, y: 14, width: 195, height: 34, rx: 8,
    fill: panel, stroke: faint, 'stroke-width': 1.5,
  }, svg);
  const statusText = el('text', {
    x: 513, y: 31, text: 'ci.yml · rodando', fill: dim, 'font-size': 16,
    'text-anchor': 'middle', 'dominant-baseline': 'middle',
  }, svg);

  // ---- Etapas do workflow ----
  const stageViews = STAGES.map((st) => {
    const g = el('g', {}, svg);
    const glow = el('rect', {
      x: st.x - 2, y: STAGE_Y - 2, width: st.w + 4, height: STAGE_H + 4, rx: 14,
      fill: 'none', stroke: green, 'stroke-width': 3, opacity: 0,
    }, g);
    const box = el('rect', {
      x: st.x, y: STAGE_Y, width: st.w, height: STAGE_H, rx: 12,
      fill: panel, stroke: faint, 'stroke-width': 2,
    }, g);
    const bar = el('line', {
      x1: st.x + 14, y1: STAGE_Y + 1.5, x2: st.x + st.w - 14, y2: STAGE_Y + 1.5,
      stroke: faint, 'stroke-width': 3, 'stroke-linecap': 'round',
    }, g);
    const cx = st.x + st.w / 2;
    const title = el('text', {
      x: cx, y: STAGE_CY - 13, text: st.title, fill: paper, 'font-size': 20,
      'font-family': 'var(--display)', 'font-weight': 600,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
    }, g);
    const sub = el('text', {
      x: cx, y: STAGE_CY + 16, text: st.sub, fill: dim, 'font-size': 16,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
    }, g);
    return { glow, box, bar, title, sub };
  });

  // Setas e pulsos entre as etapas
  const links = [0, 1, 2].map((i) => {
    const x1 = STAGES[i].x + STAGES[i].w + 4;
    const x2 = STAGES[i + 1].x - 4;
    const a = arrow(svg, dim, { width: 3, head: 10 });
    a.set(x1, STAGE_CY, x2, STAGE_CY);
    const pulse = beam(svg, beamColor, P, { width: 4, halo: 14, opacity: 0 });
    return { x1, x2, y: STAGE_CY, pulse };
  });

  // ---- Painel esquerdo: testes unitários reais ----
  el('rect', {
    x: 12, y: 186, width: 294, height: 266, rx: 10,
    fill: panel, stroke: faint, 'stroke-width': 1.5,
  }, svg);
  el('text', {
    x: 28, y: 211, text: 'tests/unit/', fill: paper, 'font-size': 17,
    'font-family': 'var(--display)', 'font-weight': 600, 'dominant-baseline': 'middle',
  }, svg);
  el('line', { x1: 24, y1: 230, x2: 294, y2: 230, stroke: faint, 'stroke-width': 1.2 }, svg);

  const unitRows = Array.from({ length: 6 }, (_, r) => {
    const y = 258 + r * 32;
    const tag = el('text', {
      x: 28, y, text: '·', fill: faint, 'font-size': 16, 'dominant-baseline': 'middle',
    }, svg);
    const name = el('text', {
      x: 62, y, text: UNIT_FILES[r], fill: dim, 'font-size': 16, 'dominant-baseline': 'middle',
    }, svg);
    return { tag, name };
  });

  // ---- Painel direito: e2e playthrough.mjs (10 câmaras) ----
  el('rect', {
    x: 320, y: 186, width: 291, height: 266, rx: 10,
    fill: panel, stroke: faint, 'stroke-width': 1.5,
  }, svg);
  el('text', {
    x: 336, y: 211, text: 'playthrough.mjs', fill: paper, 'font-size': 17,
    'font-family': 'var(--display)', 'font-weight': 600, 'dominant-baseline': 'middle',
  }, svg);
  el('line', { x1: 332, y1: 230, x2: 599, y2: 230, stroke: faint, 'stroke-width': 1.2 }, svg);

  const e2ePrep = el('text', {
    x: 336, y: 258, text: 'menu · mira · portas', fill: dim, 'font-size': 16, 'dominant-baseline': 'middle',
  }, svg);

  const chamberNodes = Array.from({ length: 10 }, (_, idx) => {
    const col = idx % 5;
    const row = Math.floor(idx / 5);
    const x = 336 + col * 52;
    const y = 288 + row * 50;
    const box = el('rect', {
      x, y, width: 46, height: 40, rx: 7,
      fill: '#07090a', stroke: faint, 'stroke-width': 1.5,
    }, svg);
    const lbl = el('text', {
      x: x + 23, y: y + 20, text: String(idx + 1).padStart(2, '0'), fill: dim, 'font-size': 16,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
    }, svg);
    return { box, lbl };
  });

  const e2eStatus = el('text', {
    x: 336, y: 418, text: 'aguardando e2e…', fill: dim, 'font-size': 16, 'dominant-baseline': 'middle',
  }, svg);

  function setStageState(idx, state) {
    const s = stageViews[idx];
    const isGreen = idx === 3;
    const color = state === 'pass' ? green : (state === 'run' ? (isGreen ? green : yellow) : faint);
    s.box.setAttribute('stroke', color);
    s.bar.setAttribute('stroke', color);
    s.glow.setAttribute('stroke', color);
    s.glow.setAttribute('opacity', state === 'run' ? '0.65' : (state === 'pass' && isGreen ? '0.8' : '0'));
    s.title.setAttribute('fill', state === 'wait' ? dim : paper);
    s.sub.setAttribute('fill', state === 'pass' ? green : (state === 'run' ? yellow : dim));
  }

  function drawPulse(link, u) {
    if (u <= 0 || u >= 1) {
      link.pulse.group.setAttribute('opacity', '0');
      return;
    }
    const k = ease.inOut(u);
    const tail = clamp01(k - 0.35);
    link.pulse.set(
      link.x1 + (link.x2 - link.x1) * tail, link.y,
      link.x1 + (link.x2 - link.x1) * k, link.y,
    );
    link.pulse.group.setAttribute('opacity', Math.sin(u * Math.PI).toFixed(2));
  }

  function frame(elapsed) {
    const t = elapsed % PERIOD;
    const fade = Math.min(clamp01(t / 0.25), clamp01((PERIOD - t) / 0.35));
    svg.setAttribute('opacity', fade.toFixed(2));

    // Cronograma real do pipeline (em segundos dentro de PERIOD = 11.2 s)
    // 0.3..1.3: lint | 1.3..1.8: seta 0 | 1.8..4.6: unitários | 4.6..5.1: seta 1
    // 5.1..8.6: e2e  | 8.6..9.1: seta 2 | 9.1..11.2: verde
    const lintDone = t >= 1.3;
    const lintRun = t >= 0.3 && t < 1.3;
    const unitDone = t >= 4.6;
    const unitRun = t >= 1.8 && t < 4.6;
    const e2eDone = t >= 8.6;
    const e2eRun = t >= 5.1 && t < 8.6;
    const allGreen = t >= 9.1;

    setStageState(0, lintDone ? 'pass' : (lintRun ? 'run' : 'wait'));
    setStageState(1, unitDone ? 'pass' : (unitRun ? 'run' : 'wait'));
    setStageState(2, e2eDone ? 'pass' : (e2eRun ? 'run' : 'wait'));
    setStageState(3, allGreen ? 'pass' : 'wait');

    commitBadge.setAttribute('stroke-opacity', t < 1.3 ? '0.9' : '0.35');
    setAttrs(statusBadge, { stroke: allGreen ? green : faint });
    setAttrs(statusText, {
      text: allGreen ? 'ci.yml · verde' : 'ci.yml · rodando',
      fill: allGreen ? green : (t >= 0.3 ? yellow : dim),
    });

    drawPulse(links[0], (t - 1.3) / 0.5);
    drawPulse(links[1], (t - 4.6) / 0.5);
    drawPulse(links[2], (t - 8.6) / 0.5);

    // Janela deslizante dos arquivos reais de tests/unit/
    const unitU = unitDone ? 1 : (unitRun ? clamp01((t - 1.8) / 2.8) : 0);
    const doneFiles = Math.floor(unitU * UNIT_FILES.length);
    const offset = Math.max(0, Math.min(UNIT_FILES.length - 6, doneFiles - 4));
    unitRows.forEach((row, r) => {
      const fileIdx = offset + r;
      const file = UNIT_FILES[fileIdx];
      const passed = unitDone || (unitRun && fileIdx < doneFiles);
      const running = unitRun && fileIdx === doneFiles;
      setAttrs(row.tag, {
        text: passed ? 'ok' : (running ? '›' : '·'),
        fill: passed ? green : (running ? yellow : faint),
      });
      setAttrs(row.name, {
        text: file,
        fill: passed ? paper : (running ? yellow : dim),
      });
    });

    // Progresso real do playthrough.mjs (preparação + câmaras 01..10)
    const e2eU = e2eDone ? 1 : (e2eRun ? clamp01((t - 5.1) / 3.5) : 0);
    const prepDone = e2eDone || (e2eRun && e2eU >= 0.12);
    setAttrs(e2ePrep, {
      text: prepDone ? 'ok · menu · mira · portas' : 'menu · mira · portas',
      fill: prepDone ? green : (e2eRun ? yellow : dim),
    });

    const levelProgress = clamp01((e2eU - 0.12) / 0.80);
    const passedLevels = e2eDone ? 10 : Math.floor(levelProgress * 10);
    chamberNodes.forEach(({ box, lbl }, idx) => {
      const passed = idx < passedLevels;
      const active = e2eRun && e2eU >= 0.12 && idx === passedLevels && passedLevels < 10;
      setAttrs(box, {
        fill: passed ? green : (active ? yellow : '#07090a'),
        'fill-opacity': passed ? 0.18 : (active ? 0.18 : 1),
        stroke: passed ? green : (active ? yellow : faint),
      });
      lbl.setAttribute('fill', passed ? green : (active ? yellow : dim));
    });

    if (!e2eRun && !e2eDone) {
      setAttrs(e2eStatus, { text: 'aguardando e2e…', fill: dim });
    } else if (e2eRun && e2eU < 0.12) {
      setAttrs(e2eStatus, { text: 'checando menu e oclusão…', fill: yellow });
    } else if (e2eRun && passedLevels < 10) {
      const ch = String(passedLevels + 1).padStart(2, '0');
      setAttrs(e2eStatus, { text: `câmara ${ch}: solução → saída`, fill: yellow });
    } else {
      setAttrs(e2eStatus, { text: 'final e replay · sem erros', fill: green });
    }
    void blue;
  }

  return loop(frame);
}
