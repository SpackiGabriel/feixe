// Verifica a apresentação (apresentacao.html) num Chromium real:
//   node tests/e2e/deck-check.mjs [--page <arquivo.html>] [--shots <dir>] [--size 1280x720]
//     percorre todos os slides, confere que nenhum bloco de código rola ou
//     ficou abaixo da fonte mínima, que não há erro de console nem pedido
//     externo, e (com --shots) salva um PNG por slide.
//   node tests/e2e/deck-check.mjs --scene <nome> --out <arquivo.png> [--at <s>]
//     captura uma cena isolada pela página de prévia, após <s> segundos (padrão 2).
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};

const root = fileURLToPath(new URL('../..', import.meta.url));
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
};
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = path === '/' || path === '\\' ? 'index.html' : path;
  try {
    const body = await readFile(join(root, file));
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const [width, height] = (arg('--size', '1280x720')).split('x').map(Number);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width, height } });
const page = await context.newPage();
const errors = [];
const external = [];
await page.route('**/*', (route) => {
  if (route.request().url().startsWith(base)) return route.continue();
  external.push(route.request().url());
  return route.abort();
});
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });

let failed = false;
const scene = arg('--scene');
if (scene) {
  await page.goto(`${base}/apresentacao/scenes/_preview.html?scene=${scene}`);
  await page.waitForTimeout(Number(arg('--at', '2')) * 1000);
  const out = arg('--out', `${scene}.png`);
  await page.locator('#host').screenshot({ path: out });
  console.log(`cena ${scene} → ${out}`);
} else {
  const shots = arg('--shots');
  if (shots) await mkdir(shots, { recursive: true });
  await page.goto(`${base}/${arg('--page', 'apresentacao.html')}`);
  await page.waitForFunction(() => window.__deck, null, { timeout: 10000 });
  await page.evaluate(() => document.fonts.ready);
  const count = await page.evaluate(() => window.__deck.slides.length);
  for (let i = 0; i < count; i += 1) {
    await page.evaluate((n) => window.__deck.go(n), i);
    await page.waitForTimeout(1600);
    const report = await page.evaluate(() => {
      const slide = window.__deck.slides[window.__deck.current];
      return [...slide.querySelectorAll('pre.code')].map((pre) => ({
        file: pre.dataset.file,
        fit: pre.dataset.fit,
        overflow: pre.scrollHeight > pre.clientHeight || pre.scrollWidth > pre.clientWidth,
      }));
    });
    for (const code of report) {
      const bad = code.overflow || code.fit === 'overflow';
      if (bad) failed = true;
      console.log(`  ${bad ? 'FAIL' : 'ok  '} slide ${i + 1}: código ${code.file} (fonte ${code.fit}px)`);
    }
    if (shots) await page.screenshot({ path: join(shots, `slide-${String(i + 1).padStart(2, '0')}.png`) });
  }
  console.log(`${count} slides percorridos`);
}

if (errors.length) { failed = true; console.log('erros de console:\n  ' + errors.join('\n  ')); }
if (external.length) { failed = true; console.log('pedidos externos (proibido, precisa ser offline):\n  ' + external.join('\n  ')); }
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
