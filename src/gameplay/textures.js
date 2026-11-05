import * as THREE from 'three';
import { symbolsFor } from './colors.js';

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

// Wall panels: painted steel plates with seams and rivets.
export function wallTexture() {
  return canvasTexture('wall', 256, (ctx, s) => {
    ctx.fillStyle = '#5b6166';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 1500, 0.06);
    ctx.fillStyle = '#3d4246';
    ctx.fillRect(0, 0, s, 6);
    ctx.fillRect(0, 0, 6, s);
    ctx.fillStyle = '#7a8085';
    for (const [x, y] of [[20, 20], [s - 20, 20], [20, s - 20], [s - 20, s - 20]]) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { wrap: true });
}

// Scales a geometry's UVs so a wrapping texture tiles every `tileSize`
// metres instead of stretching once across the whole surface. Shared wall
// texture, per-geometry tiling.
export function tileUvs(geometry, width, height, tileSize = WALL_TILE_SIZE) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * width) / tileSize, (uv.getY(i) * height) / tileSize);
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
