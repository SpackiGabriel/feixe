import { level1 } from './data/level-1.js';
import { level2 } from './data/level-2.js';
import { level3 } from './data/level-3.js';
import { level4 } from './data/level-4.js';
import { level5 } from './data/level-5.js';
import { level6 } from './data/level-6.js';
import { level7 } from './data/level-7.js';
import { level8 } from './data/level-8.js';
import { level9 } from './data/level-9.js';

// TEMPORARY: levels 1-9 are real; level 10 (design/game-concept.md §11)
// is separate future work (STATUS.md's "Levels 1-10" row).
const LEVELS = [level1, level2, level3, level4, level5, level6, level7, level8, level9];

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
