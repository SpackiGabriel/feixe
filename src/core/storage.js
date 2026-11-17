// Browser storage that never throws. Settings and progress persist per
// browser (spec NFR "Persistência mínima"), but storage can be missing or
// refuse access: with site data blocked, merely *reading*
// `globalThis.localStorage` throws a SecurityError, and setItem can throw
// in private mode. Every failure degrades to "nothing saved" — the game
// still runs, the setting just lasts for this session.
//
// Each module keeps its own key, format and default (look.js, quality.js,
// mirror-reflection.js, sfx.js, level-manager.js); this file only makes
// the access safe. `storage` is a parameter so tests inject a fake.

export function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readKey(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeKey(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // unavailable or full: the value applies for this session only
  }
}

export function removeKey(storage, key) {
  try {
    storage?.removeItem(key);
  } catch {
    // unavailable: nothing was saved to remove
  }
}
