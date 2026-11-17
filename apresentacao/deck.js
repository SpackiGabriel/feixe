// Feixe — motor da apresentação: escala do palco, navegação, barra de
// progresso, ciclo de vida das cenas, realce de código e ajuste para caber.

const STAGE_W = 1280;
const STAGE_H = 720;
const CODE_MAX_PX = 20;
const CODE_MIN_PX = 12;

const stage = document.getElementById('stage');
const slides = [...stage.querySelectorAll('.slide')];
const progressBar = document.querySelector('#progress i');
let current = -1;

// ---------- Escala ----------
function fitStage() {
  const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  const x = (window.innerWidth - STAGE_W * scale) / 2;
  const y = (window.innerHeight - STAGE_H * scale) / 2;
  stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

// ---------- Cenas ----------
const scenes = new Map(); // host -> Promise<{start, stop}>

function sceneFor(host) {
  if (!scenes.has(host)) {
    const name = host.dataset.scene;
    scenes.set(
      host,
      import(`./scenes/${name}.js`)
        .then((mod) => mod.default(host))
        .catch((error) => {
          console.error(`cena "${name}" falhou`, error);
          return { start() {}, stop() {} };
        }),
    );
  }
  return scenes.get(host);
}

function setScenesRunning(slide, running) {
  if (!slide) return;
  for (const host of slide.querySelectorAll('.scene[data-scene]')) {
    sceneFor(host).then((scene) => (running ? scene.start() : scene.stop()));
  }
}

// ---------- Navegação ----------
function go(index) {
  const next = Math.max(0, Math.min(slides.length - 1, index));
  if (next === current) return;
  const previous = slides[current];
  previous?.classList.remove('active');
  setScenesRunning(previous, false);

  current = next;
  const slide = slides[current];
  slide.classList.add('active');
  setScenesRunning(slide, true);
  stage.classList.toggle('is-hero', slide.classList.contains('hero'));
  progressBar.style.width = `${((current + 1) / slides.length) * 100}%`;
  history.replaceState(null, '', `#${current + 1}`);
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  switch (event.key) {
    case 'ArrowRight':
    case 'PageDown':
    case ' ':
    case 'Enter':
      go(current + 1);
      break;
    case 'ArrowLeft':
    case 'PageUp':
    case 'Backspace':
      go(current - 1);
      break;
    case 'Home':
      go(0);
      break;
    case 'End':
      go(slides.length - 1);
      break;
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
    default:
      return;
  }
  event.preventDefault();
});

window.addEventListener('click', (event) => {
  if (event.button !== 0) return;
  go(current + (event.clientX < window.innerWidth * 0.2 ? -1 : 1));
});

// ---------- Código: realce ----------
const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'export',
  'import', 'from', 'new', 'this', 'true', 'false', 'null', 'undefined', 'of', 'in',
  'uniform', 'varying', 'attribute', 'void', 'float', 'int', 'bool', 'vec2', 'vec3',
  'vec4', 'mat3', 'mat4', 'sampler2D', 'struct', 'in', 'out', 'inout',
]);
const TOKEN =
  /(\/\/.*$)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(#\w+)|(\b\d+(?:\.\d+)?(?:e-?\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g;

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightLine(line) {
  if (/^\s*…/.test(line)) return `<span class="el">${escapeHtml(line)}</span>`;
  let html = '';
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    html += escapeHtml(line.slice(last, match.index));
    const [text, comment, string, directive, number, call, word] = match;
    const safe = escapeHtml(text);
    if (comment) html += `<span class="c">${safe}</span>`;
    else if (string) html += `<span class="s">${safe}</span>`;
    else if (directive) html += `<span class="k">${safe}</span>`;
    else if (number) html += `<span class="n">${safe}</span>`;
    else if (call) html += KEYWORDS.has(call) ? `<span class="k">${safe}</span>` : `<span class="f">${safe}</span>`;
    else if (word && KEYWORDS.has(word)) html += `<span class="k">${safe}</span>`;
    else html += safe;
    last = match.index + text.length;
  }
  return html + escapeHtml(line.slice(last));
}

function parseMarks(spec) {
  const marked = new Set();
  for (const part of (spec || '').split(',')) {
    const [a, b = a] = part.split('-').map((n) => parseInt(n, 10)); // "10" → [10, 10]; split dá 1 item, b fica indefinido sem o padrão
    if (Number.isNaN(a)) continue;
    for (let n = a; n <= (Number.isNaN(b) ? a : b); n += 1) marked.add(n);
  }
  return marked;
}

function renderCode(pre) {
  const source = pre.textContent.replace(/^\n/, '').replace(/\s+$/, '');
  const marks = parseMarks(pre.dataset.mark);
  pre.innerHTML = source
    .split('\n')
    .map((line, i) => `<span class="ln${marks.has(i + 1) ? ' mark' : ''}">${highlightLine(line) || '​'}</span>`)
    .join('');
}

// ---------- Código: ajustar a fonte para caber (nunca rolar) ----------
function fitCode(pre) {
  let size = parseFloat(pre.dataset.max) || CODE_MAX_PX;
  pre.style.fontSize = `${size}px`;
  while ((pre.scrollWidth > pre.clientWidth || pre.scrollHeight > pre.clientHeight) && size > CODE_MIN_PX) {
    size -= 0.5;
    pre.style.fontSize = `${size}px`;
  }
  const overflows = pre.scrollWidth > pre.clientWidth || pre.scrollHeight > pre.clientHeight;
  pre.dataset.fit = overflows ? 'overflow' : String(size);
  if (overflows) console.warn('código não coube', pre.dataset.file);
}

function fitAllCode() {
  stage.querySelectorAll('pre.code').forEach(fitCode);
}

// ---------- Início ----------
stage.querySelectorAll('pre.code').forEach(renderCode);
stage.querySelectorAll('pre.code[data-file]').forEach((pre) => {
  const caption = document.createElement('div');
  caption.className = 'code-file';
  caption.textContent = pre.dataset.file;
  pre.after(caption);
});

fitStage();
window.addEventListener('resize', fitStage);
document.fonts.ready.then(fitAllCode);

const fromHash = parseInt(location.hash.slice(1), 10);
go(Number.isNaN(fromHash) ? 0 : fromHash - 1);

// Pré-monta todas as cenas logo após a abertura (uma por vez, no tempo
// ocioso): importar o módulo e montar o SVG — algumas cenas pré-calculam
// o laço — não acontece mais no meio da apresentação, ao entrar no slide.
const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 50));
const pending = [...stage.querySelectorAll('.scene[data-scene]')];
(function preloadNext() {
  const host = pending.shift();
  if (!host) return;
  sceneFor(host).then(() => idle(preloadNext));
})();

// Exposto só para verificação automática (tamanho do código, slide atual).
window.__deck = { go, slides, fitAllCode, get current() { return current; } };
