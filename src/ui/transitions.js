import { TEMPO, reducedMotion } from '../presentation/motion.js';

const TYPE_INTERVAL = 0.045; // seconds per typed character
const INTRO_HOLD = 2.4; // seconds the level title stays up

function el(tag, className, parent) {
  const node = document.createElement(tag);
  node.className = className;
  parent.appendChild(node);
  return node;
}

// Screen transitions (docs/presentation.md): a mechanical shutter — two
// blades closing on a bright seam — between chambers, a quick blink on
// restart, a light flash through portals, a whiteout before the ending,
// and the level title typing itself in. Nothing here blocks input, and
// every call is safe to repeat or interrupt: a newer request cancels the
// pending callback of an older one.
export function createTransitions(root) {
  const wrap = el('div', 'transitions', root);
  const shutter = el('div', 'shutter', wrap);
  el('div', 'shutter-half top', shutter);
  el('div', 'shutter-half bottom', shutter);
  el('div', 'shutter-seam', shutter);
  const flash = el('div', 'flash', wrap);
  const whiteout = el('div', 'whiteout', wrap);
  const intro = el('div', 'intro', wrap);
  const introNum = el('div', 'intro-num', intro);
  const introName = el('div', 'intro-name', intro);
  el('div', 'intro-rule', intro);

  let token = 0;
  let typing = null; // { text, shown, timer }
  let introTimer = 0;

  const wait = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

  // Close the shutter, run `between` (the level swap) while it's shut,
  // then open it again.
  async function cut(between, closeSeconds = TEMPO.act, holdSeconds = 0.08) {
    const mine = ++token;
    whiteout.classList.remove('on');
    shutter.classList.add('closed');
    await wait(reducedMotion ? 0.05 : closeSeconds);
    if (mine !== token) return;
    between();
    await wait(holdSeconds);
    if (mine !== token) return;
    shutter.classList.remove('closed');
  }

  return {
    // Chamber change: close (Act tempo), swap, open.
    cut: (between) => cut(between),
    // Restart: a fast blink.
    blink: (between) => cut(between, 0.14, 0.04),
    // Portal crossing: a brief wash of light.
    flash() {
      flash.classList.add('on');
      requestAnimationFrame(() => requestAnimationFrame(() => flash.classList.remove('on')));
    },
    // Before the ending: fade the world to white, then run `after` unless
    // another transition (e.g. Novo jogo) cancelled it.
    async whiteout(seconds = 1, after = () => {}) {
      const mine = ++token;
      whiteout.classList.add('on');
      await wait(reducedMotion ? 0.2 : seconds);
      if (mine !== token) return;
      after();
    },
    clearWhiteout() {
      whiteout.classList.remove('on');
    },
    openNow() {
      token++;
      whiteout.classList.remove('on');
      shutter.classList.remove('closed');
    },
    // Level title: number, then the name typed in, then fade.
    showIntro(index, count, name) {
      introNum.textContent = `NÍVEL ${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
      introName.textContent = '';
      typing = { text: name ?? '', shown: 0, timer: 0.25 };
      if (reducedMotion) {
        introName.textContent = typing.text;
        typing = null;
      }
      intro.classList.add('visible');
      introTimer = INTRO_HOLD;
    },
    update(deltaSeconds) {
      if (typing) {
        typing.timer -= deltaSeconds;
        while (typing && typing.timer <= 0) {
          typing.shown++;
          introName.textContent = typing.text.slice(0, typing.shown);
          typing.timer += TYPE_INTERVAL;
          if (typing.shown >= typing.text.length) typing = null;
        }
      }
      if (introTimer > 0) {
        introTimer -= deltaSeconds;
        if (introTimer <= 0) intro.classList.remove('visible');
      }
    },
  };
}
