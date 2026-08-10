/**
 * Scoring ("lệnh") for a winning hand.
 *
 * The lệnh table used here (a common variant — see README for notes):
 *   Đôi (pair)                       0 lệnh
 *   Tướng lẻ (lone general)          1
 *   Tướng-Sĩ-Tượng / Xe-Pháo-Ngựa      1
 *   3 Tốt khác màu                   1
 *   4 Tốt khác màu                   4
 *   3 con giống — ăn/lộ (exposed)    1
 *   3 con giống — trên tay (khạp)    6
 *   4 con giống — ăn/lộ              6
 *   4 con giống — trên tay (quằn)    8
 *   Tới (winning)                   +7
 * Only the winner scores: their lệnh total is added to their running tally.
 * The other players neither gain nor lose points.
 */

import type { MeldKind, MeldShape } from './melds';
import { NUM_KINDS } from './types';

export const WIN_BONUS = 7;

export const MELD_LENH: Record<MeldKind, { concealed: number; exposed: number }> = {
  pair: { concealed: 0, exposed: 0 },
  triple: { concealed: 6, exposed: 1 },
  quad: { concealed: 8, exposed: 6 },
  tst: { concealed: 1, exposed: 1 },
  xpm: { concealed: 1, exposed: 1 },
  pawns3: { concealed: 1, exposed: 1 },
  pawns4: { concealed: 4, exposed: 4 },
  loneGeneral: { concealed: 1, exposed: 1 },
};

export interface ScoredMeld {
  kind: MeldKind;
  uses: number[];
  concealed: boolean;
  lenh: number;
}

export interface ScoreResult {
  winner: number;
  lenh: number;
  breakdown: ScoredMeld[];
  winBonus: number;
}

interface DecompResult {
  lenh: number;
  melds: MeldShape[];
}

/**
 * Best full decomposition of `counts` by concealed lệnh value.
 * Returns null if the counts do not fully decompose.
 */
export function bestScoringDecomposition(countsIn: readonly number[]): DecompResult | null {
  const counts = countsIn.slice();
  const memo = new Map<string, DecompResult | null>();

  const shapesFor = (k: number): MeldShape[] => {
    // Mirrors melds.ts shapesAt but kept local to avoid a circular export.
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
      if (counts[g] > 0 && counts[a] > 0 && counts[e] > 0) shapes.push({ kind: 'tst', uses: [g, a, e] });
    } else if (rank <= 5) {
      const x = 12 + color, p = 16 + color, m = 20 + color;
      if (counts[x] > 0 && counts[p] > 0 && counts[m] > 0) shapes.push({ kind: 'xpm', uses: [x, p, m] });
    } else {
      const others: number[] = [];
      for (let c = 0; c < 4; c++) {
        if (c !== color && counts[24 + c] > 0) others.push(24 + c);
      }
      for (let i = 0; i < others.length; i++) {
        for (let j = i + 1; j < others.length; j++) {
          shapes.push({ kind: 'pawns3', uses: [k, others[i], others[j]] });
        }
      }
      if (others.length === 3) shapes.push({ kind: 'pawns4', uses: [k, ...others] });
    }
    return shapes;
  };

  const rec = (): DecompResult | null => {
    let k = -1;
    for (let i = 0; i < NUM_KINDS; i++) {
      if (counts[i] > 0) {
        k = i;
        break;
      }
    }
    if (k < 0) return { lenh: 0, melds: [] };
    const key = counts.join(',');
    if (memo.has(key)) return memo.get(key)!;
    let best: DecompResult | null = null;
    for (const shape of shapesFor(k)) {
      for (const u of shape.uses) counts[u]--;
      const sub = rec();
      for (const u of shape.uses) counts[u]++;
      if (sub) {
        const lenh = sub.lenh + MELD_LENH[shape.kind].concealed;
        if (!best || lenh > best.lenh) {
          best = { lenh, melds: [shape, ...sub.melds] };
        }
      }
    }
    memo.set(key, best);
    return best;
  };
  return rec();
}

/**
 * Score a win. `exposedMelds` are the winner's captured melds on the table;
 * `handCounts` is the concealed hand; `wonKind` is the claimed card's kind
 * (already included in handCounts), or null for a dealt win (thiên tới).
 *
 * The meld completed by the claimed card is scored as exposed, not concealed
 * (you cannot claim khạp/quằn value on a set the winning card just finished).
 */
export function scoreWin(
  winner: number,
  exposedMelds: { kind: MeldKind; uses: number[] }[],
  handCounts: readonly number[],
  wonKind: number | null,
): ScoreResult {
  const breakdown: ScoredMeld[] = [];

  for (const m of exposedMelds) {
    breakdown.push({
      kind: m.kind,
      uses: m.uses,
      concealed: false,
      lenh: MELD_LENH[m.kind].exposed,
    });
  }

  const decomp = bestScoringDecomposition(handCounts);
  if (!decomp) {
    throw new Error('scoreWin called on a hand that does not decompose');
  }

  // Demote the cheapest meld containing the won card from concealed to exposed.
  let demoteIdx = -1;
  if (wonKind !== null) {
    let bestDelta = Infinity;
    decomp.melds.forEach((m, i) => {
      if (m.uses.includes(wonKind)) {
        const delta = MELD_LENH[m.kind].concealed - MELD_LENH[m.kind].exposed;
        if (delta < bestDelta) {
          bestDelta = delta;
          demoteIdx = i;
        }
      }
    });
  }

  decomp.melds.forEach((m, i) => {
    const concealed = i !== demoteIdx;
    breakdown.push({
      kind: m.kind,
      uses: m.uses,
      concealed,
      lenh: concealed ? MELD_LENH[m.kind].concealed : MELD_LENH[m.kind].exposed,
    });
  });

  const lenh = breakdown.reduce((s, m) => s + m.lenh, 0) + WIN_BONUS;
  return { winner, lenh, breakdown, winBonus: WIN_BONUS };
}
