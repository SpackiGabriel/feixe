import { describe, it, expect } from 'vitest';
import { parsePrompt } from '../../src/ui/hud.js';

describe('parsePrompt', () => {
  it('test_parsePrompt_splitsKeyActionPairs', () => {
    expect(parsePrompt('Mouse: girar · Q/E: passo')).toEqual([{ key: 'Mouse', action: 'girar' }, { key: 'Q/E', action: 'passo' }]);
    expect(parsePrompt(null)).toEqual([]);
  });
});
