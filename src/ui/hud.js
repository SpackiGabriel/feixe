// DOM overlay for everything that isn't the 3D scene: start/pause menu,
// level title card, aim prompt under the crosshair, end-of-game screen and
// the ?debug readout. Text is Portuguese and only names controls — never
// puzzle logic (spec §12: no symbols/formulas exposing the rules).
// Only touches the DOM when a value changes, since it's driven per frame.

const CONTROLS = [
  ['W A S D', 'mover'],
  ['Mouse', 'olhar'],
  ['Clique', 'pegar / soltar / ativar'],
  ['Mouse ←→', 'deslizar ou girar o objeto'],
  ['Roda ou Q / E', 'girar (objetos que também deslizam)'],
  ['R', 'reiniciar o nível'],
  ['+ / −', 'campo de visão'],
  ['Esc', 'pausar'],
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createHud({ onPlay, onNewGame }) {
  const root = el('div', 'hud');
  document.body.appendChild(root);

  const prompt = el('div', 'hud-prompt');
  const toast = el('div', 'hud-toast');
  const title = el('div', 'hud-title');
  const titleNumber = el('div', 'hud-title-number');
  const titleName = el('div', 'hud-title-name');
  title.append(titleNumber, titleName);
  const levelTag = el('div', 'hud-level');
  const fade = el('div', 'hud-fade');
  const debug = el('pre', 'hud-debug');
  debug.hidden = true;

  const menu = el('div', 'hud-menu');
  const menuCard = el('div', 'hud-menu-card');
  const menuHeading = el('h1', null, 'Feixe');
  const menuSub = el('p', 'hud-menu-sub');
  const playButton = el('button', 'hud-button hud-button-primary');
  const newGameButton = el('button', 'hud-button', 'Novo jogo');
  const controls = el('dl', 'hud-controls');
  for (const [key, action] of CONTROLS) controls.append(el('dt', null, key), el('dd', null, action));
  menuCard.append(menuHeading, menuSub, playButton, newGameButton, controls);
  menu.append(menuCard);

  root.append(fade, prompt, toast, title, levelTag, debug, menu);

  let mode = 'start'; // 'start' | 'paused' | 'playing' | 'complete'
  let levelLabel = '';
  let currentPrompt = null;
  let titleTimer = 0;
  let toastTimer = 0;

  playButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (mode === 'complete') onNewGame();
    else onPlay();
  });
  newGameButton.addEventListener('click', (event) => {
    event.stopPropagation();
    onNewGame();
  });

  function render() {
    menu.hidden = mode === 'playing';
    newGameButton.hidden = mode === 'complete';
    controls.hidden = mode === 'complete';
    if (mode === 'start') {
      menuSub.textContent = 'Um quebra-cabeça de luz, reflexo e cor.';
      playButton.textContent = levelLabel ? `Jogar — ${levelLabel}` : 'Jogar';
    } else if (mode === 'paused') {
      menuSub.textContent = `Pausado — ${levelLabel}`;
      playButton.textContent = 'Continuar';
    } else if (mode === 'complete') {
      menuHeading.textContent = 'Fim';
      menuSub.textContent = 'Você abriu a última porta. Obrigado por jogar!';
      playButton.textContent = 'Jogar de novo';
    }
    if (mode !== 'complete') menuHeading.textContent = 'Feixe';
    root.classList.toggle('hud-playing', mode === 'playing');
  }
  render();

  return {
    // Pointer locked → playing; unlocked → paused (or still the start menu).
    setPlaying(isPlaying) {
      if (mode === 'complete') return;
      if (isPlaying) mode = 'playing';
      else if (mode === 'playing') mode = 'paused';
      render();
    },
    showComplete() {
      mode = 'complete';
      render();
    },
    resetToStart() {
      mode = 'start';
      render();
    },
    showLevel(index, count, name) {
      levelLabel = `Nível ${index + 1}`;
      titleNumber.textContent = `Nível ${index + 1} de ${count}`;
      titleName.textContent = name ?? '';
      levelTag.textContent = `${index + 1} · ${name ?? ''}`;
      title.classList.add('visible');
      titleTimer = 2.5;
      fade.classList.remove('fading');
      void fade.offsetWidth; // restart the CSS transition
      fade.classList.add('fading');
      if (mode !== 'playing' && mode !== 'complete') render();
    },
    showToast(text) {
      toast.textContent = text;
      toast.classList.add('visible');
      toastTimer = 1.5;
    },
    setPrompt(text) {
      if (text === currentPrompt) return;
      currentPrompt = text;
      prompt.textContent = text ?? '';
      prompt.classList.toggle('visible', Boolean(text));
    },
    setDebugText(text) {
      debug.hidden = text == null;
      if (text != null && debug.textContent !== text) debug.textContent = text;
    },
    update(deltaSeconds) {
      if (titleTimer > 0) {
        titleTimer -= deltaSeconds;
        if (titleTimer <= 0) title.classList.remove('visible');
      }
      if (toastTimer > 0) {
        toastTimer -= deltaSeconds;
        if (toastTimer <= 0) toast.classList.remove('visible');
      }
    },
    getMode: () => mode,
  };
}

// Pure: the hint shown while aiming at / manipulating an object.
export function manipulationHint(controller) {
  if (!controller) return null;
  if (controller.positionEnabled && controller.rotationEnabled) return 'Mouse: deslizar · Roda ou Q/E: girar · Clique: soltar';
  if (controller.positionEnabled) return 'Mouse: deslizar · Clique: soltar';
  if (controller.rotationEnabled) return 'Mouse: girar · Q/E: passo · Clique: soltar';
  return null;
}
