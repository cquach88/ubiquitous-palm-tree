import { describe, expect, it } from 'vitest';
import {
  applyAction,
  legalEats,
  newGame,
  ownedCards,
  totalCards,
  HAND_SIZE,
  NUM_PLAYERS,
} from './engine';
import { aiChooseAction } from './ai';
import { DECK_SIZE } from './types';

describe('newGame', () => {
  it('deals 21 to the dealer and 20 to others, rest to the wall', () => {
    const g = newGame({ seed: 42, dealer: 2 });
    for (let p = 0; p < NUM_PLAYERS; p++) {
      expect(g.players[p].hand.length).toBe(p === 2 ? HAND_SIZE + 1 : HAND_SIZE);
    }
    expect(g.wall.length).toBe(DECK_SIZE - (4 * HAND_SIZE + 1));
    expect(totalCards(g)).toBe(DECK_SIZE);
    if (g.phase.type !== 'finished') {
      expect(g.phase).toEqual({ type: 'discard', player: 2 });
    }
  });
});

describe('game flow', () => {
  it('discard offers to the next player; pass burns and flips the wall', () => {
    let g = newGame({ seed: 7, dealer: 0 });
    expect(g.phase.type).toBe('discard');
    const card = g.players[0].hand[0];
    g = applyAction(g, { type: 'discard', player: 0, cardId: card.id });
    expect(totalCards(g)).toBe(DECK_SIZE);
    if (g.phase.type === 'respond') {
      expect(g.phase.player).toBe(1);
      expect(g.offered?.id).toBe(card.id);
      const wallBefore = g.wall.length;
      g = applyAction(g, { type: 'pass', player: 1 });
      expect(totalCards(g)).toBe(DECK_SIZE);
      if (g.phase.type === 'respond') {
        // burned the discard, flipped a wall card for the same player
        expect(g.dead.map((c) => c.id)).toContain(card.id);
        expect(g.wall.length).toBe(wallBefore - 1);
        expect(g.phase.source).toBe('wall');
        expect(g.phase.player).toBe(1);
      }
    }
  });

  it('capturing exposes a meld and requires a discard', () => {
    // Find a seed where the responder has a capture available early.
    outer: for (let seed = 1; seed < 300; seed++) {
      let g = newGame({ seed, dealer: 0 });
      if (g.phase.type !== 'discard') continue;
      for (let step = 0; step < 40; step++) {
        if (g.phase.type === 'finished') continue outer;
        if (g.phase.type === 'respond') {
          const eats = legalEats(g);
          if (eats.length > 0) {
            const player = g.phase.player;
            const owned = ownedCards(g, player);
            g = applyAction(g, { type: 'eat', player, option: eats[0] });
            expect(g.players[player].melds.length).toBeGreaterThan(0);
            expect(g.phase).toEqual({ type: 'discard', player });
            // owned +1 (the captured card), discard brings it back to 20/21
            expect(ownedCards(g, player)).toBe(owned + 1);
            expect(totalCards(g)).toBe(DECK_SIZE);
            return;
          }
        }
        g = applyAction(g, aiChooseAction(g));
      }
    }
    throw new Error('No capture found across seeds — suspicious');
  });

  it('rejects illegal actions', () => {
    const g = newGame({ seed: 3, dealer: 0 });
    if (g.phase.type !== 'discard') return;
    expect(() => applyAction(g, { type: 'discard', player: 1, cardId: 0 })).toThrow();
    expect(() => applyAction(g, { type: 'pass', player: 0 })).toThrow();
    expect(() =>
      applyAction(g, { type: 'discard', player: 0, cardId: g.players[1].hand[0].id }),
    ).toThrow();
  });
});
