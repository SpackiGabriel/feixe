import { describe, it, expect, afterEach } from 'vitest';
import { browserStorage, readKey, writeKey, removeKey } from '../../src/core/storage.js';

function createThrowingStorage() {
  const fail = () => { throw new Error('SecurityError'); };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

describe('browserStorage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  });

  it('test_browserStorage_getterThrows_returnsNull', () => {
    // Site data blocked: merely reading window.localStorage throws.
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('SecurityError'); } });
    expect(browserStorage()).toBeNull();
  });

  it('test_browserStorage_missing_returnsNull', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: undefined });
    expect(browserStorage()).toBeNull();
  });
});

describe('readKey / writeKey / removeKey', () => {
  it('test_storageAccess_throwingStorage_neverThrows', () => {
    const storage = createThrowingStorage();
    expect(readKey(storage, 'k')).toBeNull();
    expect(() => writeKey(storage, 'k', 'v')).not.toThrow();
    expect(() => removeKey(storage, 'k')).not.toThrow();
  });

  it('test_storageAccess_nullStorage_readsNull', () => {
    expect(readKey(null, 'k')).toBeNull();
    expect(() => writeKey(null, 'k', 'v')).not.toThrow();
  });

  it('test_storageAccess_roundTrip_returnsWrittenValue', () => {
    const data = {};
    const storage = { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
    writeKey(storage, 'k', 'v');
    expect(readKey(storage, 'k')).toBe('v');
    removeKey(storage, 'k');
    expect(readKey(storage, 'k')).toBeNull();
  });
});
