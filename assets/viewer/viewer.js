// Asset viewer: loads every GLB listed in assets/models/<asset>/manifest.json and shows
// them side by side under the same neutral lighting with a clay material. A prototyping
// tool, not game code. Loop: edit assets/src/blender/build_<asset>.py ->
// `bash assets/src/build.sh <asset>` -> press Recarregar (R).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const params = new URLSearchParams(location.search);
const ASSET = params.get('asset') ?? 'receiver';
const FLOOR_Y = -1.2; // beam height below the origin (design-system SPACE-01)

const canvas = document.getElementById('gl');
const gridEl = document.getElementById('grid');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setScissorTest(true);
const envTexture = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const clayMaterial = new THREE.MeshStandardMaterial({ color: 0xb9b9b6, roughness: 0.85, metalness: 0 });

const state = { clay: true, wire: false, floor: true, guides: true, sync: true, view: 'persp', hidden: new Set() };
let cells = [];
let center = new THREE.Vector3(0, -0.3, 0);
let distance = 3.2;

document.getElementById('assetName').textContent = `· ${ASSET}`;

function makeScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4a4d50);
  scene.environment = envTexture;
  scene.environmentIntensity = 0.7;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-3, 4, -3); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4); fill.position.set(3, 1, 2); scene.add(fill);
  return scene;
}

function buildGuides(box) {
  const g = new THREE.Group();
  g.add(new THREE.AxesHelper(0.35)); // origin: red +X, green +Y, blue +Z (so the front, -Z, points away from blue)
  const f = 0.4; // active face 0.8 x 0.8 centred on the origin, in the z = 0 plane
  const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-f, -f], [f, -f], [f, f], [-f, f]].map(([x, y]) => new THREE.Vector3(x, y, 0))), new THREE.LineBasicMaterial({ color: 0x40e0ff }));
  g.add(outline);
  g.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 0.5, 0xffd34d, 0.1, 0.06)); // front = -Z
  g.add(new THREE.Box3Helper(box, 0xffffff));
  return g;
}

function disposeCells() {
  for (const c of cells) {
    c.controls.dispose();
    c.scene.traverse((o) => { if (o.isMesh || o.isLine) { o.geometry?.dispose(); } });
    c.el.remove();
  }
  cells = [];
}

async function load() {
  disposeCells();
  gridEl.innerHTML = '';
  let manifest;
  try {
    const res = await fetch(`../models/${ASSET}/manifest.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(res.status);
    manifest = await res.json();
  } catch {
    gridEl.innerHTML = `<p class="msg">Nenhum manifest em <code>assets/models/${ASSET}/</code>. Rode <code>bash assets/src/build.sh ${ASSET}</code> e clique em Recarregar.</p>`;
    return;
  }
  renderChips(manifest.variants);
  const loader = new GLTFLoader();
  const union = new THREE.Box3();
  cells = (await Promise.all(manifest.variants.map(async (v) => {
    const el = document.createElement('div');
    el.className = 'cell';
    el.hidden = state.hidden.has(v.id);
    el.innerHTML = `<div class="tag"><b></b><small></small></div><div class="stats">carregando…</div>`;
    el.querySelector('b').textContent = v.label;
    el.querySelector('small').textContent = `${v.id}${v.note ? ' · ' + v.note : ''}`;
    gridEl.appendChild(el);
    try {
      const gltf = await loader.loadAsync(`../models/${ASSET}/${v.file}?t=${Date.now()}`);
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      union.union(box);
      let tris = 0;
      const originals = [];
      model.traverse((o) => { if (o.isMesh) { tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; originals.push([o, o.material]); } });
      const size = box.getSize(new THREE.Vector3());
      el.querySelector('.stats').textContent = `${tris} tris · ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m (x y z)`;
      const scene = makeScene();
      scene.add(model);
      const guides = buildGuides(box);
      scene.add(guides);
      const floor = new THREE.GridHelper(2, 20, 0x8a8d90, 0x666a6d); floor.position.y = FLOOR_Y; scene.add(floor);
      const camera = new THREE.PerspectiveCamera(36, 4 / 5, 0.05, 50);
      const controls = new OrbitControls(camera, el);
      controls.enableDamping = false; controls.enablePan = true;
      const cell = { v, el, scene, camera, controls, model, originals, guides, floor };
      controls.addEventListener('change', () => { if (state.sync) syncFrom(cell); });
      return cell;
    } catch (e) {
      el.querySelector('.stats').textContent = `erro ao carregar ${v.file}: ${e.message ?? e}`;
      return null;
    }
  }))).filter(Boolean);
  if (!union.isEmpty()) {
    union.getCenter(center);
    distance = Math.max(...union.getSize(new THREE.Vector3()).toArray()) * 1.9;
  }
  applyAll();
  setView(state.view);
}

function renderChips(variants) {
  const box = document.getElementById('chips');
  box.innerHTML = '';
  for (const v of variants) {
    const b = document.createElement('button');
    b.textContent = v.id.split('-')[0].toUpperCase();
    b.title = v.label;
    b.setAttribute('aria-pressed', String(!state.hidden.has(v.id)));
    b.addEventListener('click', () => {
      if (state.hidden.has(v.id)) state.hidden.delete(v.id); else state.hidden.add(v.id);
      b.setAttribute('aria-pressed', String(!state.hidden.has(v.id)));
      cells.find((c) => c.v.id === v.id).el.hidden = state.hidden.has(v.id);
    });
    box.appendChild(b);
  }
}

function applyAll() {
  for (const c of cells) {
    for (const [mesh, original] of c.originals) {
      mesh.material = state.clay ? clayMaterial : original;
      if (!state.clay) original.wireframe = state.wire;
    }
    clayMaterial.wireframe = state.wire;
    c.floor.visible = state.floor;
    c.guides.visible = state.guides;
  }
}

let syncing = false; // controls.update() below fires 'change' on the other cells; don't echo it back
function syncFrom(src) {
  if (syncing) return;
  syncing = true;
  for (const c of cells) {
    if (c === src) continue;
    c.camera.position.copy(src.camera.position);
    c.camera.up.copy(src.camera.up);
    c.controls.target.copy(src.controls.target);
    c.controls.update();
  }
  syncing = false;
}

const VIEWS = { persp: [-0.55, 0.22, -1], front: [0, 0, -1], back: [0, 0, 1], side: [1, 0, 0], top: [0, 1, -0.001] };
function setView(name) {
  state.view = name;
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
  const dir = new THREE.Vector3(...VIEWS[name]).normalize();
  for (const c of cells) {
    c.controls.target.copy(center);
    c.camera.position.copy(center).addScaledVector(dir, distance);
    c.camera.up.set(0, 1, 0);
    c.controls.update();
  }
}

function frame() {
  const w = innerWidth, h = innerHeight;
  if (canvas.width !== Math.round(w * devicePixelRatio) || canvas.height !== Math.round(h * devicePixelRatio)) {
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(w, h, false);
  }
  renderer.setClearColor(0x2a2c2e, 1);
  renderer.setScissor(0, 0, w, h); renderer.setViewport(0, 0, w, h); renderer.clear();
  for (const c of cells) {
    if (c.el.hidden) continue;
    const r = c.el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > h || r.right < 0 || r.left > w) continue;
    const x = Math.max(r.left, 0), y = Math.max(r.top, 0), x2 = Math.min(r.right, w), y2 = Math.min(r.bottom, h);
    // viewport = full cell (so the aspect is right even when partly scrolled out); scissor = visible part
    renderer.setViewport(r.left, h - r.bottom, r.width, r.height);
    renderer.setScissor(x, h - y2, x2 - x, y2 - y);
    c.camera.aspect = r.width / r.height; c.camera.updateProjectionMatrix();
    renderer.render(c.scene, c.camera);
  }
  requestAnimationFrame(frame);
}

function toggle(id, key) {
  const b = document.getElementById(id);
  b.addEventListener('click', () => { state[key] = !state[key]; b.setAttribute('aria-pressed', String(state[key])); applyAll(); });
}
toggle('tClay', 'clay'); toggle('tWire', 'wire'); toggle('tGrid', 'floor'); toggle('tHelp', 'guides');
document.getElementById('sync').addEventListener('change', (e) => { state.sync = e.target.checked; });
document.getElementById('cols').addEventListener('change', (e) => gridEl.style.setProperty('--cols', e.target.value));
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
document.getElementById('reload').addEventListener('click', load);
addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) load(); });
gridEl.style.setProperty('--cols', document.getElementById('cols').value);

window.__viewer = { state, get cells() { return cells; }, setView, load };
load().then(() => requestAnimationFrame(frame));
