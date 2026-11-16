// `npm run analyze` as a command line. Regression (2026-11-16): its
// "run as a script" guard compared import.meta.url with a hand-built
// `file://${argv[1]}`, which never matched on Windows paths, so the CLI
// silently printed nothing.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../support/analyze-level.js', import.meta.url));

describe('analyze-level CLI', () => {
  it('test_analyzeCli_level1_printsItsReport', () => {
    const result = spawnSync(process.execPath, [script, '1'], { encoding: 'utf8', timeout: 30000 });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('=== level-1');
  });
});
