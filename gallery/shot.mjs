// Repeatable gallery screenshot: node gallery/shot.mjs <out.png> "<query string>"
//   e.g. node gallery/shot.mjs /tmp/a.png "scene=symbols&station=mid&view=deutan"
// Starts a throwaway static server on a free port, loads gallery/index.html with the
// query (see gallery/README.md for the parameters), hides the panel and saves a 1280x720
// frame. Uses software WebGL (SwiftShader) so it runs without a GPU, e.g. in WSL2/CI.
// Needs a Chromium matching the pinned playwright-core (run `npx playwright-core install
// chromium` once; it is a no-op if ~/.cache/ms-playwright already has the revision).
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const [out, query = ''] = process.argv.slice(2);
if (!out) { console.error('usage: node gallery/shot.mjs <out.png> "<query>"'); process.exit(2); }

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/gallery/index.html?${query}`);
  await page.waitForFunction(() => window.__gallery, null, { timeout: 15000 });
  await page.waitForTimeout(1500); // a few frames
  await page.evaluate(() => document.getElementById('panel').classList.add('hidden'));
  await page.screenshot({ path: out });
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
} finally {
  await browser.close();
  server.close();
}
