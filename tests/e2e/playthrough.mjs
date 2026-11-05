// End-to-end playthrough in real Chromium + WebGL (SwiftShader, no GPU):
//   npm run e2e                 # all levels, then the end screen
//   node tests/e2e/playthrough.mjs --shots <dir>   # also save a PNG per level
// For every level: load it, check the exit starts closed, apply its declared
// `solution` through the player's own object controls, check the exit
// opens, walk the player into the exit and check the next level (or the
// end screen) loads. Also exercises real keyboard input (W movement, R
// restart) and fails on any page error. Needs the Chromium matching
// playwright-core (`npx playwright-core install chromium`, once).
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const shotsIndex = process.argv.indexOf('--shots');
const shotsDir = shotsIndex > 0 ? process.argv[shotsIndex + 1] : null;
if (shotsDir) await mkdir(shotsDir, { recursive: true });

const root = fileURLToPath(new URL('../..', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try {
    const body = await readFile(join(root, path === '/' ? 'index.html' : path));
    res.writeHead(200, { 'content-type': types[extname(path)] ?? (path === '/' ? 'text/html' : 'application/octet-stream') });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const failures = [];
function check(condition, message) {
  if (condition) console.log(`  ok   ${message}`);
  else { console.log(`  FAIL ${message}`); failures.push(message); }
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  // Offline check: the game must not need anything beyond the local server.
  const external = [];
  await page.route('**/*', (route) => {
    if (route.request().url().startsWith(base)) return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`${base}/index.html?debug&level=1`);
  await page.waitForFunction(() => window.__feixe, null, { timeout: 20000 });
  await page.evaluate(() => localStorage.clear());
  await page.waitForTimeout(500);

  const frames = (n) => page.evaluate((count) => new Promise((resolve) => {
    let left = count;
    const step = () => (--left <= 0 ? resolve() : requestAnimationFrame(step));
    requestAnimationFrame(step);
  }), n);

  console.log('input');
  const z0 = await page.evaluate(() => window.__feixe.camera.position.z);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  const z1 = await page.evaluate(() => window.__feixe.camera.position.z);
  check(z1 < z0 - 0.3, `holding W walks forward (z ${z0.toFixed(2)} → ${z1.toFixed(2)})`);
  await page.keyboard.press('KeyR');
  await frames(2);
  const z2 = await page.evaluate(() => window.__feixe.camera.position.z);
  check(Math.abs(z2 - z0) < 1e-6, 'R restarts the level and returns the player to spawn');

  console.log('aim occlusion (level 8)');
  const aim = (x, z, yaw) => page.evaluate(async ([px, pz, pyaw]) => {
    const { camera, look } = window.__feixe;
    camera.position.set(px, 1.6, pz);
    look.setOrientation(pyaw);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return window.__feixe.interaction.getHovered()?.userData.debugInfo?.() ?? null;
  }, [x, z, yaw]);
  await page.evaluate(() => window.__feixe.levelRuntime.loadLevel(7));
  await frames(2);
  check((await aim(0, 4.5, 0))?.startsWith('espelho m1'), 'mirror is selectable in plain view');
  check((await aim(0, -2, Math.PI)) === null, 'mirror behind the dividing wall is not selectable');

  const count = await page.evaluate(() => window.__feixe.levelRuntime.getLevelCount());
  for (let i = 0; i < count; i++) {
    console.log(`level ${i + 1}`);
    await page.evaluate((index) => window.__feixe.levelRuntime.loadLevel(index), i);
    await frames(3);
    const closed = await page.evaluate(() => !window.__feixe.levelRuntime.getCurrentLevel().exitDoor.isOpen());
    check(closed, 'exit starts closed');

    const applied = await page.evaluate(async () => {
      const { applySolution } = await import('/tests/support/apply-solution.js');
      const { getLevels } = await import('/src/levels/level-manager.js');
      const rt = window.__feixe.levelRuntime;
      const data = getLevels()[rt.getCurrentIndex()];
      try { applySolution(data, rt.getCurrentLevel(), data.solution); return null; } catch (e) { return e.message; }
    });
    check(applied === null, `solution applies (${applied ?? 'via player controls'})`);
    await frames(90); // let doors slide and receivers pulse
    const open = await page.evaluate(() => window.__feixe.levelRuntime.getCurrentLevel().exitDoor.isOpen());
    check(open, 'solution opens the exit');
    if (shotsDir) {
      await page.evaluate(() => {
        const { camera, levelRuntime } = window.__feixe;
        const s = levelRuntime.getCurrentLevel().spawn;
        camera.position.set(s.x, 1.6, s.z);
        document.querySelector('.hud-menu').hidden = true;
        document.querySelector('.hud-debug').hidden = true;
      });
      await frames(2);
      await page.screenshot({ path: join(shotsDir, `level-${String(i + 1).padStart(2, '0')}.png`) });
    }

    // Walk into the exit: stand just inside the room in front of the open door.
    await page.evaluate(() => {
      const { camera, levelRuntime } = window.__feixe;
      const door = levelRuntime.getCurrentLevel().exitDoor.position;
      const len = Math.hypot(door.x, door.z) || 1;
      camera.position.x = door.x - (door.x / len) * 0.8;
      camera.position.z = door.z - (door.z / len) * 0.8;
    });
    await frames(3);
    const after = await page.evaluate(() => ({ index: window.__feixe.levelRuntime.getCurrentIndex(), complete: window.__feixe.levelRuntime.isComplete() }));
    if (i < count - 1) check(after.index === i + 1, `exit loads level ${i + 2}`);
    else check(after.complete, 'last exit completes the game');
  }

  console.log('end screen');
  const endText = await page.evaluate(() => document.querySelector('.hud-menu-card')?.innerText ?? '');
  check(!(await page.evaluate(() => document.querySelector('.hud-menu').hidden)) && endText.includes('Fim'), 'end screen is shown');
  check((await page.evaluate(() => localStorage.getItem('feixe.currentLevelIndex'))) === null, 'progress reset after finishing');
  if (shotsDir) await page.screenshot({ path: join(shotsDir, 'end.png') });

  check(external.length === 0, `no external requests (runs offline)${external.length ? ': ' + external.join(', ') : ''}`);
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.log(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nall e2e checks passed');
