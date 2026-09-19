import { describe, it, expect } from 'vitest';
import { isPlayerAtExit } from '../../src/levels/exit-trigger.js';

describe('isPlayerAtExit', () => {
  it('test_isPlayerAtExit_doorClosedAndPlayerAtDoor_returnsFalse', () => {
    expect(
      isPlayerAtExit({ doorOpen: false, doorX: 0, doorZ: -5, playerX: 0, playerZ: -5, radius: 1.2 })
    ).toBe(false);
  });

  it('test_isPlayerAtExit_doorOpenAndPlayerWithinRadius_returnsTrue', () => {
    expect(
      isPlayerAtExit({ doorOpen: true, doorX: 0, doorZ: -5, playerX: 0, playerZ: -4.2, radius: 1.2 })
    ).toBe(true);
  });

  it('test_isPlayerAtExit_doorOpenAndPlayerBeyondRadius_returnsFalse', () => {
    expect(
      isPlayerAtExit({ doorOpen: true, doorX: 0, doorZ: -5, playerX: 0, playerZ: 0, radius: 1.2 })
    ).toBe(false);
  });

  it('test_isPlayerAtExit_doorOpenAndPlayerExactlyAtRadius_returnsTrue', () => {
    expect(
      isPlayerAtExit({ doorOpen: true, doorX: 0, doorZ: 0, playerX: 1.2, playerZ: 0, radius: 1.2 })
    ).toBe(true);
  });
});
