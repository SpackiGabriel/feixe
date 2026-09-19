import { demoLevel } from './data/demo-level.js';

// TEMPORARY: only the loader-validation level exists so far. Real
// numbered levels 1-10 (design/game-concept.md §11) are separate future
// work (STATUS.md's "Levels 1-10" row). Level 1 additionally needs a
// laser-free "simple switch" interactive object that doesn't exist yet.
const LEVELS = [demoLevel];

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
