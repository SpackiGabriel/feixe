import * as THREE from 'three';

// In-game HUD: crosshair, brackets around the aimed object, key-glyph
// prompts, level tag, toasts and the ?debug readout. Text names controls
// only — never puzzle logic (spec §12). Touches the DOM only on change.

function el(tag, className, parent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  parent?.appendChild(node);
  return node;
}

const _box = new THREE.Box3();
const _corner = new THREE.Vector3();

// Pure: turns "Clique: girar · Q/E: passo" into [{ key, action }] pairs.
export function parsePrompt(text) {
  if (!text) return [];
  return text.split('·').map((part) => {
    const [key, ...rest] = part.split(':');
    return { key: key.trim(), action: rest.join(':').trim() };
  });
}

// Pure: the hint shown while holding an object.
export function manipulationHint(controller) {
  if (!controller) return null;
  if (controller.positionEnabled && controller.rotationEnabled) return 'Mouse: deslizar · Roda ou Q/E: girar · Clique: soltar';
  if (controller.positionEnabled) return 'Mouse: deslizar · Clique: soltar';
  if (controller.rotationEnabled) return 'Mouse: girar · Q/E: passo · Clique: soltar';
  return null;
}

export function createHud(root) {
  const hud = el('div', 'hud', root);

  const xh = el('div', 'xh', hud);
  el('div', 'xh-dot', xh);
  for (const dir of ['n', 's', 'e', 'w']) el('div', `xh-tick ${dir}`, xh);
  el('div', 'xh-arc', xh);
  el('div', 'xh-slide', xh);

  const brackets = el('div', 'brackets', hud);
  for (let i = 0; i < 4; i++) el('i', null, brackets);

  const prompt = el('div', 'prompt', hud);
  const tag = el('div', 'tag', hud);
  const toast = el('div', 'toast', hud);
  const debug = el('pre', 'debug', hud);
  debug.hidden = true;

  let currentPrompt = null;
  let crosshairClass = '';
  let toastTimer = 0;
  let bracketsShown = false;

  function setPrompt(text) {
    if (text === currentPrompt) return;
    currentPrompt = text;
    prompt.replaceChildren();
    for (const { key, action } of parsePrompt(text)) {
      const pair = el('span', null, prompt);
      el('kbd', null, pair).textContent = key;
      pair.append(action);
    }
    prompt.classList.toggle('visible', Boolean(text));
  }

  function setCrosshair(hovered, active) {
    let next = '';
    if (active) next = `grab ${active.positionEnabled ? 'slide' : 'rotate'}`;
    else if (hovered) next = 'hover';
    if (next === crosshairClass) return;
    crosshairClass = next;
    xh.className = `xh ${next}`;
  }

  function hideBrackets() {
    if (bracketsShown) brackets.classList.remove('visible');
    bracketsShown = false;
  }

  // Projects the aimed object's bounding box to the screen and frames it.
  function placeBrackets(object, camera, grabbing) {
    if (!object) {
      hideBrackets();
      return;
    }
    _box.setFromObject(object);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      _corner.set(i & 1 ? _box.max.x : _box.min.x, i & 2 ? _box.max.y : _box.min.y, i & 4 ? _box.max.z : _box.min.z).project(camera);
      if (_corner.z > 1) continue; // behind the camera
      minX = Math.min(minX, _corner.x);
      maxX = Math.max(maxX, _corner.x);
      minY = Math.min(minY, _corner.y);
      maxY = Math.max(maxY, _corner.y);
    }
    if (minX === Infinity) {
      hideBrackets(); // held object entirely behind the player (walked past it)
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pad = 10;
    const left = ((minX + 1) / 2) * w - pad;
    const top = ((1 - maxY) / 2) * h - pad;
    const width = ((maxX - minX) / 2) * w + pad * 2;
    const height = ((maxY - minY) / 2) * h + pad * 2;
    brackets.style.transform = `translate(${left}px, ${top}px)`;
    brackets.style.width = `${width}px`;
    brackets.style.height = `${height}px`;
    brackets.classList.toggle('grab', grabbing);
    if (!bracketsShown) brackets.classList.add('visible');
    bracketsShown = true;
  }

  return {
    // Per frame: what's aimed at and what's held.
    update(deltaSeconds, { hovered, active, activeObject, camera, prompt: promptText }) {
      setCrosshair(hovered, active);
      placeBrackets(activeObject ?? hovered, camera, Boolean(active));
      setPrompt(promptText);
      if (toastTimer > 0) {
        toastTimer -= deltaSeconds;
        if (toastTimer <= 0) toast.classList.remove('visible');
      }
    },
    setLevel(index, count, name) {
      tag.replaceChildren();
      el('b', null, tag).textContent = `${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
      tag.append(name ?? '');
      tag.classList.add('visible');
    },
    showToast(text) {
      toast.textContent = text;
      toast.classList.add('visible');
      toastTimer = 1.6;
    },
    setVisible(value) {
      hud.classList.toggle('hidden', !value);
    },
    setDebugText(text) {
      debug.hidden = text == null;
      if (text != null && debug.textContent !== text) debug.textContent = text;
    },
  };
}
