import { describe, it, expect } from 'vitest';
import {
  clampLevelIndex, loadSavedLevelIndex, saveLevelIndex, resetProgress, nextAfterExit, getLevels,
} from '../../src/levels/level-manager.js';
import { createLevelRuntime } from '../../src/levels/level-runtime.js';
import { createScene } from '../../src/core/scene.js';
import { applySolution } from '../support/apply-solution.js';

function createFakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = value; },
    removeItem: (key) => { delete data[key]; },
    _data: data,
  };
}

describe('clampLevelIndex', () => {
  it('test_clampLevelIndex_withinRange_returnsUnchanged', () => {
    expect(clampLevelIndex(2, 5)).toBe(2);
  });

  it('test_clampLevelIndex_negative_clampsToZero', () => {
    expect(clampLevelIndex(-3, 5)).toBe(0);
  });

  it('test_clampLevelIndex_beyondLastLevel_clampsToLastIndex', () => {
    expect(clampLevelIndex(99, 5)).toBe(4);
  });

  it('test_clampLevelIndex_nonInteger_returnsZero', () => {
    expect(clampLevelIndex(NaN, 5)).toBe(0);
    expect(clampLevelIndex(1.5, 5)).toBe(0);
  });

  it('test_clampLevelIndex_zeroLevels_returnsZero', () => {
    expect(clampLevelIndex(0, 0)).toBe(0);
  });
});

describe('loadSavedLevelIndex', () => {
  it('test_loadSavedLevelIndex_noStoredValue_returnsZero', () => {
    const storage = createFakeStorage();
    expect(loadSavedLevelIndex(5, storage)).toBe(0);
  });

  it('test_loadSavedLevelIndex_validStoredValue_returnsIt', () => {
    const storage = createFakeStorage({ 'feixe.currentLevelIndex': '3' });
    expect(loadSavedLevelIndex(5, storage)).toBe(3);
  });

  it('test_loadSavedLevelIndex_storedValueOutOfRange_clampsIt', () => {
    // Simulates level count shrinking (or corrupted storage) between sessions.
    const storage = createFakeStorage({ 'feixe.currentLevelIndex': '99' });
    expect(loadSavedLevelIndex(5, storage)).toBe(4);
  });

  it('test_loadSavedLevelIndex_noStorageAvailable_returnsZero', () => {
    expect(loadSavedLevelIndex(5, undefined)).toBe(0);
  });
});

describe('saveLevelIndex', () => {
  it('test_saveLevelIndex_writesStringifiedIndexToStorage', () => {
    const storage = createFakeStorage();
    saveLevelIndex(2, storage);
    expect(storage._data['feixe.currentLevelIndex']).toBe('2');
  });

  it('test_saveLevelIndex_noStorageAvailable_doesNotThrow', () => {
    expect(() => saveLevelIndex(2, undefined)).not.toThrow();
  });
});

describe('resetProgress', () => {
  it('test_resetProgress_afterSave_nextLoadStartsAtLevelOne', () => {
    const storage = createFakeStorage();
    saveLevelIndex(6, storage);
    resetProgress(storage);
    expect(loadSavedLevelIndex(10, storage)).toBe(0);
  });
});

describe('nextAfterExit', () => {
  it('test_nextAfterExit_middleLevel_loadsNext', () => {
    expect(nextAfterExit(3, 10)).toEqual({ complete: false, index: 4 });
  });

  it('test_nextAfterExit_lastLevel_completesGame', () => {
    expect(nextAfterExit(9, 10)).toEqual({ complete: true, index: 0 });
  });
});

describe('getLevels', () => {
  it('test_getLevels_everyLevelHasIdAndName', () => {
    for (const level of getLevels()) {
      expect(level.id).toMatch(/^level-\d+$/);
      expect(typeof level.name).toBe('string');
    }
  });
});

describe('createLevelRuntime', () => {
  // Regression: starting a new game during the final level's 1.1 s whiteout
  // resets currentIndex to 0; when the whiteout callback later fires
  // advance(), it must not load level 2.
  it('test_createLevelRuntime_startNewGameDuringPendingExit_staysOnLevel1WhenAdvanceRuns', () => {
    const { scene, wallSegments, occluders } = createScene();
    const pending = [];
    const runtime = createLevelRuntime({
      scene,
      wallSegments,
      interactiveObjects: [],
      roomOccluders: occluders,
      onExit: (next) => pending.push(next),
    });

    const levels = getLevels();
    const lastIndex = levels.length - 1;
    runtime.loadLevel(lastIndex);
    applySolution(levels[lastIndex], runtime.getCurrentLevel(), levels[lastIndex].solution);
    const door = runtime.getCurrentLevel().exitDoor.position;
    const camera = { position: { x: door.x, y: 1.6, z: door.z }, rotation: { y: 0 } };

    for (let i = 0; i < 20 && !runtime.isExiting(); i++) runtime.update(0.1, camera);
    expect(runtime.isExiting()).toBe(true);
    expect(pending).toEqual([{ complete: true, index: 0 }]);

    runtime.startNewGame();
    expect(runtime.getCurrentIndex()).toBe(0);
    expect(runtime.isExiting()).toBe(false);

    runtime.advance();
    expect(runtime.getCurrentIndex()).toBe(0);
    expect(runtime.isComplete()).toBe(false);
  });
});
