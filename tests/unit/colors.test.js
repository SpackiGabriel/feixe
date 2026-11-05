import { describe, it, expect } from 'vitest';
import { symbolsFor, PRIMARY_SYMBOLS, COLOR_NAMES } from '../../src/gameplay/colors.js';

describe('symbolsFor', () => {
  it('test_symbolsFor_primaries_haveDistinctSymbols', () => {
    expect(new Set(Object.values(PRIMARY_SYMBOLS)).size).toBe(3);
    expect(symbolsFor('red')).toEqual([PRIMARY_SYMBOLS.red]);
  });

  it('test_symbolsFor_composite_showsEveryComponent', () => {
    expect(symbolsFor('magenta')).toEqual([PRIMARY_SYMBOLS.red, PRIMARY_SYMBOLS.blue]);
    expect(symbolsFor('white')).toHaveLength(3);
  });

  it('test_symbolsFor_everyNamedColor_isDistinguishableBySymbolsAlone', () => {
    const keys = Object.keys(COLOR_NAMES).map((name) => symbolsFor(name).join('+'));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
