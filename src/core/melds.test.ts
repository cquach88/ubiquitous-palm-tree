import { describe, expect, it } from 'vitest';
import {
  bestCover,
  bestCoverGroups,
  eatOptions,
  fullyDecomposes,
  leftoverCount,
  winsWith,
} from './melds';
import { buildDeck, kindIndex, NUM_KINDS, toCounts, DECK_SIZE } from './types';
import type { Color, Rank } from './types';

function counts(...kinds: number[]): number[] {
  const c = new Array<number>(NUM_KINDS).fill(0);
  for (const k of kinds) c[k]++;
  return c;
}

const K = (rank: Rank, color: Color) => kindIndex(rank, color);

describe('deck', () => {
  it('has 112 cards, 4 copies of each of 28 kinds', () => {
    const deck = buildDeck();
    expect(deck.length).toBe(DECK_SIZE);
    const c = toCounts(deck);
    expect(c.length).toBe(NUM_KINDS);
    expect(c.every((n) => n === 4)).toBe(true);
    expect(new Set(deck.map((card) => card.id)).size).toBe(DECK_SIZE);
  });
});

describe('fullyDecomposes', () => {
  it('accepts an empty hand', () => {
    expect(fullyDecomposes(counts())).toBe(true);
  });
  it('accepts a pair', () => {
    expect(fullyDecomposes(counts(K('horse', 'red'), K('horse', 'red')))).toBe(true);
  });
  it('rejects two different cards', () => {
    expect(fullyDecomposes(counts(K('horse', 'red'), K('horse', 'green')))).toBe(false);
  });
  it('accepts a lone general but not a lone advisor', () => {
    expect(fullyDecomposes(counts(K('general', 'white')))).toBe(true);
    expect(fullyDecomposes(counts(K('advisor', 'white')))).toBe(false);
  });
  it('accepts Tướng-Sĩ-Tượng of one color only', () => {
    expect(
      fullyDecomposes(counts(K('general', 'red'), K('advisor', 'red'), K('elephant', 'red'))),
    ).toBe(true);
    expect(
      fullyDecomposes(counts(K('general', 'red'), K('advisor', 'green'), K('elephant', 'red'))),
    ).toBe(false);
  });
  it('accepts Xe-Pháo-Mã of one color', () => {
    expect(
      fullyDecomposes(counts(K('chariot', 'yellow'), K('cannon', 'yellow'), K('horse', 'yellow'))),
    ).toBe(true);
  });
  it('accepts 3 and 4 pawns of distinct colors, rejects duplicates', () => {
    expect(
      fullyDecomposes(counts(K('pawn', 'red'), K('pawn', 'green'), K('pawn', 'white'))),
    ).toBe(true);
    expect(
      fullyDecomposes(
        counts(K('pawn', 'red'), K('pawn', 'green'), K('pawn', 'white'), K('pawn', 'yellow')),
      ),
    ).toBe(true);
    expect(
      fullyDecomposes(counts(K('pawn', 'red'), K('pawn', 'red'), K('pawn', 'green'))),
    ).toBe(false);
  });
  it('handles interaction between runs and sets', () => {
    // Xe Xe Pháo Mã (all red): pair of Xe cannot coexist with the run,
    // so this does NOT fully decompose...
    expect(
      fullyDecomposes(
        counts(K('chariot', 'red'), K('chariot', 'red'), K('cannon', 'red'), K('horse', 'red')),
      ),
    ).toBe(false);
    // ...but Xe Xe Pháo Pháo Mã Mã does (three pairs) and so does
    // Xe Xe Xe Pháo Pháo Pháo Mã Mã Mã (three triples or three runs).
    expect(
      fullyDecomposes(
        counts(
          K('chariot', 'red'), K('chariot', 'red'),
          K('cannon', 'red'), K('cannon', 'red'),
          K('horse', 'red'), K('horse', 'red'),
        ),
      ),
    ).toBe(true);
  });
});

describe('bestCover / leftoverCount', () => {
  it('counts uncoverable cards', () => {
    const c = counts(
      K('pawn', 'red'), K('pawn', 'red'), K('pawn', 'green'), // pair + 1 stray? or pawns3 needs distinct
      K('advisor', 'yellow'),
    );
    // Best: pair of red pawns (2 covered); green pawn + yellow advisor stray.
    expect(bestCover(c)).toBe(2);
    expect(leftoverCount(c)).toBe(2);
  });
  it('prefers the larger cover', () => {
    const c = counts(
      K('chariot', 'red'), K('chariot', 'red'),
      K('cannon', 'red'), K('horse', 'red'),
    );
    // Run covers 3 (leaving one Xe) vs pair covers 2 — cover picks 3.
    expect(bestCover(c)).toBe(3);
    expect(leftoverCount(c)).toBe(1);
  });
  it('treats a lone general as covered', () => {
    expect(leftoverCount(counts(K('general', 'green')))).toBe(0);
  });
});

describe('bestCoverGroups', () => {
  it('returns a grouping matching bestCover, with leftovers listed', () => {
    const c = counts(
      K('chariot', 'red'), K('chariot', 'red'),
      K('cannon', 'red'), K('horse', 'red'),
      K('advisor', 'yellow'),
    );
    const g = bestCoverGroups(c);
    expect(g.covered).toBe(bestCover(c));
    expect(g.covered).toBe(3); // Xe-Pháo-Mã run
    const meldCards = g.melds.reduce((s, m) => s + m.uses.length, 0);
    expect(meldCards).toBe(g.covered);
    expect(g.leftovers.length).toBe(2); // spare Xe + lone Sĩ
    expect(g.leftovers).toContain(K('chariot', 'red'));
    expect(g.leftovers).toContain(K('advisor', 'yellow'));
  });
  it('covers a fully-decomposable hand completely', () => {
    const c = counts(
      K('general', 'red'), K('advisor', 'red'), K('elephant', 'red'),
      K('pawn', 'red'), K('pawn', 'green'), K('pawn', 'white'),
    );
    const g = bestCoverGroups(c);
    expect(g.covered).toBe(6);
    expect(g.leftovers).toEqual([]);
  });
});

describe('winsWith', () => {
  it('completes a pair for the win', () => {
    const hand = counts(K('advisor', 'red'));
    expect(winsWith(hand, K('advisor', 'red'))).toBe(true);
    expect(winsWith(hand, K('advisor', 'green'))).toBe(false);
  });
  it('completes a run for the win', () => {
    const hand = counts(K('chariot', 'white'), K('cannon', 'white'));
    expect(winsWith(hand, K('horse', 'white'))).toBe(true);
    expect(winsWith(hand, K('horse', 'red'))).toBe(false);
  });
});

describe('eatOptions', () => {
  it('offers pair, triple, and quad from identical cards', () => {
    const hand = counts(K('cannon', 'green'), K('cannon', 'green'), K('cannon', 'green'));
    const opts = eatOptions(hand, K('cannon', 'green'), 10);
    expect(opts.map((o) => o.kind).sort()).toEqual(['pair', 'quad', 'triple']);
    const single = counts(K('cannon', 'green'));
    expect(eatOptions(single, K('cannon', 'green'), 10).map((o) => o.kind)).toEqual(['pair']);
  });
  it('offers runs', () => {
    const hand = counts(K('general', 'red'), K('elephant', 'red'));
    const opts = eatOptions(hand, K('advisor', 'red'), 10);
    expect(opts.map((o) => o.kind)).toEqual(['tst']);
  });
  it('offers pawn sets of distinct colors', () => {
    const hand = counts(K('pawn', 'green'), K('pawn', 'white'), K('pawn', 'yellow'));
    const opts = eatOptions(hand, K('pawn', 'red'), 10);
    const kinds = opts.map((o) => o.kind).sort();
    expect(kinds).toEqual(['pawns3', 'pawns3', 'pawns3', 'pawns4']);
  });
  it('forbids captures that leave nothing to discard', () => {
    const hand = counts(K('cannon', 'green'), K('cannon', 'green'));
    // Hand of 2: the triple (consumes both) would leave nothing to discard.
    expect(eatOptions(hand, K('cannon', 'green'), 2).map((o) => o.kind)).toEqual(['pair']);
    expect(eatOptions(hand, K('cannon', 'green'), 3).map((o) => o.kind).sort()).toEqual([
      'pair',
      'triple',
    ]);
    expect(eatOptions(counts(K('cannon', 'green')), K('cannon', 'green'), 1)).toEqual([]);
  });
  it('allows pairing any offered card with an identical hand card', () => {
    const one = counts(K('horse', 'white'));
    // Both discards and own wall flips can be paired.
    expect(eatOptions(one, K('horse', 'white'), 10)).toEqual([
      { kind: 'pair', fromHand: [K('horse', 'white')] },
    ]);
    expect(eatOptions(one, K('horse', 'white'), 10, true)).toEqual([
      { kind: 'pair', fromHand: [K('horse', 'white')] },
    ]);
    const two = counts(K('horse', 'white'), K('horse', 'white'));
    expect(eatOptions(two, K('horse', 'white'), 10).map((o) => o.kind).sort()).toEqual(
      ['pair', 'triple'],
    );
    // Pairing still requires a card left to discard.
    expect(eatOptions(one, K('horse', 'white'), 1, true)).toEqual([]);
  });
  it('offers both the run and the pair on a discarded set member', () => {
    // Hand: Tướng vàng, Sĩ vàng ×2, Tượng vàng — a discarded Tượng vàng can be
    // paired (keeping the Sĩ pair and lone Tướng) or taken into the run.
    const hand = counts(
      K('general', 'yellow'),
      K('advisor', 'yellow'), K('advisor', 'yellow'),
      K('elephant', 'yellow'),
    );
    const kinds = eatOptions(hand, K('elephant', 'yellow'), 20).map((o) => o.kind).sort();
    expect(kinds).toEqual(['pair', 'tst']);
  });
  it('allows playing a lone Tướng from own wall flip only', () => {
    const empty = counts();
    const wall = eatOptions(empty, K('general', 'red'), 10, true);
    expect(wall).toContainEqual({ kind: 'loneGeneral', fromHand: [] });
    expect(eatOptions(empty, K('general', 'red'), 10)).toEqual([]);
    // Not for other ranks.
    expect(
      eatOptions(empty, K('advisor', 'red'), 10, true).some((o) => o.kind === 'loneGeneral'),
    ).toBe(false);
  });
});
