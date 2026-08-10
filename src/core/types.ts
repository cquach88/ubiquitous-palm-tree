/**
 * Core types and static card data for Bài Tứ Sắc.
 *
 * This module (and everything under src/core) is pure TypeScript with zero
 * dependencies on the DOM, Node, or any framework — it can be reused verbatim
 * in a React Native app, a Capacitor shell, or a server.
 */

export const COLORS = ['red', 'green', 'yellow', 'white'] as const;
export type Color = (typeof COLORS)[number];

export const RANKS = [
  'general', // Tướng
  'advisor', // Sĩ
  'elephant', // Tượng
  'chariot', // Xe
  'cannon', // Pháo
  'horse', // Mã
  'pawn', // Tốt
] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  /** Unique id 0..111, stable for the whole game. */
  id: number;
  rank: Rank;
  color: Color;
}

/** There are 28 distinct card kinds (7 ranks × 4 colors), 4 copies of each. */
export const NUM_KINDS = 28;
export const COPIES_PER_KIND = 4;
export const DECK_SIZE = NUM_KINDS * COPIES_PER_KIND; // 112

const RANK_IDX: Record<Rank, number> = Object.fromEntries(
  RANKS.map((r, i) => [r, i]),
) as Record<Rank, number>;
const COLOR_IDX: Record<Color, number> = Object.fromEntries(
  COLORS.map((c, i) => [c, i]),
) as Record<Color, number>;

/** Map a (rank, color) to its kind index 0..27. Kinds are rank-major. */
export function kindIndex(rank: Rank, color: Color): number {
  return RANK_IDX[rank] * 4 + COLOR_IDX[color];
}

export function kindOf(card: Pick<Card, 'rank' | 'color'>): number {
  return kindIndex(card.rank, card.color);
}

export function rankOfKind(kind: number): Rank {
  return RANKS[Math.floor(kind / 4)];
}

export function colorOfKind(kind: number): Color {
  return COLORS[kind % 4];
}

export interface RankInfo {
  /** Vietnamese name (used on the card face). */
  vi: string;
  /** English translation. */
  en: string;
  /** Traditional Chinese character printed on the card. */
  glyph: string;
}

export const RANK_INFO: Record<Rank, RankInfo> = {
  general: { vi: 'Tướng', en: 'General', glyph: '將' },
  advisor: { vi: 'Sĩ', en: 'Advisor', glyph: '士' },
  elephant: { vi: 'Tượng', en: 'Elephant', glyph: '相' },
  chariot: { vi: 'Xe', en: 'Chariot', glyph: '車' },
  cannon: { vi: 'Pháo', en: 'Cannon', glyph: '炮' },
  horse: { vi: 'Ngựa', en: 'Horse', glyph: '馬' },
  pawn: { vi: 'Tốt', en: 'Soldier', glyph: '卒' },
};

export const COLOR_INFO: Record<Color, { vi: string; en: string }> = {
  red: { vi: 'đỏ', en: 'red' },
  green: { vi: 'xanh', en: 'green' },
  yellow: { vi: 'vàng', en: 'yellow' },
  white: { vi: 'trắng', en: 'white' },
};

/** Human-readable Vietnamese name of a card kind, e.g. "Pháo đỏ". */
export function kindName(kind: number): string {
  return `${RANK_INFO[rankOfKind(kind)].vi} ${COLOR_INFO[colorOfKind(kind)].vi}`;
}

export function cardName(card: Pick<Card, 'rank' | 'color'>): string {
  return kindName(kindOf(card));
}

/** Build the full 112-card deck in a canonical order. */
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;
  for (const rank of RANKS) {
    for (const color of COLORS) {
      for (let copy = 0; copy < COPIES_PER_KIND; copy++) {
        deck.push({ id: id++, rank, color });
      }
    }
  }
  return deck;
}

/** Count cards per kind into a 28-slot vector. */
export function toCounts(cards: readonly Pick<Card, 'rank' | 'color'>[]): number[] {
  const counts = new Array<number>(NUM_KINDS).fill(0);
  for (const c of cards) counts[kindOf(c)]++;
  return counts;
}
