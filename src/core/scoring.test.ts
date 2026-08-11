import { describe, expect, it } from 'vitest';
import { bestScoringDecomposition, scoreWin, WIN_BONUS } from './scoring';
import { kindIndex, NUM_KINDS } from './types';
import type { Color, Rank } from './types';

const K = (rank: Rank, color: Color) => kindIndex(rank, color);

function counts(...kinds: number[]): number[] {
  const c = new Array<number>(NUM_KINDS).fill(0);
  for (const k of kinds) c[k]++;
  return c;
}

describe('bestScoringDecomposition', () => {
  it('returns null for non-decomposable counts', () => {
    expect(bestScoringDecomposition(counts(K('advisor', 'red')))).toBeNull();
  });
  it('scores a concealed khạp at 6', () => {
    const r = bestScoringDecomposition(
      counts(K('horse', 'red'), K('horse', 'red'), K('horse', 'red')),
    );
    expect(r?.lenh).toBe(6);
  });
  it('prefers the higher-lệnh decomposition', () => {
    // 3 pawns of one color + 3 of another: could be 2 pawns3 runs? No —
    // runs need distinct colors. Two triples = 12 lệnh.
    const r = bestScoringDecomposition(
      counts(
        K('pawn', 'red'), K('pawn', 'red'), K('pawn', 'red'),
        K('pawn', 'green'), K('pawn', 'green'), K('pawn', 'green'),
      ),
    );
    expect(r?.lenh).toBe(12);
  });
});

describe('scoreWin', () => {
  it('adds the win bonus and demotes the meld holding the won card', () => {
    // Hand after claiming: triple of Pháo đỏ where the claimed card completed
    // it → scored as exposed (1), not khạp (6).
    const hand = counts(K('cannon', 'red'), K('cannon', 'red'), K('cannon', 'red'));
    const score = scoreWin(0, [], [], hand, K('cannon', 'red'));
    expect(score.lenh).toBe(1 + WIN_BONUS);
    // Same hand dealt outright (thiên tới): full khạp value.
    const dealt = scoreWin(0, [], [], hand, null);
    expect(dealt.lenh).toBe(6 + WIN_BONUS);
  });
  it('scores exposed melds at exposed value', () => {
    const score = scoreWin(
      1,
      [{ kind: 'quad', uses: [K('horse', 'white'), K('horse', 'white'), K('horse', 'white'), K('horse', 'white')] }],
      [],
      counts(K('general', 'red')),
      null,
    );
    // exposed quad 6 + lone general 1 + win bonus
    expect(score.lenh).toBe(6 + 1 + WIN_BONUS);
  });
  it('scores declared face-down sets at concealed value', () => {
    const k = K('cannon', 'yellow');
    const score = scoreWin(2, [], [{ kind: 'triple', uses: [k, k, k] }], counts(K('general', 'red')), null);
    // declared khạp 6 + lone general 1 + win bonus
    expect(score.lenh).toBe(6 + 1 + WIN_BONUS);
  });
});
