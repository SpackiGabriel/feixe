import { describe, it, expect } from 'vitest';
import { evaluateDoorRule } from '../../src/gameplay/door-logic.js';

describe('evaluateDoorRule', () => {
  it('test_evaluateDoorRule_andWithAllReceiversActive_opensDoor', () => {
    expect(evaluateDoorRule([true, true, true], 'AND')).toBe(true);
  });

  it('test_evaluateDoorRule_andWithOneReceiverInactive_keepsDoorClosed', () => {
    expect(evaluateDoorRule([true, false, true], 'AND')).toBe(false);
  });

  it('test_evaluateDoorRule_andWithNoReceivers_keepsDoorClosed', () => {
    // An AND door with no receivers to satisfy should never spontaneously open.
    expect(evaluateDoorRule([], 'AND')).toBe(false);
  });

  it('test_evaluateDoorRule_orWithOneReceiverActive_opensDoor', () => {
    expect(evaluateDoorRule([false, true, false], 'OR')).toBe(true);
  });

  it('test_evaluateDoorRule_orWithNoReceiversActive_keepsDoorClosed', () => {
    expect(evaluateDoorRule([false, false], 'OR')).toBe(false);
  });

  it('test_evaluateDoorRule_unknownRule_throws', () => {
    expect(() => evaluateDoorRule([true], 'XOR')).toThrow();
  });
});
