// Every module under src/ must at least import cleanly (catches a broken
// relative path or a typo'd export in a file no other test touches).
// main.js is excluded: it builds a WebGL renderer and starts the loop.
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));

function listJs(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listJs(path);
    return entry.name.endsWith('.js') ? [path] : [];
  });
}

const files = listJs(SRC).filter((f) => relative(SRC, f) !== 'main.js');

describe('src modules', () => {
  it.each(files.map((f) => [relative(SRC, f), f]))('test_import_%s_resolves', async (_name, file) => {
    await expect(import(file)).resolves.toBeDefined();
  });
});
