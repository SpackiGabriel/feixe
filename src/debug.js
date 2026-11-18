import * as THREE from 'three';
import { perspective, viewMatrix, projectPoint } from './core/matrix.js';
import { getPhongMaterials, setShadingMode, getShadingMode } from './presentation/phong-material.js';

// `?debug`: level-authoring aid and the defence's live demos. Installed by
// main.js only in debug mode; nothing here runs in normal play.
// - window.__feixe: the runtime and friends, for the console and the e2e
//   playthrough (tests/e2e/playthrough.mjs drives these exact keys)
// - `?debug&level=N` jumps straight to level N (1-based)
// - F3 toggles the readout; T flips interior walls between T·R·S and T·S·R
// - the readout projects the aimed object by hand next to Three.js
// Returns { text() }: the readout for the HUD, or null while hidden.
export function installDebugTools({ params, levelRuntime, camera, scene, renderer, hud, menu, transitions, look, interaction, events, cameraFx, input }) {
  let visible = true;

  // Enunciado §3 I: interior walls composed in the wrong order, T·S·R, and
  // back to T·R·S. Visual only; R restarts the level. A (re)loaded level
  // always builds its walls in T·R·S.
  let wallOrder = 'TRS';
  events.on('level:enter', () => { wallOrder = 'TRS'; });
  function setWallOrder(order) {
    wallOrder = order === 'TSR' ? 'TSR' : 'TRS';
    const walls = levelRuntime.getCurrentLevel().walls;
    let anyChanged = false;
    for (const wall of walls) if (wall.setOrder(wallOrder)) anyChanged = true;
    const label = wallOrder === 'TSR' ? 'T·S·R (ordem errada)' : 'T·R·S (ordem certa)';
    if (walls.length === 0) return `${label} — sem paredes internas neste nível (use L2 ou L6)`;
    if (!anyChanged) return `${label} — aqui R = I, nada muda (use L2 ou L6)`;
    return label;
  }

  window.__feixe = {
    levelRuntime, camera, scene, renderer, hud, menu, transitions, look, interaction, events,
    cameraFx, // FOV from the console: cameraFx.setBaseFov(100) (it rewrites camera.fov every frame)
    wallOrder: setWallOrder,
    phong: { materials: getPhongMaterials, setShadingMode, getShadingMode },
  };

  const jumpTo = parseInt(params.get('level'), 10);
  if (Number.isInteger(jumpTo)) levelRuntime.loadLevel(jumpTo - 1);
  input.onKeyDown('F3', () => { visible = !visible; });
  input.onKeyDown('KeyT', () => hud.showToast(`Paredes: ${setWallOrder(wallOrder === 'TRS' ? 'TSR' : 'TRS')}`));

  return {
    text: () => (visible ? readout(levelRuntime, camera, interaction) : null),
  };
}

// Enunciado §3 II: the aimed object's centre projected by hand
// (core/matrix.js: P · V · p, then divide by w) next to Three's own
// Vector3.project, so the defence can show they agree and what w is.
const _aimedPosition = new THREE.Vector3();
const _projected = new THREE.Vector3();
const _eye = [0, 0, 0];
const _target = [0, 0, 0];
const fmt3 = (v) => v.toFixed(3);
function projectionLines(camera, object) {
  object.getWorldPosition(_aimedPosition);
  camera.updateMatrixWorld();
  _eye[0] = camera.position.x;
  _eye[1] = camera.position.y;
  _eye[2] = camera.position.z;
  _target[0] = _aimedPosition.x;
  _target[1] = _aimedPosition.y;
  _target[2] = _aimedPosition.z;
  const projection = perspective(camera.fov, camera.aspect, camera.near, camera.far);
  const view = viewMatrix(_eye, camera.rotation.x, camera.rotation.y, camera.rotation.z);
  const { w, ndc } = projectPoint(projection, view, _target);
  const three = _projected.copy(_aimedPosition).project(camera);
  return [
    `à mão: w=${w.toFixed(2)}  ndc=(${fmt3(ndc[0])}, ${fmt3(ndc[1])}, ${fmt3(ndc[2])})`,
    `Three: ndc=(${fmt3(three.x)}, ${fmt3(three.y)}, ${fmt3(three.z)})`,
  ];
}

function readout(levelRuntime, camera, interaction) {
  const level = levelRuntime.getCurrentLevel();
  const yaw = ((camera.rotation.y * 180) / Math.PI).toFixed(1);
  const aimed = interaction.getHovered();
  const lines = [
    `nível ${levelRuntime.getCurrentIndex() + 1}  [F3 oculta]`,
    `jogador x=${camera.position.x.toFixed(2)} z=${camera.position.z.toFixed(2)} yaw=${yaw}°`,
    `mira: ${aimed?.userData.debugInfo?.() ?? '-'}`,
  ];
  if (aimed) lines.push(...projectionLines(camera, aimed));
  for (const r of level.receivers) lines.push(`receptor ${r.levelId} (${r.colorName}): ${r.isActive() ? 'ATIVO' : 'inativo'}`);
  for (const b of level.blockers) if (b.trap) lines.push(`armadilha: ${b.isHit() ? 'ATINGIDA' : 'livre'}`);
  for (const d of level.doors) lines.push(`porta ${d.levelId}: ${d.isOpen() ? 'destravada' : 'travada'} · ${Math.round(d.getOpenness() * 100)}%`);
  return lines.join('\n');
}
