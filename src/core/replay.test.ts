import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aiChooseAction } from './ai';
import { applyAction, newGame } from './engine';
import type { Action } from './engine';
import { decodeActions, encodeActions, replay } from './replay';

describe('action codec', () => {
  it('round-trips every action type', () => {
    const actions: Action[] = [
      { type: 'discard', player: 0, cardId: 57 },
      { type: 'pass', player: 3 },
      { type: 'eat', player: 2, option: { kind: 'triple', fromHand: [16, 16] } },
      { type: 'eat', player: 1, option: { kind: 'pawns4', fromHand: [24, 25, 27] } },
    ];
    expect(decodeActions(encodeActions(actions))).toEqual(actions);
    expect(decodeActions('')).toEqual([]);
  });
});

describe('replay', () => {
  it('reproduces a recorded AI game exactly', () => {
    const seed = 77;
    let g = newGame({ seed, dealer: 1 });
    const actions: Action[] = [];
    while (g.phase.type !== 'finished') {
      const a = aiChooseAction(g);
      actions.push(a);
      g = applyAction(g, a);
    }
    const result = replay(seed, 1, decodeActions(encodeActions(actions)));
    expect(result.error).toBeUndefined();
    expect(result.applied).toBe(actions.length);
    expect(result.cardsIntact).toBe(true);
    expect(result.state.phase).toEqual(g.phase);
  });

  it('captures a failing action instead of throwing', () => {
    const result = replay(5, 0, [{ type: 'pass', player: 2 }]);
    expect(result.applied).toBe(0);
    expect(result.failedAction).toBe('p2');
    expect(result.error).toBeTruthy();
    expect(result.cardsIntact).toBe(true);
  });
});

/**
 * Replay a bug report captured by the web app's error logger:
 *   REPLAY_REPORT=report.json npm test -- replay
 * The report may be the raw JSON block from a GitHub issue.
 */
const reportFile = process.env.REPLAY_REPORT;
describe.runIf(!!reportFile)('replay bug report', () => {
  it(`replays ${reportFile}`, () => {
    const report = JSON.parse(readFileSync(reportFile!, 'utf8'));
    const result = replay(Number(report.seed), Number(report.dealer), decodeActions(String(report.actions ?? '')));
    // eslint-disable-next-line no-console
    console.log('[replay-report]', {
      applied: result.applied,
      failedAction: result.failedAction ?? null,
      error: result.error ?? null,
      finalPhase: result.finalPhase,
      cardsIntact: result.cardsIntact,
      reportedErrors: (report.errors ?? []).map((e: { message: string }) => e.message),
    });
    expect(result.cardsIntact).toBe(true);
  });
});
