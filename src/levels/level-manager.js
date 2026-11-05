import { level1 } from './data/level-1.js';
import { level2 } from './data/level-2.js';
import { level3 } from './data/level-3.js';
import { level4 } from './data/level-4.js';
import { level5 } from './data/level-5.js';
import { level6 } from './data/level-6.js';
import { level7 } from './data/level-7.js';
import { level8 } from './data/level-8.js';
import { level9 } from './data/level-9.js';
import { level10 } from './data/level-10.js';

// The fixed sequence (RF09). To add or reorder a level, edit this list.
const LEVELS = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10];

export function getLevels() {
  return LEVELS;
}

const STORAGE_KEY = 'feixe.currentLevelIndex';

// Pure — no Three.js, and storage is injectable — so this is unit
// testable without a real browser storage API (test-standards.md: mock
// external dependencies).
export function clampLevelIndex(index, levelCount) {
  if (!Number.isInteger(index) || levelCount <= 0) return 0;
  return Math.max(0, Math.min(index, levelCount - 1));
}

// Spec NFR "Persistência mínima": the player's current level persists
// locally between sessions.
export function loadSavedLevelIndex(levelCount, storage = globalThis.localStorage) {
  const raw = storage?.getItem(STORAGE_KEY);
  const parsed = raw != null ? parseInt(raw, 10) : 0;
  return clampLevelIndex(parsed, levelCount);
}

export function saveLevelIndex(index, storage = globalThis.localStorage) {
  storage?.setItem(STORAGE_KEY, String(index));
}

// "Novo jogo" and finishing the last level both start the next session at level 1.
export function resetProgress(storage = globalThis.localStorage) {
  storage?.removeItem(STORAGE_KEY);
}

// Pure: what walking through level `index`'s exit leads to (RF09). After the
// last level the game is complete (spec §8: "a conclusão do jogo corresponde
// à abertura da porta final do décimo nível") and the next session restarts.
export function nextAfterExit(index, levelCount) {
  if (index + 1 >= levelCount) return { complete: true, index: 0 };
  return { complete: false, index: index + 1 };
}
