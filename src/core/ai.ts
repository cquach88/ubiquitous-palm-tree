/**
 * Heuristic AI. Its yardstick is `leftoverCount` — the number of hand cards
 * that cannot be fitted into any meld. Fewer leftovers ≈ closer to winning.
 */

import type { Action, GameState } from './engine';
import { legalEats } from './engine';
import type { EatOption } from './melds';
import { leftoverCount } from './melds';
import { toCounts, kindOf, NUM_KINDS } from './types';
import type { Card } from './types';

/** Best discard from `counts`: the kind whose removal leaves the fewest leftovers. */
function bestDiscardKind(counts: number[]): { kind: number; leftover: number } {
  let bestKind = -1;
  let bestLeftover = Infinity;
  let bestCopies = Infinity;
  for (let k = 0; k < NUM_KINDS; k++) {
    if (counts[k] === 0) continue;
    counts[k]--;
    const left = leftoverCount(counts);
    counts[k]++;
    // Prefer strictly fewer leftovers; among ties, discard from the kind we
    // hold fewest copies of (don't break pairs/triples needlessly).
    if (left < bestLeftover || (left === bestLeftover && counts[k] < bestCopies)) {
      bestLeftover = left;
      bestCopies = counts[k];
      bestKind = k;
    }
  }
  return { kind: bestKind, leftover: bestLeftover };
}

function cardOfKind(hand: Card[], kind: number): Card {
  const card = hand.find((c) => kindOf(c) === kind);
  if (!card) throw new Error('AI chose a kind not in hand');
  return card;
}

function evalEat(counts: number[], option: EatOption): number {
  for (const k of option.fromHand) counts[k]--;
  const { leftover } = bestDiscardKind(counts);
  for (const k of option.fromHand) counts[k]++;
  return leftover;
}

export function aiChooseAction(state: GameState): Action {
  const phase = state.phase;

  if (phase.type === 'discard') {
    const hand = state.players[phase.player].hand;
    const { kind } = bestDiscardKind(toCounts(hand));
    return { type: 'discard', player: phase.player, cardId: cardOfKind(hand, kind).id };
  }

  if (phase.type === 'respond') {
    const player = phase.player;
    const hand = state.players[player].hand;
    const counts = toCounts(hand);
    const options = legalEats(state);

    // Always take a quad (quằn) — it is worth a lot of lệnh.
    const quad = options.find((o) => o.kind === 'quad');
    if (quad) return { type: 'eat', player, option: quad };

    const current = leftoverCount(counts);
    let best: EatOption | null = null;
    let bestLeftover = current;
    for (const o of options) {
      const left = evalEat(counts, o);
      if (left < bestLeftover) {
        bestLeftover = left;
        best = o;
      }
    }
    if (best) return { type: 'eat', player, option: best };
    return { type: 'pass', player };
  }

  throw new Error('Game already finished');
}
