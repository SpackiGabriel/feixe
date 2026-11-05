// End-to-end playthrough in real Chromium + WebGL (SwiftShader, no GPU):
//   npm run e2e                                   # everything
//   node tests/e2e/playthrough.mjs --shots <dir>  # also save screenshots
// Covers: real keyboard movement and restart, menu keyboard navigation,
// aim occlusion, door reversal (re-lock mid-lift), level 8's route on foot
// through a portal, every level from closed exit → solution → walk into the
// exit → next level, the ending and replay, a reduced-motion run, no page
// errors and no external requests (runs offline). Waits are condition-based
// (animations take real time), never fixed frame counts. Needs the
// Chromium matching playwright-core (`npx playwright-core install chromium`).
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const shotsIndex = process.argv.indexOf('--shots');
const shotsDir = shotsIndex > 0 ? process.argv[shotsIndex + 1] : null;
if (shotsDir) await mkdir(shotsDir, { recursive: true });

const root = fileURLToPath(new URL('../..', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = path === '/' ? 'index.html' : path;
  try {
    const body = await readFile(join(root, file));
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
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

async function openGame(browser, { reducedMotion = 'no-preference', level = 1 } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  await page.route('**/*', (route) => {
    if (route.request().url().startsWith(base)) return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}/index.html?debug&level=${level}`);
  await page.waitForFunction(() => window.__feixe, null, { timeout: 20000 });
  await page.evaluate(() => localStorage.clear());

  const g = {
    page,
    errors,
    external,
    // Resolve once `fn` (run in the page) is truthy; false on timeout.
    // Generous: on a slow CI runner a software-WebGL frame takes ~0.7 s and
    // game time advances at most 0.1 s per frame, so game seconds cost
    // several real seconds. These are waits, not assertions on speed.
    until: (fn, arg, timeout = 40000) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true, () => false),
    eval: (fn, arg) => page.evaluate(fn, arg),
    load: (index) => page.evaluate((i) => window.__feixe.levelRuntime.loadLevel(i), index),
    pos: () => page.evaluate(() => ({ x: window.__feixe.camera.position.x, z: window.__feixe.camera.position.z })),
    place: (x, z, yaw = 0) => page.evaluate(([px, pz, pyaw]) => {
      window.__feixe.camera.position.set(px, 1.6, pz);
      window.__feixe.look.setOrientation(pyaw);
    }, [x, z, yaw]),
    // Hold W until `fn` is true (or give up).
    walkUntil: async (fn, arg, timeout = 30000) => {
      await page.keyboard.down('KeyW');
      const ok = await g.until(fn, arg, timeout);
      await page.keyboard.up('KeyW');
      return ok;
    },
    applySolution: (field = 'solution') => page.evaluate(async (key) => {
      const { applySolution } = await import('/tests/support/apply-solution.js');
      const { getLevels } = await import('/src/levels/level-manager.js');
      const rt = window.__feixe.levelRuntime;
      const data = getLevels()[rt.getCurrentIndex()];
      try { applySolution(data, rt.getCurrentLevel(), data[key]); return null; } catch (e) { return e.message; }
    }, field),
    exitPassable: () => page.evaluate(() => window.__feixe.levelRuntime.getCurrentLevel().exitDoor.isPassable()),
    hideOverlays: () => page.evaluate(() => {
      window.__feixe.menu.hide();
      document.querySelector('.debug').hidden = true;
    }),
  };
  return { context, g };
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const { context, g } = await openGame(browser);
  const { page } = g;

  console.log('menu');
  check(await g.eval(() => document.querySelector('.menu').classList.contains('visible')), 'start menu is shown on load');
  check(await g.eval(() => !document.getElementById('boot')), 'boot line removed once the game is ready');
  const firstSel = await g.eval(() => document.querySelector('.mi.sel .mi-label').textContent);
  await page.keyboard.press('ArrowDown');
  const secondSel = await g.eval(() => document.querySelector('.mi.sel .mi-label').textContent);
  check(firstSel !== secondSel, `arrow keys move the menu cursor (${firstSel} → ${secondSel})`);
  await page.keyboard.press('ArrowUp');
  if (shotsDir) await page.screenshot({ path: join(shotsDir, '00-menu.png') });

  console.log('start, pause, resume (pointer lock)');
  await page.click('.mi.sel');
  const locked = await g.until(() => document.pointerLockElement !== null, null, 3000);
  check(locked, 'choosing the first menu item locks the pointer');
  check(await g.eval(() => !document.querySelector('.menu').classList.contains('visible')), 'and hides the menu');
  check(await g.until(() => document.querySelector('.intro').classList.contains('visible')), 'the level title appears once play starts');
  await g.eval(() => document.exitPointerLock());
  check(await g.until(() => document.querySelector('.menu').classList.contains('visible')), 'losing the pointer lock pauses (menu shown)');
  check((await g.eval(() => document.querySelector('.mi.sel .mi-label').textContent)).toLowerCase() === 'continuar', 'pause menu offers Continuar first');
  await page.waitForTimeout(1300); // browsers refuse a re-lock within ~1 s of leaving it
  await page.keyboard.press('Enter');
  check(await g.until(() => document.pointerLockElement !== null, null, 3000), 'Enter on Continuar resumes (pointer locked again)');
  await g.eval(() => document.exitPointerLock());
  await g.hideOverlays();

  console.log('input');
  const z0 = (await g.pos()).z;
  check(await g.walkUntil((z) => window.__feixe.camera.position.z < z - 0.5, z0), 'holding W walks forward');
  await page.keyboard.press('KeyR');
  check(await g.until((z) => Math.abs(window.__feixe.camera.position.z - z) < 1e-6, z0), 'R restarts the chamber and returns the player to spawn');

  console.log('aim occlusion (level 8)');
  // Wait for a few rendered frames (interaction updates once per frame;
  // a software-WebGL frame can take ~200 ms), then read what's aimed at.
  const aimAt = async (x, z, yaw, expectSomething) => {
    await g.place(x, z, yaw);
    if (expectSomething) await g.until(() => window.__feixe.interaction.getHovered() !== null, null, 20000);
    else await g.eval(() => new Promise((resolve) => { let n = 4; const step = () => (--n <= 0 ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }));
    return g.eval(() => window.__feixe.interaction.getHovered()?.userData.debugInfo?.() ?? null);
  };
  await g.load(7);
  check((await aimAt(0, 4.5, 0, true))?.startsWith('espelho m1'), 'mirror is selectable in plain view');
  check((await aimAt(0, -2, Math.PI, false)) === null, 'mirror behind the dividing wall is not selectable');

  console.log('door reversal (level 2)');
  await g.load(1);
  await g.applySolution();
  check(await g.until(() => window.__feixe.levelRuntime.getCurrentLevel().exitDoor.getOpenness() > 0.4), 'solved door lifts');
  const mid = await g.eval(() => window.__feixe.levelRuntime.getCurrentLevel().exitDoor.getOpenness());
  await g.eval(() => window.__feixe.levelRuntime.getCurrentLevel().mirrors[0].applyPositionDelta(-0.5)); // knock the mirror off the beam
  const after = await g.eval(() => window.__feixe.levelRuntime.getCurrentLevel().exitDoor.getOpenness());
  check(Math.abs(after - mid) < 0.2, `re-locked door continues from where it was (no jump: ${mid.toFixed(2)} → ${after.toFixed(2)})`);
  check(await g.until(() => window.__feixe.levelRuntime.getCurrentLevel().exitDoor.getOpenness() === 0), 'and drops shut');
  check(!(await g.exitPassable()), 'closed door is not passable');

  console.log('level 8 route on foot (real W key)');
  await g.load(7);
  const rotateM1 = (angle) => g.eval((a) => {
    const m = window.__feixe.levelRuntime.getCurrentLevel().mirrors[0];
    m.applyRotationDelta(a - m.plate.rotation.y);
  }, angle);
  await g.place(0.3, 2.9, 0);
  await g.walkUntil(() => window.__feixe.camera.position.z < 2, null, 1200);
  check((await g.pos()).z > 2, 'closed door 1 blocks the way');
  await rotateM1(Math.PI / 4);
  check(await g.until(() => window.__feixe.levelRuntime.getCurrentLevel().doors[0].isPassable()), 'door 1 lifts once its receiver locks');
  check(await g.walkUntil(() => window.__feixe.camera.position.z < 1.6), 'walked through door 1 into the strip');
  await rotateM1(Math.PI / 2);
  check(await g.until(() => window.__feixe.levelRuntime.getCurrentLevel().exitDoor.isOpen()), 'turning the mirror edge-on unlocks the exit');
  check(await g.walkUntil(() => window.__feixe.camera.position.z < 0), 'walking into the portal lands north of the dividing wall');

  const count = await g.eval(() => window.__feixe.levelRuntime.getLevelCount());
  for (let i = 0; i < count; i++) {
    console.log(`level ${i + 1}`);
    await g.load(i);
    await page.waitForTimeout(100);
    check(!(await g.eval(() => window.__feixe.levelRuntime.getCurrentLevel().exitDoor.isOpen())), 'exit starts locked');
    const frameMs = await g.eval(() => new Promise((resolve) => {
      const times = [];
      let last = performance.now();
      const step = (t) => { times.push(t - last); last = t; if (times.length < 30) requestAnimationFrame(step); else resolve(times.reduce((a, b) => a + b) / times.length); };
      requestAnimationFrame(step);
    }));
    const applied = await g.applySolution();
    check(applied === null, `solution applies through the player's controls${applied ? ': ' + applied : ''}`);
    check(await g.until(() => window.__feixe.levelRuntime.getCurrentLevel().exitDoor.isPassable()), `exit opens and becomes passable (avg frame ${frameMs.toFixed(1)} ms in software WebGL)`);
    if (shotsDir) {
      await g.eval(() => {
        const s = window.__feixe.levelRuntime.getCurrentLevel().spawn;
        window.__feixe.camera.position.set(s.x, 1.6, s.z);
        window.__feixe.look.setOrientation(s.yaw);
      });
      await page.waitForTimeout(2600); // let the title card fade
      await page.screenshot({ path: join(shotsDir, `level-${String(i + 1).padStart(2, '0')}.png`) });
    }
    // Walk into the exit: stand just inside the room in front of the open door.
    await g.eval(() => {
      const { camera, levelRuntime } = window.__feixe;
      const door = levelRuntime.getCurrentLevel().exitDoor.position;
      const len = Math.hypot(door.x, door.z) || 1;
      camera.position.x = door.x - (door.x / len) * 0.8;
      camera.position.z = door.z - (door.z / len) * 0.8;
    });
    if (i < count - 1) check(await g.until((next) => window.__feixe.levelRuntime.getCurrentIndex() === next, i + 1), `exit leads to level ${i + 2} (through the shutter)`);
    else check(await g.until(() => window.__feixe.levelRuntime.isComplete()), 'last exit completes the game');
  }

  console.log('ending');
  check(await g.until(() => document.querySelector('.ending').classList.contains('visible')), 'ending sequence is shown');
  check(await g.until(() => document.querySelector('.ending').innerText.includes('SISTEMA ÓPTICO: ATIVO'), null, 15000), 'ending log types out to the last line');
  check((await g.eval(() => localStorage.getItem('feixe.currentLevelIndex'))) === null, 'progress reset after finishing');
  if (shotsDir) await page.screenshot({ path: join(shotsDir, '99-ending.png') });
  await page.keyboard.press('Enter');
  check(await g.until(() => window.__feixe.levelRuntime.getCurrentIndex() === 0 && !window.__feixe.levelRuntime.isComplete()), 'Enter on the ending replays from level 1');

  check(g.external.length === 0, `no external requests (runs offline)${g.external.length ? ': ' + g.external.join(', ') : ''}`);
  check(g.errors.length === 0, `no page errors${g.errors.length ? ': ' + g.errors.join(' | ') : ''}`);
  await context.close();

  console.log('reduced motion');
  const reduced = await openGame(browser, { reducedMotion: 'reduce', level: 1 });
  const solved = await reduced.g.applySolution();
  check(solved === null && (await reduced.g.until(() => window.__feixe.levelRuntime.getCurrentLevel().exitDoor.isPassable())), 'level 1 solvable with reduced motion');
  await reduced.g.eval(() => window.__feixe.camera.position.set(0, 1.6, -4.1));
  check(await reduced.g.until(() => window.__feixe.levelRuntime.getCurrentIndex() === 1), 'transition completes with reduced motion');
  check(reduced.g.errors.length === 0, `no page errors with reduced motion${reduced.g.errors.length ? ': ' + reduced.g.errors.join(' | ') : ''}`);
  await reduced.context.close();
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.log(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nall e2e checks passed');
