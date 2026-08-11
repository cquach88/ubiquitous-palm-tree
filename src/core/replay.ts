/**
 * Deterministic replay support for bug reports.
 *
 * A game is fully determined by (seed, dealer, action list). Error reports
 * from the web app include the action history in the compact encoding below,
 * so a reported failure can be reproduced exactly:
 *
 *   REPLAY_REPORT=path/to/report.json npm test -- replay
 *
 * Encoding (space-separated tokens):
 *   d<player>:<cardId>                    discard
 *   e<player>:<meldKind>:<k>.<k>[.<k>]    capture (kind indices from hand)
 *   s<player>:<meldKind>:<k>.<k>.<k>      set down a face-down set (declare)
 *   p<player>                             pass
 */

import type { Action, GameState } from './engine';
import { applyAction, newGame, totalCards } from './engine';
import type { EatOption, MeldKind } from './melds';
import { DECK_SIZE } from './types';

export function encodeAction(a: Action): string {
  switch (a.type) {
    case 'discard':
      return `d${a.player}:${a.cardId}`;
    case 'eat':
      return `e${a.player}:${a.option.kind}:${a.option.fromHand.join('.')}`;
    case 'declare':
      return `s${a.player}:${a.option.kind}:${a.option.fromHand.join('.')}`;
    case 'pass':
      return `p${a.player}`;
  }
}

export function encodeActions(actions: readonly Action[]): string {
  return actions.map(encodeAction).join(' ');
}

export function decodeAction(token: string): Action {
  const type = token[0];
  if (type === 'p') {
    return { type: 'pass', player: Number(token.slice(1)) };
  }
  if (type === 'd') {
    const [player, cardId] = token.slice(1).split(':');
    return { type: 'discard', player: Number(player), cardId: Number(cardId) };
  }
  if (type === 'e' || type === 's') {
    const [player, kind, fromHand] = token.slice(1).split(':');
    const option: EatOption = {
      kind: kind as MeldKind,
      // Empty fromHand = a capture that consumes no hand cards (lone Tướng).
      fromHand: fromHand ? fromHand.split('.').map(Number) : [],
    };
    return { type: type === 'e' ? 'eat' : 'declare', player: Number(player), option };
  }
  throw new Error(`Unparseable action token: ${token}`);
}

export function decodeActions(encoded: string): Action[] {
  const trimmed = encoded.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s+/).map(decodeAction);
}

export interface ReplayResult {
  /** Number of actions applied successfully. */
  applied: number;
  /** The action that failed, if any (encoded). */
  failedAction?: string;
  /** Error message from the failing action. */
  error?: string;
  /** Phase after the last successful action. */
  finalPhase: string;
  /** Card-conservation check after the last successful action. */
  cardsIntact: boolean;
  state: GameState;
}

function phaseLabel(state: GameState): string {
  const p = state.phase;
  if (p.type === 'finished') return `finished winner=${p.winner ?? 'draw'} (${p.reason})`;
  return `${p.type} player=${p.player}`;
}

/**
 * Rebuild a game from a report and apply its actions. Never throws — a
 * failure is captured in the result so tooling can print exactly where the
 * engine rejected an action.
 */
export function replay(
  seed: number,
  dealer: number,
  actions: readonly Action[],
  players = 4,
): ReplayResult {
  let state = newGame({ seed, dealer, players });
  let applied = 0;
  for (const action of actions) {
    try {
      state = applyAction(state, action);
      applied++;
    } catch (err) {
      return {
        applied,
        failedAction: encodeAction(action),
        error: err instanceof Error ? err.message : String(err),
        finalPhase: phaseLabel(state),
        cardsIntact: totalCards(state) === DECK_SIZE,
        state,
      };
    }
  }
  return {
    applied,
    finalPhase: phaseLabel(state),
    cardsIntact: totalCards(state) === DECK_SIZE,
    state,
  };
}
