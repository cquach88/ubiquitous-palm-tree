/**
 * Tứ Sắc game state machine.
 *
 * The engine is a pure reducer: `applyAction(state, action)` returns a new
 * state and never touches the DOM or any platform API. Any UI (web, React
 * Native, …) drives it by rendering the state and dispatching actions.
 *
 * Flow implemented (see README for notes on simplifications):
 *  - The dealer (21 cards) opens by discarding one card.
 *  - A discarded card is offered to the next player, who may capture it
 *    ("ăn") into a meld of 3+ cards and then discard, or pass.
 *  - On a pass, the offered card is dead; the passer flips the top of the
 *    wall ("bốc nọc"). They may capture the flipped card — including into a
 *    bare pair with an identical hand card ("chui đôi"), allowed only on
 *    one's own wall flip — then discard, or pass it on to the next player,
 *    who treats it like a discard.
 *  - Whenever a card is offered, any player whose hand it completes wins
 *    immediately ("tới") — checked in seat order starting from the player
 *    the card is offered to. Winning beats capturing.
 *  - If the wall runs out, the round is a draw (hòa).
 */

import type { Card } from './types';
import { buildDeck, toCounts, kindOf } from './types';
import { mulberry32, shuffle } from './rng';
import type { EatOption, MeldKind } from './melds';
import { eatOptions, fullyDecomposes, winsWith } from './melds';
import type { ScoreResult } from './scoring';
import { scoreWin } from './scoring';

/** Maximum seats at the table; games may be played with 3 or 4. */
export const NUM_PLAYERS = 4;
export const MIN_PLAYERS = 3;
export const HAND_SIZE = 20; // dealer gets 21

export type Source = 'discard' | 'wall';

export interface ExposedMeld {
  kind: MeldKind;
  cards: Card[];
}

export interface PlayerState {
  hand: Card[];
  melds: ExposedMeld[];
}

/**
 * Locale-independent record of what happened. UIs format these into
 * human-readable text in whatever language they present.
 */
export type LogEvent =
  | { type: 'new-game'; dealer: number }
  | { type: 'dealt-win'; player: number }
  | { type: 'discard'; player: number; kind: number }
  | { type: 'draw'; player: number; kind: number } // flipped from the wall
  | { type: 'relay'; player: number; kind: number } // declined a wall card
  | { type: 'eat'; player: number; kind: number; meld: MeldKind }
  | { type: 'win'; player: number; kind: number; lenh: number }
  | { type: 'wall-empty' };

export type Phase =
  | { type: 'discard'; player: number }
  | { type: 'respond'; player: number; source: Source; offerId: number }
  | {
      type: 'finished';
      winner: number | null; // null = draw
      score: ScoreResult | null;
      reason: 'win' | 'dealt-win' | 'wall-empty';
    };

export interface GameState {
  seed: number;
  dealer: number;
  players: PlayerState[];
  wall: Card[];
  /** Passed-over cards, face up, most recent last. */
  dead: Card[];
  /** The card currently on offer (during 'respond'), or null. */
  offered: Card | null;
  phase: Phase;
  log: LogEvent[];
  offerCounter: number;
}

export type Action =
  | { type: 'discard'; player: number; cardId: number }
  | { type: 'eat'; player: number; option: EatOption }
  | { type: 'pass'; player: number };

export function nextPlayer(p: number, count: number = NUM_PLAYERS): number {
  return (p + 1) % count;
}

export function newGame(opts: { seed: number; dealer?: number; players?: number }): GameState {
  const count = opts.players ?? NUM_PLAYERS;
  if (count < MIN_PLAYERS || count > NUM_PLAYERS) {
    throw new Error(`players must be between ${MIN_PLAYERS} and ${NUM_PLAYERS}`);
  }
  const dealer = (opts.dealer ?? 0) % count;
  const rng = mulberry32(opts.seed);
  const deck = shuffle(buildDeck(), rng);

  const players: PlayerState[] = [];
  let cursor = 0;
  for (let p = 0; p < count; p++) {
    const n = p === dealer ? HAND_SIZE + 1 : HAND_SIZE;
    players.push({ hand: sortHand(deck.slice(cursor, cursor + n)), melds: [] });
    cursor += n;
  }
  const wall = deck.slice(cursor);

  const state: GameState = {
    seed: opts.seed,
    dealer,
    players,
    wall,
    dead: [],
    offered: null,
    phase: { type: 'discard', player: dealer },
    log: [{ type: 'new-game', dealer }],
    offerCounter: 0,
  };

  // Thiên tới: the dealer's 21 dealt cards already form a winning hand.
  if (fullyDecomposes(toCounts(players[dealer].hand))) {
    state.log.push({ type: 'dealt-win', player: dealer });
    state.phase = {
      type: 'finished',
      winner: dealer,
      score: scoreWin(dealer, [], toCounts(players[dealer].hand), null),
      reason: 'dealt-win',
    };
  }
  return state;
}

export function sortHand(cards: Card[]): Card[] {
  return cards.slice().sort((a, b) => kindOf(a) - kindOf(b) || a.id - b.id);
}

/**
 * Legal capture options for the responding player, or [] otherwise.
 * A card the player flipped from the wall themselves may also be captured
 * into a pair ("chui đôi"); a discarded card requires a meld of 3+.
 */
export function legalEats(state: GameState): EatOption[] {
  if (state.phase.type !== 'respond' || !state.offered) return [];
  const hand = state.players[state.phase.player].hand;
  return eatOptions(
    toCounts(hand),
    kindOf(state.offered),
    hand.length,
    state.phase.source === 'wall',
  );
}

function clone(state: GameState): GameState {
  return structuredClone(state);
}

export function applyAction(prev: GameState, action: Action): GameState {
  const state = clone(prev);
  switch (action.type) {
    case 'discard':
      return doDiscard(state, action.player, action.cardId);
    case 'eat':
      return doEat(state, action.player, action.option);
    case 'pass':
      return doPass(state, action.player);
  }
}

function doDiscard(state: GameState, player: number, cardId: number): GameState {
  if (state.phase.type !== 'discard' || state.phase.player !== player) {
    throw new Error('Not this player’s discard phase');
  }
  const hand = state.players[player].hand;
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx < 0) throw new Error('Card not in hand');
  const [card] = hand.splice(idx, 1);
  state.log.push({ type: 'discard', player, kind: kindOf(card) });
  return offerCard(state, card, nextPlayer(player, state.players.length), 'discard');
}

function doEat(state: GameState, player: number, option: EatOption): GameState {
  if (state.phase.type !== 'respond' || state.phase.player !== player) {
    throw new Error('Not this player’s respond phase');
  }
  const offered = state.offered;
  if (!offered) throw new Error('No card on offer');
  const legal = legalEats(state);
  const match = legal.find(
    (o) =>
      o.kind === option.kind &&
      o.fromHand.length === option.fromHand.length &&
      o.fromHand.slice().sort().join() === option.fromHand.slice().sort().join(),
  );
  if (!match) throw new Error('Illegal capture');

  const hand = state.players[player].hand;
  const taken: Card[] = [offered];
  for (const kind of match.fromHand) {
    const i = hand.findIndex((c) => kindOf(c) === kind);
    if (i < 0) throw new Error('Capture cards missing from hand');
    taken.push(hand.splice(i, 1)[0]);
  }
  state.players[player].melds.push({ kind: match.kind, cards: sortHand(taken) });
  state.offered = null;
  state.log.push({ type: 'eat', player, kind: kindOf(offered), meld: match.kind });
  state.phase = { type: 'discard', player };
  return state;
}

function doPass(state: GameState, player: number): GameState {
  if (state.phase.type !== 'respond' || state.phase.player !== player) {
    throw new Error('Not this player’s respond phase');
  }
  const offered = state.offered;
  if (!offered) throw new Error('No card on offer');
  const source = state.phase.source;
  state.offered = null;

  if (source === 'discard') {
    // Burn the offered card, then flip the wall for this same player.
    state.dead.push(offered);
    if (state.wall.length === 0) {
      state.log.push({ type: 'wall-empty' });
      state.phase = { type: 'finished', winner: null, score: null, reason: 'wall-empty' };
      return state;
    }
    const flip = state.wall.shift()!;
    state.log.push({ type: 'draw', player, kind: kindOf(flip) });
    return offerCard(state, flip, player, 'wall');
  }

  // Passing a wall card relays it to the next player as a normal offer.
  state.log.push({ type: 'relay', player, kind: kindOf(offered) });
  return offerCard(state, offered, nextPlayer(player, state.players.length), 'discard');
}

/**
 * Put a card on offer. First resolve winning claims ("tới") in seat order
 * starting from `toPlayer`; otherwise enter the respond phase.
 */
function offerCard(state: GameState, card: Card, toPlayer: number, source: Source): GameState {
  const kind = kindOf(card);
  const count = state.players.length;
  for (let i = 0; i < count; i++) {
    const p = (toPlayer + i) % count;
    const handCounts = toCounts(state.players[p].hand);
    if (winsWith(handCounts, kind)) {
      handCounts[kind]++;
      state.players[p].hand.push(card);
      state.players[p].hand = sortHand(state.players[p].hand);
      state.offered = null;
      const exposed = state.players[p].melds.map((m) => ({
        kind: m.kind,
        uses: m.cards.map(kindOf),
      }));
      const score = scoreWin(p, exposed, handCounts, kind);
      state.log.push({ type: 'win', player: p, kind, lenh: score.lenh });
      state.phase = { type: 'finished', winner: p, score, reason: 'win' };
      return state;
    }
  }
  state.offered = card;
  state.offerCounter++;
  state.phase = { type: 'respond', player: toPlayer, source, offerId: state.offerCounter };
  return state;
}

/** Sanity check used by tests: every one of the 112 cards is somewhere. */
export function totalCards(state: GameState): number {
  let n = state.wall.length + state.dead.length + (state.offered ? 1 : 0);
  for (const p of state.players) {
    n += p.hand.length;
    for (const m of p.melds) n += m.cards.length;
  }
  return n;
}

/** Cards owned by a player (hand + exposed melds). Always 20 mid-game. */
export function ownedCards(state: GameState, player: number): number {
  const p = state.players[player];
  return p.hand.length + p.melds.reduce((s, m) => s + m.cards.length, 0);
}
