import { reducedMotion } from '../presentation/motion.js';

// Start / pause menu and the ending (docs/presentation.md): a full-bleed
// operator panel over the live, dimmed facility — no card, no buttons in
// boxes. A list of items with a laser-line cursor, driven by mouse or
// keyboard (↑ ↓ / W S, Enter). Text names actions and controls only.

const CONTROLS = [
  ['W A S D', 'andar'],
  ['Mouse', 'olhar'],
  ['Clique', 'pegar · soltar · apertar'],
  ['Mouse ←→', 'deslizar ou girar o que segura'],
  ['Roda · Q / E', 'girar em passos'],
  ['R', 'reiniciar câmara'],
  ['+ / −', 'campo de visão'],
  ['M', 'som'],
  ['L', 'sombreamento: vértice / fragmento'],
  ['Esc', 'pausar'],
];

// Laser-drawn logotype: FEIXE out of straight strokes, like optical paths.
const LOGO = `<svg class="logo" viewBox="-6 -6 248 76" aria-label="Feixe">
  <path d="M4 64 V4 H40 M4 32 H30"/>
  <path d="M90 4 H54 V64 H90 M54 34 H82"/>
  <path d="M104 4 H128 M116 4 V64 M104 64 H128"/>
  <path d="M142 4 L178 64 M178 4 L142 64"/>
  <path d="M228 4 H192 V64 H228 M192 34 H220"/>
  <path class="beam" d="M-400 34 H4 M228 4 L236 -4"/>
</svg>`;

function el(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  parent?.appendChild(node);
  return node;
}

export function createMenu(root, handlers) {
  const menu = el('div', 'menu', root);
  const main = el('div', 'menu-main', menu);
  el('div', 'menu-kicker', main, 'PAINEL DE OPERAÇÃO');
  main.insertAdjacentHTML('beforeend', LOGO);
  const sub = el('div', 'menu-sub', main);
  const list = el('div', 'menu-items', main);
  const foot = el('div', 'menu-foot', main);
  el('span', null, foot, 'UTFPR · COMPUTAÇÃO GRÁFICA');
  const hint = el('span', 'menu-hint', foot);

  const side = el('div', 'menu-side', menu);
  const controls = el('dl', 'controls', side);
  el('div', 'controls-title', controls, 'COMANDOS');
  for (const [key, action] of CONTROLS) {
    el('dt', null, controls).append(Object.assign(document.createElement('kbd'), { textContent: key }));
    el('dd', null, controls, action);
  }

  const ending = el('div', 'ending', root);

  let mode = null; // 'start' | 'paused' | null
  let items = [];
  let selected = 0;
  let confirming = false;
  let pick = 0; // level chosen in "Selecionar câmara" (0-based)

  // Only levels already reached on this machine; ← → cycle, Enter loads.
  function levelSelectDef(s) {
    const count = s.reachedIndex + 1;
    return {
      label: 'Câmara',
      meta: `◂ ${String(pick + 1).padStart(2, '0')} · ${s.levelName(pick)} ▸`,
      run: () => handlers.onSelectLevel(pick),
      adjust: (direction) => { pick = (pick + direction + count) % count; },
    };
  }

  function render() {
    const s = handlers.getState();
    sub.textContent = mode === 'paused' ? `PAUSADO · ${s.levelLabel}` : 'UM QUEBRA-CABEÇA DE LUZ, REFLEXO E COR';
    const defs = [];
    if (mode === 'start') {
      defs.push({ label: s.hasProgress ? 'Continuar' : 'Iniciar', meta: s.levelLabel, run: handlers.onResume });
      if (s.reachedIndex >= 1) defs.push(levelSelectDef(s));
      if (s.hasProgress) defs.push({ label: 'Novo jogo', meta: 'do nível 01', run: handlers.onNewGame, confirm: true });
    } else {
      defs.push({ label: 'Continuar', meta: '', run: handlers.onResume });
      if (s.reachedIndex >= 1) defs.push(levelSelectDef(s));
      defs.push({ label: 'Reiniciar câmara', meta: 'R', run: handlers.onRestart });
      defs.push({ label: 'Novo jogo', meta: 'do nível 01', run: handlers.onNewGame, confirm: true });
    }
    defs.push({ label: 'Qualidade', meta: s.quality === 'high' ? 'alta' : 'baixa', run: handlers.onToggleQuality, stay: true });
    defs.push({
      label: 'Sensibilidade',
      meta: `◂ ${s.sensitivity.toFixed(2).replace(/0$/, '')}× ▸`,
      run: () => handlers.onAdjustSensitivity(1),
      adjust: handlers.onAdjustSensitivity,
      stay: true,
    });
    defs.push({ label: 'Reflexos', meta: s.reflectionsOn ? 'ligados' : 'desligados', run: handlers.onToggleReflections, stay: true });
    defs.push({ label: 'Som', meta: s.muted ? 'desligado' : 'ligado', run: handlers.onToggleSound, stay: true });

    list.replaceChildren();
    items = defs.map((def, i) => {
      const button = el('button', 'mi', list);
      el('span', 'mi-idx', button, String(i + 1).padStart(2, '0'));
      const label = el('span', 'mi-label', button, def.label);
      const meta = el('span', 'mi-meta', button, def.meta);
      button.addEventListener('mouseenter', () => select(i));
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        activate(i);
      });
      return { def, button, label, meta };
    });
    selected = Math.min(selected, items.length - 1);
    select(selected);
  }

  function select(i) {
    if (confirming && i !== selected) cancelConfirm();
    selected = (i + items.length) % items.length;
    items.forEach((item, j) => item.button.classList.toggle('sel', j === selected));
  }

  function cancelConfirm() {
    confirming = false;
    render();
  }

  function activate(i) {
    const item = items[i];
    if (!item) return;
    if (item.def.confirm && handlers.getState().hasProgress && !confirming) {
      confirming = true;
      item.button.classList.add('confirm');
      item.label.textContent = 'Apagar progresso?';
      item.meta.textContent = 'enter: sim · esc: não';
      return;
    }
    confirming = false;
    item.def.run();
    if (item.def.stay) render();
  }

  window.addEventListener('keydown', (event) => {
    if (ending.classList.contains('visible')) {
      if (event.code === 'Enter' || event.code === 'Space') endingReplay?.();
      return;
    }
    if (!mode) return;
    if (event.code === 'ArrowDown' || event.code === 'KeyS') select(selected + 1);
    else if (event.code === 'ArrowUp' || event.code === 'KeyW') select(selected - 1);
    else if (event.code === 'Enter' || event.code === 'Space') activate(selected);
    else if ((event.code === 'ArrowLeft' || event.code === 'KeyA' || event.code === 'ArrowRight' || event.code === 'KeyD') && items[selected]?.def.adjust) {
      items[selected].def.adjust(event.code === 'ArrowLeft' || event.code === 'KeyA' ? -1 : 1);
      render();
    }
    else if (event.code === 'Escape' && confirming) cancelConfirm();
    else return;
    event.preventDefault();
  });

  let endingReplay = null;

  return {
    show(nextMode) {
      mode = nextMode;
      confirming = false;
      hint.textContent = '';
      selected = 0;
      pick = Math.min(handlers.getState().currentIndex, handlers.getState().reachedIndex);
      render();
      menu.classList.add('visible');
    },
    hide() {
      mode = null;
      menu.classList.remove('visible');
    },
    isVisible: () => mode !== null,
    setHint(text) {
      hint.textContent = text;
    },

    // The ending: machine-log lines typing in, then a slow "alive" line,
    // then the way back. Faintly ominous, no lore committed.
    showEnding(stats, onReplay) {
      mode = null;
      menu.classList.remove('visible');
      ending.replaceChildren();
      const minutes = Math.floor(stats.seconds / 60);
      const seconds = Math.floor(stats.seconds % 60);
      const lines = [
        { text: 'SEQUÊNCIA COMPLETA', cls: 'big' },
        { text: `CÂMARAS ATIVADAS   ${String(stats.levels).padStart(2, '0')} / ${String(stats.levels).padStart(2, '0')}` },
        { text: `TEMPO DE OPERAÇÃO  ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` },
        { text: `REINÍCIOS          ${String(stats.restarts).padStart(2, '0')}` },
        { text: 'SISTEMA ÓPTICO: ATIVO', cls: 'alive', pause: 1.2 },
      ];
      const nodes = lines.map((line) => el('div', `ending-line ${line.cls ?? ''}`, ending));
      const replay = el('button', 'mi', ending);
      el('span', 'mi-idx', replay, '01');
      el('span', 'mi-label', replay, 'Jogar de novo');
      el('span', 'mi-meta', replay, 'enter');
      replay.classList.add('sel');
      endingReplay = () => {
        endingReplay = null;
        ending.classList.remove('visible');
        onReplay();
      };
      replay.addEventListener('click', (event) => {
        event.stopPropagation();
        endingReplay?.();
      });
      ending.classList.add('visible');

      // Type the lines in one after another.
      let delay = reducedMotion ? 0 : 900;
      lines.forEach((line, i) => {
        delay += (line.pause ?? 0.25) * 1000;
        const start = delay;
        setTimeout(() => {
          if (reducedMotion) {
            nodes[i].textContent = line.text;
            return;
          }
          let shown = 0;
          const tick = setInterval(() => {
            shown++;
            nodes[i].textContent = line.text.slice(0, shown);
            if (shown >= line.text.length) clearInterval(tick);
          }, 28);
        }, start);
        delay += reducedMotion ? 0 : line.text.length * 28;
      });
      setTimeout(() => replay.classList.add('shown'), delay + 600);
    },
    isEndingVisible: () => ending.classList.contains('visible'),
  };
}
