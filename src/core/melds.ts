/**
 * Meld ("bộ") logic: which combinations are valid, whether a hand fully
 * decomposes into melds (a winning structure), how far a hand is from
 * winning, and which melds a card on offer can be captured ("ăn") into.
 *
 * Valid melds in Tứ Sắc:
 *  - Đôi:            2 identical cards (same rank AND color)
 *  - Khạp / ba con:  3 identical cards
 *  - Quằn:           4 identical cards
 *  - Tướng-Sĩ-Tượng: one of each, all the same color
 *  - Xe-Pháo-Ngựa:     one of each, all the same color
 *  - Tốt khác màu:   3 or 4 pawns, all different colors
 *  - Tướng lẻ:       a lone General is a valid unit by itself
 */

import { NUM_KINDS, kindIndex, rankOfKind } from './types';
import type { Color, Rank } from './types';

export type MeldKind =
  | 'pair'
  | 'triple'
  | 'quad'
  | 'tst' // Tướng-Sĩ-Tượng, same color
  | 'xpm' // Xe-Pháo-Ngựa, same color
  | 'pawns3' // 3 pawns, distinct colors
  | 'pawns4' // 4 pawns, distinct colors
  | 'loneGeneral';

/** A meld described abstractly by the card kinds it consumes. */
export interface MeldShape {
  kind: MeldKind;
  /** Kind indices consumed, with repetition (length = number of cards). */
  uses: number[];
}

const PAWN_BASE = kindIndex('pawn' as Rank, 'red' as Color); // 24

/**
 * All meld shapes that include at least one card of kind `k`, given the
 * available counts. Used by the decomposition search: `k` is always the
 * lowest-index kind with a nonzero count, so every full decomposition must
 * cover it with one of these shapes.
 */
function shapesAt(counts: number[], k: number): MeldShape[] {
  const shapes: MeldShape[] = [];
  const rank = Math.floor(k / 4);
  const color = k % 4;
  const n = counts[k];

  if (rank === 0) shapes.push({ kind: 'loneGeneral', uses: [k] });
  if (n >= 2) shapes.push({ kind: 'pair', uses: [k, k] });
  if (n >= 3) shapes.push({ kind: 'triple', uses: [k, k, k] });
  if (n >= 4) shapes.push({ kind: 'quad', uses: [k, k, k, k] });

  if (rank <= 2) {
    const g = color, a = 4 + color, e = 8 + color;
    if (counts[g] > 0 && counts[a] > 0 && counts[e] > 0) {
      shapes.push({ kind: 'tst', uses: [g, a, e] });
    }
  } else if (rank <= 5) {
    const x = 12 + color, p = 16 + color, m = 20 + color;
    if (counts[x] > 0 && counts[p] > 0 && counts[m] > 0) {
      shapes.push({ kind: 'xpm', uses: [x, p, m] });
    }
  } else {
    // Pawn: sets of 3 or 4 pawns of distinct colors including this one.
    const others: number[] = [];
    for (let c = 0; c < 4; c++) {
      if (c !== color && counts[PAWN_BASE + c] > 0) others.push(PAWN_BASE + c);
    }
    for (let i = 0; i < others.length; i++) {
      for (let j = i + 1; j < others.length; j++) {
        shapes.push({ kind: 'pawns3', uses: [k, others[i], others[j]] });
      }
    }
    if (others.length === 3) {
      shapes.push({ kind: 'pawns4', uses: [k, ...others] });
    }
  }
  return shapes;
}

function firstNonzero(counts: number[]): number {
  for (let i = 0; i < NUM_KINDS; i++) if (counts[i] > 0) return i;
  return -1;
}

/** True if every card decomposes into valid melds (a complete winning structure). */
export function fullyDecomposes(countsIn: readonly number[]): boolean {
  const counts = countsIn.slice();
  const memo = new Map<string, boolean>();
  const rec = (): boolean => {
    const k = firstNonzero(counts);
    if (k < 0) return true;
    const key = counts.join(',');
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let ok = false;
    for (const shape of shapesAt(counts, k)) {
      for (const u of shape.uses) counts[u]--;
      if (rec()) ok = true;
      for (const u of shape.uses) counts[u]++;
      if (ok) break;
    }
    memo.set(key, ok);
    return ok;
  };
  return rec();
}

/** Maximum number of cards coverable by disjoint valid melds. */
export function bestCover(countsIn: readonly number[]): number {
  const counts = countsIn.slice();
  const memo = new Map<string, number>();
  const rec = (): number => {
    const k = firstNonzero(counts);
    if (k < 0) return 0;
    const key = counts.join(',');
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    // Option: leave one card of kind k unmelded.
    counts[k]--;
    let best = rec();
    counts[k]++;
    for (const shape of shapesAt(counts, k)) {
      for (const u of shape.uses) counts[u]--;
      const covered = shape.uses.length + rec();
      for (const u of shape.uses) counts[u]++;
      if (covered > best) best = covered;
    }
    memo.set(key, best);
    return best;
  };
  return rec();
}

export interface CoverGroups {
  covered: number;
  /** Disjoint melds achieving the maximum cover. */
  melds: MeldShape[];
  /** Kind indices of the uncovered cards (one entry per card). */
  leftovers: number[];
}

/**
 * Like `bestCover`, but also returns one optimal grouping — used e.g. to sort
 * a hand by melds. Sub-results stored in the memo are shared; treat the
 * returned arrays as immutable.
 */
export function bestCoverGroups(countsIn: readonly number[]): CoverGroups {
  const counts = countsIn.slice();
  const memo = new Map<string, CoverGroups>();
  const rec = (): CoverGroups => {
    const k = firstNonzero(counts);
    if (k < 0) return { covered: 0, melds: [], leftovers: [] };
    const key = counts.join(',');
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    counts[k]--;
    const skip = rec();
    counts[k]++;
    let best: CoverGroups = {
      covered: skip.covered,
      melds: skip.melds,
      leftovers: [k, ...skip.leftovers],
    };
    for (const shape of shapesAt(counts, k)) {
      for (const u of shape.uses) counts[u]--;
      const sub = rec();
      for (const u of shape.uses) counts[u]++;
      const covered = shape.uses.length + sub.covered;
      if (covered > best.covered) {
        best = { covered, melds: [shape, ...sub.melds], leftovers: sub.leftovers };
      }
    }
    memo.set(key, best);
    return best;
  };
  return rec();
}

/** Number of cards that cannot be melded — a rough "distance from winning". */
export function leftoverCount(counts: readonly number[]): number {
  let total = 0;
  for (const c of counts) total += c;
  return total - bestCover(counts);
}

/** True if `handCounts` plus one card of `offeredKind` forms a complete winning structure. */
export function winsWith(handCounts: readonly number[], offeredKind: number): boolean {
  const counts = handCounts.slice();
  counts[offeredKind]++;
  return fullyDecomposes(counts);
}

/**
 * A way to capture ("ăn") an offered card: the meld formed and the card
 * kinds taken from hand to complete it.
 *
 * Any offered card — a discard or a wall flip — may be captured into a pair
 * with an identical hand card ("chui đôi"). A Tướng you flip from the wall
 * yourself may additionally be played on its own as a lone general; pass
 * `ownFlip` for that case.
 */
export interface EatOption {
  kind: MeldKind;
  /** Kind indices consumed from the hand (with repetition). */
  fromHand: number[];
}

export function eatOptions(
  handCounts: readonly number[],
  offeredKind: number,
  handSize: number,
  ownFlip = false,
): EatOption[] {
  const opts: EatOption[] = [];
  const k = offeredKind;
  const rank = Math.floor(k / 4);
  const color = k % 4;

  if (ownFlip && rank === 0) opts.push({ kind: 'loneGeneral', fromHand: [] });
  if (handCounts[k] >= 1) opts.push({ kind: 'pair', fromHand: [k] });
  if (handCounts[k] >= 2) opts.push({ kind: 'triple', fromHand: [k, k] });
  if (handCounts[k] >= 3) opts.push({ kind: 'quad', fromHand: [k, k, k] });

  if (rank <= 2) {
    const trio = [color, 4 + color, 8 + color].filter((x) => x !== k);
    if (handCounts[trio[0]] > 0 && handCounts[trio[1]] > 0) {
      opts.push({ kind: 'tst', fromHand: trio });
    }
  } else if (rank <= 5) {
    const trio = [12 + color, 16 + color, 20 + color].filter((x) => x !== k);
    if (handCounts[trio[0]] > 0 && handCounts[trio[1]] > 0) {
      opts.push({ kind: 'xpm', fromHand: trio });
    }
  } else if (rankOfKind(k) === 'pawn') {
    const others: number[] = [];
    for (let c = 0; c < 4; c++) {
      if (c !== color && handCounts[PAWN_BASE + c] > 0) others.push(PAWN_BASE + c);
    }
    for (let i = 0; i < others.length; i++) {
      for (let j = i + 1; j < others.length; j++) {
        opts.push({ kind: 'pawns3', fromHand: [others[i], others[j]] });
      }
    }
    if (others.length === 3) {
      opts.push({ kind: 'pawns4', fromHand: others });
    }
  }

  // After capturing, the player must still have a card to discard.
  return opts.filter((o) => handSize - o.fromHand.length >= 1);
}
