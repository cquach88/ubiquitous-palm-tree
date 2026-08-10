import { describe, expect, it } from 'vitest';
import { applyAction, newGame, totalCards, ownedCards, NUM_PLAYERS, HAND_SIZE } from './engine';
import { aiChooseAction } from './ai';
import { toCounts, DECK_SIZE } from './types';
import { fullyDecomposes } from './melds';

/**
 * Fuzz: play full AI-vs-AI games across many seeds and assert invariants at
 * every step. This exercises the whole engine (deal, discard, capture, wall
 * flips, relays, wins, draws).
 */
describe('simulated games', () => {
  it('plays 200 seeded games to completion with invariants intact', () => {
    let wins = 0;
    let draws = 0;
    for (let seed = 1; seed <= 200; seed++) {
      let g = newGame({ seed, dealer: seed % NUM_PLAYERS });
      let steps = 0;
      while (g.phase.type !== 'finished') {
        expect(totalCards(g)).toBe(DECK_SIZE);
        if (g.phase.type === 'respond') {
          // While responding, the responder still owns 20 (21 for pre-discard dealer never responds)
          expect(ownedCards(g, g.phase.player)).toBe(HAND_SIZE);
        }
        g = applyAction(g, aiChooseAction(g));
        steps++;
        expect(steps).toBeLessThan(5000);
      }
      expect(totalCards(g)).toBe(DECK_SIZE);
      if (g.phase.winner !== null) {
        wins++;
        // Winner's final hand (incl. claimed card) must fully decompose.
        const winnerHand = g.players[g.phase.winner].hand;
        if (g.phase.reason !== 'dealt-win') {
          expect(ownedCards(g, g.phase.winner)).toBe(HAND_SIZE + 1);
        }
        expect(fullyDecomposes(toCounts(winnerHand))).toBe(true);
        expect(g.phase.score).not.toBeNull();
        expect(g.phase.score!.lenh).toBeGreaterThanOrEqual(3);
      } else {
        draws++;
        expect(g.wall.length).toBe(0);
      }
    }
    // Sanity: with these rules most games should end in a win, not a draw.
    expect(wins + draws).toBe(200);
    expect(wins).toBeGreaterThan(50);
  }, 120_000);
});
