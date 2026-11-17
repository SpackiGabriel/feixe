// Kit compartilhado das cenas: SVG, glow, loop por tempo real, easing, cores.
// Toda cena usa isto em vez de reinventar (ver docs/superpowers/specs/2026-11-16-apresentacao-design.md).

const NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, tag);
  setAttrs(node, attrs);
  if (parent) parent.appendChild(node);
  return node;
}

export function setAttrs(node, attrs) {
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  return node;
}

// SVG que ocupa o host inteiro, com um filtro de brilho "<prefix>-glow".
export function makeSvg(host, width, height, prefix) {
  const svg = el('svg', {
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid meet',
    'font-family': 'var(--text)',
  });
  const defs = el('defs', {}, svg);
  // userSpaceOnUse: com a caixa padrão (objectBoundingBox), uma linha
  // horizontal ou vertical tem altura/largura 0 e o filtro a apaga.
  const filter = el('filter', {
    id: `${prefix}-glow`, filterUnits: 'userSpaceOnUse', x: -20, y: -20, width: width + 40, height: height + 40,
  }, defs);
  el('feGaussianBlur', { stdDeviation: 5, result: 'b' }, filter);
  const merge = el('feMerge', {}, filter);
  el('feMergeNode', { in: 'b' }, merge);
  el('feMergeNode', { in: 'SourceGraphic' }, merge);
  host.appendChild(svg);
  return svg;
}

// Feixe = halo largo e borrado + núcleo fino. Devolve { set(x1,y1,x2,y2), group }.
export function beam(parent, color, prefix, { width = 3, halo = 12, opacity = 1 } = {}) {
  const group = el('g', { opacity }, parent);
  const glow = el('line', { stroke: color, 'stroke-width': halo, 'stroke-opacity': 0.22, 'stroke-linecap': 'round' }, group);
  const core = el('line', { stroke: color, 'stroke-width': width, 'stroke-linecap': 'round', filter: `url(#${prefix}-glow)` }, group);
  return {
    group,
    set(x1, y1, x2, y2) {
      for (const line of [glow, core]) setAttrs(line, { x1, y1, x2, y2 });
    },
  };
}

// Loop por tempo real. frame(t) recebe segundos acumulados enquanto rodando
// (pausar e retomar continua de onde parou). frame(0) é desenhado já no mount.
export function loop(frame) {
  let raf = 0;
  let last = null;
  let elapsed = 0;
  function tick(now) {
    if (last !== null) elapsed += Math.min((now - last) / 1000, 0.1);
    last = now;
    frame(elapsed);
    raf = requestAnimationFrame(tick);
  }
  frame(0);
  return {
    start() {
      if (raf) return;
      last = null;
      raf = requestAnimationFrame(tick);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}

export const ease = {
  smooth: (t) => t * t * (3 - 2 * t),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
};

export const clamp01 = (t) => Math.max(0, Math.min(1, t));

// Valor de um token CSS (--c-red etc.) do documento.
export function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}

// Arco de circunferência (ângulos em radianos, coordenadas de tela).
export function arcPath(cx, cy, r, a0, a1) {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
}

// Seta: linha + ponta. Devolve { set(x1,y1,x2,y2), group }.
export function arrow(parent, color, { width = 2, head = 10, dash = null } = {}) {
  const group = el('g', {}, parent);
  const line = el('line', { stroke: color, 'stroke-width': width, 'stroke-linecap': 'round' }, group);
  if (dash) line.setAttribute('stroke-dasharray', dash);
  const tip = el('path', { fill: color }, group);
  return {
    group,
    set(x1, y1, x2, y2) {
      const a = Math.atan2(y2 - y1, x2 - x1);
      setAttrs(line, { x1, y1, x2: x2 - Math.cos(a) * head * 0.6, y2: y2 - Math.sin(a) * head * 0.6 });
      const l = { x: x2 - Math.cos(a - 0.42) * head, y: y2 - Math.sin(a - 0.42) * head };
      const r = { x: x2 - Math.cos(a + 0.42) * head, y: y2 - Math.sin(a + 0.42) * head };
      tip.setAttribute('d', `M ${x2} ${y2} L ${l.x} ${l.y} L ${r.x} ${r.y} Z`);
    },
  };
}

// Rótulo matemático (itálico, fonte de fórmula).
export function label(parent, text, color, { size = 22, italic = true, anchor = 'middle' } = {}) {
  return el('text', {
    text,
    fill: color,
    'font-family': 'var(--math)',
    'font-size': size,
    'font-style': italic ? 'italic' : 'normal',
    'text-anchor': anchor,
    'dominant-baseline': 'middle',
  }, parent);
}
