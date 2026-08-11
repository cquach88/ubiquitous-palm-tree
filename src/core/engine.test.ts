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
import { DECK_SIZE, toCounts } from './types';

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

  it('supports 3-player tables with a bigger wall', () => {
    const g = newGame({ seed: 9, dealer: 1, players: 3 });
    expect(g.players.length).toBe(3);
    expect(g.players.map((p) => p.hand.length)).toEqual([20, 21, 20]);
    expect(g.wall.length).toBe(DECK_SIZE - (3 * HAND_SIZE + 1));
    expect(totalCards(g)).toBe(DECK_SIZE);
    expect(() => newGame({ seed: 1, players: 2 })).toThrow();
    expect(() => newGame({ seed: 1, players: 5 })).toThrow();
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

  it('offers pair capture on own wall flips', () => {
    outer: for (let seed = 1; seed < 400; seed++) {
      let g = newGame({ seed, dealer: 0 });
      if (g.phase.type !== 'discard') continue;
      for (let step = 0; step < 200; step++) {
        if (g.phase.type === 'finished') continue outer;
        if (g.phase.type === 'respond' && g.phase.source === 'wall') {
          const pair = legalEats(g).find((o) => o.kind === 'pair');
          if (pair) {
            // Take the pair: it must expose a 2-card meld and lead to a discard.
            const player = g.phase.player;
            g = applyAction(g, { type: 'eat', player, option: pair });
            const meld = g.players[player].melds[g.players[player].melds.length - 1];
            expect(meld.kind).toBe('pair');
            expect(meld.cards.length).toBe(2);
            expect(g.phase).toEqual({ type: 'discard', player });
            expect(totalCards(g)).toBe(DECK_SIZE);
            return;
          }
        }
        g = applyAction(g, aiChooseAction(g));
      }
    }
    throw new Error('No wall-flip pair opportunity found across seeds');
  });

  it('never offers pair capture on discard-source offers', () => {
    let checkedDiscards = 0;
    for (let seed = 1; seed <= 10; seed++) {
      let g = newGame({ seed, dealer: seed % 4 });
      let steps = 0;
      while (g.phase.type !== 'finished' && steps++ < 2000) {
        if (g.phase.type === 'respond' && g.phase.source === 'discard') {
          expect(legalEats(g).some((o) => o.kind === 'pair')).toBe(false);
          checkedDiscards++;
        }
        g = applyAction(g, aiChooseAction(g));
      }
    }
    expect(checkedDiscards).toBeGreaterThan(50);
  });

  it('lets a player set down a face-down set without consuming a turn', () => {
    for (let seed = 1; seed < 300; seed++) {
      const g0 = newGame({ seed, dealer: 0 });
      if (g0.phase.type !== 'discard') continue;
      const counts = toCounts(g0.players[0].hand);
      const k = counts.findIndex((c) => c >= 3);
      if (k < 0) continue;
      const g = applyAction(g0, {
        type: 'declare',
        player: 0,
        option: { kind: 'triple', fromHand: [k, k, k] },
      });
      expect(g.players[0].declared.length).toBe(1);
      expect(g.players[0].declared[0].cards.length).toBe(3);
      expect(g.players[0].hand.length).toBe(g0.players[0].hand.length - 3);
      expect(g.phase).toEqual(g0.phase); // no turn consumed
      expect(ownedCards(g, 0)).toBe(HAND_SIZE + 1); // dealer, pre-discard
      expect(totalCards(g)).toBe(DECK_SIZE);
      // A pair is not declarable; missing cards are rejected.
      expect(() =>
        applyAction(g, { type: 'declare', player: 0, option: { kind: 'pair', fromHand: [k, k] } }),
      ).toThrow();
      const absent = toCounts(g.players[0].hand).findIndex((c) => c === 0);
      expect(() =>
        applyAction(g, {
          type: 'declare',
          player: 0,
          option: { kind: 'triple', fromHand: [absent, absent, absent] },
        }),
      ).toThrow();
      return;
    }
    throw new Error('No dealt triple found across seeds — suspicious');
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
