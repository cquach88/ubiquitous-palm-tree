/** Shared card rendering helpers (used by the table UI and the tutorial). */

import type { Card } from '../core';
import { COLOR_INFO, RANK_INFO, colorOfKind, kindName, kindOf, rankOfKind } from '../core';

/** Tooltip: Vietnamese name + English translation, e.g. "Tướng đỏ — red General". */
export function cardTitle(kind: number): string {
  const rank = RANK_INFO[rankOfKind(kind)];
  const color = COLOR_INFO[colorOfKind(kind)];
  return `${kindName(kind)} — ${color.en} ${rank.en}`;
}

export function kindCardHTML(kind: number, cls = 'mini', attrs = ''): string {
  const rank = RANK_INFO[rankOfKind(kind)];
  const color = COLOR_INFO[colorOfKind(kind)];
  return `<div class="card ${colorOfKind(kind)} ${cls}" ${attrs} title="${cardTitle(kind)}">
    <span class="glyph">${rank.glyph}</span>
    <span class="label">${rank.vi} ${color.vi}</span>
  </div>`;
}

export function cardHTML(card: Card, cls = '', attrs = ''): string {
  return kindCardHTML(kindOf(card), cls, attrs);
}
