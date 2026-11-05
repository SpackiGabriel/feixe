import { describe, it, expect } from 'vitest';
import { evaluateDoorRule, isBlockerHit } from '../../src/gameplay/door-logic.js';

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

describe('evaluateDoorRule — NOT (trap blockers, spec §7)', () => {
  it('test_evaluateDoorRule_satisfiedButTrapHit_keepsDoorClosed', () => {
    expect(evaluateDoorRule([true], 'AND', [true])).toBe(false);
    expect(evaluateDoorRule([true, false], 'OR', [false, true])).toBe(false);
  });

  it('test_evaluateDoorRule_satisfiedAndNoTrapHit_opensDoor', () => {
    expect(evaluateDoorRule([true], 'AND', [false])).toBe(true);
  });
});

describe('isBlockerHit', () => {
  const seg = { type: 'blocker' };
  it('test_isBlockerHit_traceEndingOnThisBlocker_isHit', () => {
    expect(isBlockerHit([{ status: 'hit-receiver', segment: {} }, { status: 'blocked', segment: seg }], seg)).toBe(true);
  });
  it('test_isBlockerHit_traceEndingOnOtherBlocker_isNotHit', () => {
    expect(isBlockerHit([{ status: 'blocked', segment: { type: 'blocker' } }], seg)).toBe(false);
  });
});
