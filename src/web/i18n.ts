/**
 * UI strings. English is the default; Vietnamese is a toggle. Card names are
 * always shown in Vietnamese (with the Chinese glyph on the card face) — only
 * the surrounding UI text is localized. Vietnamese game jargon (tới, ăn,
 * khạp, quằn, lệnh) is kept in the English strings, as players use it.
 */

import type { LogEvent, MeldKind } from '../core';
import { COLOR_INFO, colorOfKind, kindName } from '../core';

export type Locale = 'en' | 'vi';

const meldColorVi = (uses: number[]) => COLOR_INFO[colorOfKind(uses[0])].vi;

const en = {
  players: ['You', 'Bot 1', 'Bot 2', 'Bot 3'],
  sub: 'you vs 3 bots',
  tutorial: 'Tutorial',
  rules: 'Rules',
  newGame: 'New game',
  langToggle: 'Tiếng Việt',
  speedFast: '⏩ Fast',
  speedNormal: '▶ Normal',
  hintsOn: '🎓 Hints: on',
  hintsOff: '🎓 Hints: off',
  dealer: 'Dealer',
  points: (n: number) => `${n >= 0 ? '+' : ''}${n} pts`,
  cardsInHand: (n: number) => `${n} cards in hand`,
  oddCards: (n: number) => `Unmatched cards: ${n}`,
  wallCount: (n: number) => `Wall: ${n}`,
  deadCount: (n: number) => `Burned: ${n}`,
  empty: 'none yet',
  fromWall: 'Wall card',
  fromDiscard: 'Discarded card',

  stYouDiscard: 'Your turn — pick a card to discard.',
  stAiDiscard: (name: string) => `${name} is choosing a discard…`,
  stYouEat: (card: string) => `Capture ${card}?`,
  stYouCantDiscardSrc: (card: string) => `You can't use ${card} — draw from the wall.`,
  stYouCantWallSrc: (card: string) => `You can't use ${card} — pass it on.`,
  stAiThinking: (name: string, card: string) => `${name} is considering ${card}…`,
  stDrawGame: 'Wall empty — draw game.',
  stWin: (name: string, lenh: number) => `${name} wins — tới! (${lenh} lệnh)`,

  discardBtn: (card: string) => `Discard ${card}`,
  discardHint: 'Click a card to select it, click it again (or the button) to discard.',
  passDraw: 'Pass — draw from the wall',
  passRelay: 'Pass — hand it on',

  eatLabel: {
    pair: 'Pair',
    triple: 'Three alike',
    quad: 'Quằn (4 alike)',
    tst: 'Tướng-Sĩ-Tượng',
    xpm: 'Xe-Pháo-Mã',
    pawns3: 'Mixed Tốt',
    pawns4: 'Mixed Tốt ×4',
    loneGeneral: 'Lone Tướng',
  } as Record<MeldKind, string>,

  meldLabel(kind: MeldKind, uses: number[]): string {
    switch (kind) {
      case 'pair': return `Pair of ${kindName(uses[0])}`;
      case 'triple': return `Three ${kindName(uses[0])}`;
      case 'quad': return `Quằn — four ${kindName(uses[0])}`;
      case 'tst': return `Tướng-Sĩ-Tượng (${meldColorVi(uses)})`;
      case 'xpm': return `Xe-Pháo-Mã (${meldColorVi(uses)})`;
      case 'pawns3': return '3 Tốt, different colors';
      case 'pawns4': return '4 Tốt, different colors';
      case 'loneGeneral': return `Lone Tướng (${meldColorVi(uses)})`;
    }
  },

  exposedTag: '(exposed)',
  resultTitle: 'Round result',
  winnerLine: (name: string, dealt: boolean) =>
    `<strong>${name}</strong> wins${dealt ? ' straight from the deal (thiên tới)' : ''} — tới!`,
  drawLine: 'The wall ran out before anyone completed a hand — this round is a draw.',
  winBonusRow: 'Winning (tới)',
  totalRow: 'Total',
  paysLine: (lenh: number, name: string) =>
    `Each losing player pays ${lenh} points. ${name} deals the next round.`,
  viewTable: 'View table',

  hintDiscard: (card: string) =>
    `Hint: discard ${card} — it contributes least to completing your hand.`,
  hintEat: (label: string) =>
    `Hint: capture it — forming “${label}” brings you closer to winning.`,
  hintPass: 'Hint: pass — no capture here would improve your hand.',

  logLine(e: LogEvent, names: string[]): string {
    switch (e.type) {
      case 'new-game': return `New round — ${names[e.dealer]} deals.`;
      case 'dealt-win': return `${names[e.player]} wins on the deal (thiên tới)!`;
      case 'discard': return `${names[e.player]} discarded ${kindName(e.kind)}.`;
      case 'draw': return `${names[e.player]} drew from the wall: ${kindName(e.kind)}.`;
      case 'relay': return `${names[e.player]} passed ${kindName(e.kind)} on.`;
      case 'eat': return `${names[e.player]} captured ${kindName(e.kind)} (${en.eatLabel[e.meld]}).`;
      case 'win': return `${names[e.player]} — TỚI with ${kindName(e.kind)}: ${e.lenh} lệnh!`;
      case 'wall-empty': return 'Wall empty — draw game.';
    }
  },

  rulesHTML: `
    <h2>How to play (short version)</h2>
    <p>The deck has 112 cards: 7 ranks (Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Tốt) in
    4 colors, 4 copies each. The dealer gets 21 cards, everyone else 20. The
    goal: arrange <em>all</em> of your cards into valid groups.</p>
    <h3>Valid groups</h3>
    <ul>
      <li>2 / 3 / 4 identical cards (same rank <em>and</em> color)</li>
      <li>Tướng-Sĩ-Tượng of one color · Xe-Pháo-Mã of one color</li>
      <li>3 or 4 Tốt (soldiers), all different colors</li>
      <li>A lone Tướng (general) counts as a group by itself</li>
    </ul>
    <h3>Turns</h3>
    <ul>
      <li>The dealer opens by discarding a card. A discarded card is offered to the next player.</li>
      <li>That player may <strong>capture</strong> it ("ăn") — combining it with hand cards into a face-up group of 3+ — and then discard, or <strong>pass</strong> and flip a card from the wall.</li>
      <li>A flipped wall card they don't use is offered to the next player.</li>
      <li>If an offered card completes someone's whole hand, they <strong>win ("tới")</strong> instantly — the game detects this for you.</li>
      <li>If the wall runs out, the round is a draw.</li>
    </ul>
    <h3>Scoring (lệnh)</h3>
    <ul>
      <li>Pair: 0 · lone Tướng / color runs / 3 mixed Tốt: 1 · 4 mixed Tốt: 4</li>
      <li>3 alike: 1 exposed, 6 concealed (khạp) · 4 alike (quằn): 6 exposed, 8 concealed</li>
      <li>Winning adds +3; every loser pays the winner the full lệnh count.</li>
    </ul>
    <p style="margin-top:6px;opacity:.75">Some traditional forced-capture and priority rules are simplified — see the README.</p>`,
};

const vi: typeof en = {
  players: ['Bạn', 'Máy 1', 'Máy 2', 'Máy 3'],
  sub: 'bạn + 3 máy',
  tutorial: 'Hướng dẫn',
  rules: 'Luật chơi',
  newGame: 'Ván mới',
  langToggle: 'English',
  speedFast: '⏩ Nhanh',
  speedNormal: '▶ Chậm',
  hintsOn: '🎓 Gợi ý: bật',
  hintsOff: '🎓 Gợi ý: tắt',
  dealer: 'Cái',
  points: (n) => `${n >= 0 ? '+' : ''}${n} điểm`,
  cardsInHand: (n) => `${n} lá trên tay`,
  oddCards: (n) => `Bài lẻ: ${n} lá`,
  wallCount: (n) => `Nọc: ${n} lá`,
  deadCount: (n) => `Bài bỏ: ${n} lá`,
  empty: 'chưa có',
  fromWall: 'Bài nọc',
  fromDiscard: 'Bài đánh ra',

  stYouDiscard: 'Bạn: chọn một lá để đánh ra.',
  stAiDiscard: (name) => `${name} đang chọn bài đánh…`,
  stYouEat: (card) => `Bạn: có ăn ${card} không?`,
  stYouCantDiscardSrc: (card) => `Bạn không ăn được ${card} — bốc nọc.`,
  stYouCantWallSrc: (card) => `Bạn không ăn được ${card} — nhường qua.`,
  stAiThinking: (name, card) => `${name} đang tính với ${card}…`,
  stDrawGame: 'Hết nọc — ván hòa.',
  stWin: (name, lenh) => `${name} tới! (${lenh} lệnh)`,

  discardBtn: (card) => `Đánh ${card}`,
  discardHint: 'Nhấn vào một lá để chọn, nhấn lần nữa (hoặc nhấn nút) để đánh ra.',
  passDraw: 'Bỏ qua — bốc nọc',
  passRelay: 'Không ăn — nhường qua',

  eatLabel: {
    pair: 'Đôi',
    triple: 'Ăn ba',
    quad: 'Quằn',
    tst: 'Tướng-Sĩ-Tượng',
    xpm: 'Xe-Pháo-Mã',
    pawns3: 'Tốt khác màu',
    pawns4: 'Tốt khác màu ×4',
    loneGeneral: 'Tướng lẻ',
  } as Record<MeldKind, string>,

  meldLabel(kind, uses) {
    switch (kind) {
      case 'pair': return `Đôi ${kindName(uses[0])}`;
      case 'triple': return `Ba ${kindName(uses[0])}`;
      case 'quad': return `Quằn ${kindName(uses[0])}`;
      case 'tst': return `Tướng-Sĩ-Tượng ${meldColorVi(uses)}`;
      case 'xpm': return `Xe-Pháo-Mã ${meldColorVi(uses)}`;
      case 'pawns3': return '3 Tốt khác màu';
      case 'pawns4': return '4 Tốt khác màu';
      case 'loneGeneral': return `Tướng lẻ ${meldColorVi(uses)}`;
    }
  },

  exposedTag: '(lộ)',
  resultTitle: 'Kết quả',
  winnerLine: (name, dealt) =>
    `<strong>${name}</strong> tới${dealt ? ' ngay khi chia bài (thiên tới)' : ''}!`,
  drawLine: 'Hết nọc mà chưa ai tới — ván này hòa, không ai ăn điểm.',
  winBonusRow: 'Tới',
  totalRow: 'Tổng',
  paysLine: (lenh, name) => `Mỗi nhà thua trả ${lenh} điểm. ${name} làm cái ván sau.`,
  viewTable: 'Xem bàn',

  hintDiscard: (card) => `Gợi ý: đánh ${card} — lá này ít giúp bài của bạn nhất.`,
  hintEat: (label) => `Gợi ý: nên ăn — ghép thành “${label}” giúp bạn gần tới hơn.`,
  hintPass: 'Gợi ý: bỏ qua — ăn lúc này không giúp bài của bạn.',

  logLine(e, names) {
    switch (e.type) {
      case 'new-game': return `Ván mới — ${names[e.dealer]} làm cái.`;
      case 'dealt-win': return `${names[e.player]} tới ngay khi chia bài (thiên tới)!`;
      case 'discard': return `${names[e.player]} đánh ${kindName(e.kind)}.`;
      case 'draw': return `${names[e.player]} bốc nọc: ${kindName(e.kind)}.`;
      case 'relay': return `${names[e.player]} không ăn, nhường ${kindName(e.kind)}.`;
      case 'eat': return `${names[e.player]} ăn ${kindName(e.kind)} (${vi.eatLabel[e.meld]}).`;
      case 'win': return `${names[e.player]} TỚI với ${kindName(e.kind)} — ${e.lenh} lệnh!`;
      case 'wall-empty': return 'Hết nọc — ván hòa.';
    }
  },

  rulesHTML: `
    <h2>Luật chơi (bản rút gọn)</h2>
    <p>Bộ bài 112 lá: 7 quân (Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Tốt) × 4 màu × 4 lá.
    Nhà cái nhận 21 lá, ba nhà kia 20 lá. Mục tiêu: sắp toàn bộ bài thành các nhóm hợp lệ.</p>
    <h3>Nhóm hợp lệ</h3>
    <ul>
      <li>Đôi / ba / bốn lá giống hệt nhau (cùng quân, cùng màu)</li>
      <li>Tướng-Sĩ-Tượng cùng màu · Xe-Pháo-Mã cùng màu</li>
      <li>3 hoặc 4 Tốt khác màu nhau</li>
      <li>Tướng lẻ một lá vẫn tính là một nhóm</li>
    </ul>
    <h3>Cách chơi</h3>
    <ul>
      <li>Nhà cái đánh 1 lá mở màn. Lá đánh ra được mời nhà kế tiếp.</li>
      <li>Người được mời có thể <strong>ăn</strong> (ghép thành nhóm ≥ 3 lá, lật lên bàn rồi đánh 1 lá) hoặc <strong>bỏ qua</strong> và bốc nọc.</li>
      <li>Lá nọc không ăn sẽ được nhường cho nhà kế tiếp.</li>
      <li>Ai ghép được lá đang mời để hoàn thành toàn bộ bài thì <strong>tới</strong> ngay (máy tự phát hiện).</li>
      <li>Hết nọc mà chưa ai tới thì hòa.</li>
    </ul>
    <h3>Tính lệnh</h3>
    <ul>
      <li>Đôi: 0 · Tướng lẻ / bộ ba màu / 3 Tốt: 1 · 4 Tốt khác màu: 4</li>
      <li>Ba lá giống: ăn lộ 1, giữ kín (khạp) 6 · Quằn: lộ 6, kín 8</li>
      <li>Tới cộng thêm 3 lệnh; mỗi nhà thua trả đủ số lệnh.</li>
    </ul>
    <p style="margin-top:6px;opacity:.75">Bản chơi này lược giản một số luật ăn ép/ưu tiên của tứ sắc truyền thống — xem README.</p>`,
};

export const STR: Record<Locale, typeof en> = { en, vi };
