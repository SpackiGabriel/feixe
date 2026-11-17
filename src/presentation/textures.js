import * as THREE from 'three';
import { symbolsFor } from '../gameplay/colors.js';

// Procedural 2D textures (spec §13 III "Texturas": floor, walls, receiver
// and door panels) drawn on a canvas at runtime — no image files, in line
// with the all-procedural asset approach. Cached per key and shared by
// every level, so level disposal never frees them. In Node (Vitest) there's
// no canvas: every factory returns null and materials simply have no map.

const cache = new Map();
const WALL_TILE_SIZE = 1.5; // metres per wall panel

function canvasTexture(key, size, draw, { repeat = null, wrap = false, colorSpace = THREE.SRGBColorSpace } = {}) {
  if (cache.has(key)) return cache.get(key);
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.anisotropy = 4;
  if (repeat || wrap) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  if (repeat) texture.repeat.set(repeat, repeat);
  cache.set(key, texture);
  return texture;
}

// Deterministic noise so textures look the same every load.
function speckle(ctx, size, count, alpha) {
  let seed = 1234567;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    const shade = Math.floor(rand() * 255);
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }
}

// One 1 m floor tile per texture repeat: dark concrete with a seam grid.
export function floorTexture(roomSize) {
  return canvasTexture('floor', 256, (ctx, s) => {
    ctx.fillStyle = '#3a3e42';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 2500, 0.08);
    ctx.strokeStyle = '#24282b';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, s, s);
    ctx.strokeStyle = '#4a4f54';
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, s - 6, s - 6);
  }, { repeat: roomSize });
}

// One wall bay, full room height (3 m) by WALL_TILE_SIZE wide: concrete
// above, an institutional painted band below, a dark skirting where wall
// meets floor and a shadow toward the ceiling — contact definition that
// keeps rooms from looking like floating planes. Tiles horizontally only.
export function wallTexture() {
  return canvasTexture('wall', 256, (ctx, s) => {
    // y = 0 is the top of the wall (canvas), s the floor.
    ctx.fillStyle = '#5f5e59';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 3000, 0.07);
    const band = s * 0.62; // painted band from ~1.15 m down
    ctx.fillStyle = '#33393a';
    ctx.fillRect(0, band, s, s - band);
    speckle(ctx, s, 600, 0.04);
    ctx.fillStyle = '#23282a';
    ctx.fillRect(0, band - 3, s, 4); // band edge
    ctx.fillStyle = '#121414';
    ctx.fillRect(0, s - 10, s, 10); // skirting
    const shade = ctx.createLinearGradient(0, s - 40, 0, s);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, s - 40, s, 40);
    const top = ctx.createLinearGradient(0, 0, 0, s * 0.35);
    top.addColorStop(0, 'rgba(0,0,0,0.6)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, s, s * 0.35);
    ctx.fillStyle = '#3e3d39';
    ctx.fillRect(0, 0, 3, s); // vertical seam between bays
    ctx.fillStyle = '#7b7a74';
    for (const y of [s * 0.2, s * 0.45]) {
      ctx.beginPath();
      ctx.arc(s / 2, y, 2.5, 0, Math.PI * 2); // form-tie holes
      ctx.fill();
    }
  }, { wrap: true });
}

// Dark coffered ceiling.
export function ceilingTexture() {
  return canvasTexture('ceiling', 128, (ctx, s) => {
    ctx.fillStyle = '#111312';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#1c1f1e';
    ctx.fillRect(8, 8, s - 16, s - 16);
    speckle(ctx, s, 300, 0.05);
  }, { wrap: true });
}

// Frosted glass partition: mullion grid and frost.
export function glassTexture() {
  return canvasTexture('glass', 256, (ctx, s) => {
    ctx.fillStyle = '#c4cfd1';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 5000, 0.1);
    ctx.fillStyle = '#2a2f31';
    ctx.fillRect(0, 0, 5, s); // one slim mullion per pane
  }, { wrap: true });
}

// Stenciled chamber numeral painted on the wall ("07"): set-dressing
// numerals only (TEXT-01), also a diegetic "where am I".
export function stencilTexture(text) {
  return canvasTexture(`stencil-${text}`, 256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(200,196,184,0.55)';
    ctx.font = 'bold 150px Impact, "Arial Narrow", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, s / 2, s / 2);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(0, s / 2 - 4, s, 8); // stencil bridges
    ctx.fillRect(s / 2 - 3, 0, 6, s);
    ctx.globalCompositeOperation = 'source-over';
  });
}

// Scales a geometry's UVs so a wrapping texture tiles every `tileSize`
// metres across and every `tileHeight` metres up (pass the wall height to
// span it exactly once) instead of stretching once over the whole surface.
export function tileUvs(geometry, width, height, tileSize = WALL_TILE_SIZE, tileHeight = tileSize) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * width) / tileSize, (uv.getY(i) * height) / tileHeight);
  uv.needsUpdate = true;
  return geometry;
}

// Door: hazard-striped edge band and horizontal slats.
export function doorTexture() {
  return canvasTexture('door', 256, (ctx, s) => {
    ctx.fillStyle = '#4d5357';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#3a3f42';
    ctx.lineWidth = 3;
    for (let y = 24; y < s; y += 24) {
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(s - 16, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(0, s - 18, s, 18);
    ctx.fillStyle = '#222';
    for (let x = -18; x < s; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, s);
      ctx.lineTo(x + 12, s);
      ctx.lineTo(x + 24, s - 18);
      ctx.lineTo(x + 12, s - 18);
      ctx.fill();
    }
  });
}

function drawSymbol(ctx, shape, cx, cy, r) {
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else if (shape === 'triangle') {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.95, cy + r * 0.75);
    ctx.lineTo(cx - r * 0.95, cy + r * 0.75);
    ctx.closePath();
  } else if (shape === 'diamond') {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.8, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.8, cy);
    ctx.closePath();
  }
  ctx.fill();
}

// A device face carrying its color's symbol(s) (accessibility NFR), meant
// as an emissiveMap: the symbols are white (glow at full emissive color),
// the plate dim gray (faint tint), a bright border frames the face.
export function symbolFaceTexture(colorName) {
  return canvasTexture(`symbol-${colorName}`, 256, (ctx, s) => {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#8a8a8a';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, s - 10, s - 10);
    const symbols = symbolsFor(colorName);
    const n = symbols.length;
    const r = n === 1 ? s * 0.28 : n === 2 ? s * 0.19 : s * 0.14;
    const gap = s / (n + 1);
    ctx.fillStyle = '#ffffff';
    symbols.forEach((shape, i) => drawSymbol(ctx, shape, gap * (i + 1), s / 2, r));
  });
}

// Trap blocker face: off-white/black hazard chevrons around a dark lens
// socket. Neutral on purpose — the trap's identity is the pattern, not a
// laser hue (design-system.md COL-01/02).
export function hazardTexture() {
  return canvasTexture('hazard', 256, (ctx, s) => {
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#d9d4c7';
    for (let x = -s; x < s * 2; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 24, 0);
      ctx.lineTo(x + 24 - s * 0.5, s);
      ctx.lineTo(x - s * 0.5, s);
      ctx.fill();
    }
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9d4c7';
    ctx.lineWidth = 6;
    ctx.stroke();
  });
}

// Plain blocker: cast concrete with form-tie holes.
export function concreteTexture() {
  return canvasTexture('concrete', 256, (ctx, s) => {
    ctx.fillStyle = '#4a4946';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 4000, 0.12);
    ctx.fillStyle = '#2f2e2c';
    for (const [x, y] of [[40, 40], [s - 40, 40], [40, s - 40], [s - 40, s - 40]]) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { wrap: true });
}

// Soft radial flare for beam contacts (white; tinted per sprite).
export function flareTexture() {
  return canvasTexture('flare', 128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

// Engraved pair numeral for portals (I, II, ...): both ends of a pair
// carry the same one, so the player can tell which two are linked.
export function numeralTexture(text) {
  return canvasTexture(`numeral-${text}`, 128, (ctx, s) => {
    ctx.fillStyle = '#1b1d1f';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#9a9a92';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, s - 12, s - 12);
    ctx.fillStyle = '#d9d4c7';
    ctx.font = 'bold 64px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, s / 2, s / 2 + 4);
  });
}

// Floor dial under rotatable objects: a ring with ticks every 15° and
// longer marks every 45° (the angles puzzles are built on).
export function dialTexture() {
  return canvasTexture('dial', 256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const c = s / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c, c, s * 0.46, 0, Math.PI * 2);
    ctx.stroke();
    for (let deg = 0; deg < 360; deg += 15) {
      const major = deg % 45 === 0;
      const a = (deg * Math.PI) / 180;
      const r0 = s * (major ? 0.36 : 0.41);
      ctx.lineWidth = major ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      ctx.lineTo(c + Math.cos(a) * s * 0.46, c + Math.sin(a) * s * 0.46);
      ctx.stroke();
    }
  });
}
