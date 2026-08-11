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
  you: 'You',
  bot: 'Bot',
  sub: 'you vs 3 bots',
  tutorial: 'Tutorial',
  rules: 'Rules',
  newGame: 'New game',
  langToggle: 'Tiếng Việt',
  speedLabel: { slow: '🐢 Slow', normal: '▶ Normal', fast: '⏩ Fast' } as Record<string, string>,
  hintsOn: '🎓 Hints: on',
  hintsOff: '🎓 Hints: off',
  sortLabel: {
    rank: 'Sort: Rank',
    color: 'Sort: Color',
    melds: 'Sort: Melds',
    manual: 'Sort: Manual',
  } as Record<string, string>,
  dragHint: 'Drag cards to rearrange your hand — works in any sort mode.',
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
  discardHint:
    'Click a card to select it, click it again (or the button) to discard. Drag cards to rearrange.',
  passDraw: 'Pass — draw from the wall',
  passRelay: 'Pass — hand it on',

  eatLabel: {
    pair: 'Pair',
    triple: 'Three alike',
    quad: 'Quằn (4 alike)',
    tst: 'Tướng-Sĩ-Tượng',
    xpm: 'Xe-Pháo-Ngựa',
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
      case 'xpm': return `Xe-Pháo-Ngựa (${meldColorVi(uses)})`;
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
    `${name} banks ${lenh} points — only the winner scores. ${name} deals the next round.`,
  tallyTitle: 'Score tally',
  viewTable: 'View table',

  hintDiscard: (card: string) =>
    `Hint: discard ${card} — it contributes least to completing your hand.`,
  hintEat: (label: string) =>
    `Hint: capture it — forming “${label}” brings you closer to winning.`,
  hintPass: 'Hint: pass — no capture here would improve your hand.',

  online: 'Play online',
  nameBtn: '✎',
  nameTitle: 'Your name',
  namePlaceholder: 'Display name',
  save: 'Save',
  cancel: 'Cancel',
  onlineTitle: 'Online game',
  hostGame: 'Host a game',
  joinGame: 'Join a game',
  codeLabel: 'Game code',
  join: 'Join',
  connecting: 'Connecting…',
  waitingForPlayers: 'Share this code — friends join with it. Empty seats are played by bots.',
  playersInLobby: 'Players',
  emptySeat: '(bot)',
  startOnline: 'Start game',
  waitingHost: 'Waiting for the host to start…',
  leave: 'Leave',
  copy: 'Copy',
  copied: 'Copied!',
  roomFull: 'That game is full.',
  hostLeft: 'The host disconnected — back to solo play.',
  connError: (msg: string) => `Connection error: ${msg}`,
  onlineBadge: (code: string) => `Online · ${code}`,
  hostOnlyNewGame: 'Only the host can start the next round.',
  reconnecting: 'Connection lost — reconnecting…',

  declareBtn: '🔒 Set down',
  declareTitle: 'Set down hidden sets',
  declareIntro:
    'Place complete sets of 3+ cards from your hand face-down on your field. Other players see only the backs; you still see the faces. They score their full concealed lệnh when you win, and the cards are locked in — they cannot return to your hand.',
  declareNone: 'No complete sets of 3+ in your hand right now.',

  resetTally: 'Reset tally',
  sizeLabel: (n: number) => `👥 ${n}`,
  sizeTitle: 'Players at the table (3 or 4) — bots fill empty seats',
  seatOccupied: 'Seat 4 has a player — kick them before shrinking the table.',
  kick: 'Kick',
  kickedMsg: 'The host removed you from the game.',
  chatEmpty: 'Say hi to the table!',
  chatPlaceholder: 'Message…',
  chatSend: 'Send',

  errorRecorded: 'Something went wrong — an error was recorded.',
  reportProblem: 'Report a problem',
  reportTitle: 'Report a problem',
  reportIntro:
    'This report contains the recorded errors plus the data needed to replay the game (deal seed and moves) — no personal information. Sending opens a prefilled GitHub issue you can review before submitting.',
  errorsLogged: (n: number) => (n === 1 ? '1 error logged' : `${n} errors logged`),
  sendGitHub: 'Send via GitHub',
  copyReport: 'Copy report',
  clearLog: 'Clear log',

  logLine(e: LogEvent, names: string[]): string {
    switch (e.type) {
      case 'new-game': return `New round — ${names[e.dealer]} deals.`;
      case 'dealt-win': return `${names[e.player]} wins on the deal (thiên tới)!`;
      case 'discard': return `${names[e.player]} discarded ${kindName(e.kind)}.`;
      case 'draw': return `${names[e.player]} drew from the wall: ${kindName(e.kind)}.`;
      case 'relay': return `${names[e.player]} passed ${kindName(e.kind)} on.`;
      case 'eat': return `${names[e.player]} captured ${kindName(e.kind)} (${en.eatLabel[e.meld]}).`;
      case 'declare': return `${names[e.player]} set down a hidden set (${e.size} cards).`;
      case 'win': return `${names[e.player]} — TỚI with ${kindName(e.kind)}: ${e.lenh} lệnh!`;
      case 'wall-empty': return 'Wall empty — draw game.';
    }
  },

  rulesHTML: `
    <h2>How to play (short version)</h2>
    <p>The deck has 112 cards: 7 ranks (Tướng, Sĩ, Tượng, Xe, Pháo, Ngựa, Tốt) in
    4 colors, 4 copies each. The dealer gets 21 cards, everyone else 20. The
    goal: arrange <em>all</em> of your cards into valid groups.</p>
    <h3>Valid groups</h3>
    <ul>
      <li>2 / 3 / 4 identical cards (same rank <em>and</em> color)</li>
      <li>Tướng-Sĩ-Tượng of one color · Xe-Pháo-Ngựa of one color</li>
      <li>3 or 4 Tốt (soldiers), all different colors</li>
      <li>A lone Tướng (general) counts as a group by itself</li>
    </ul>
    <h3>Turns</h3>
    <ul>
      <li>The dealer opens by discarding a card. A discarded card is offered to the next player.</li>
      <li>That player may <strong>capture</strong> it ("ăn") — combining it with hand cards into a face-up group of 3+ — and then discard, or <strong>pass</strong> and flip a card from the wall.</li>
      <li>A card you flip from the wall yourself may also be captured into a <strong>pair</strong> with an identical card from your hand ("chui đôi"). Discarded cards can never be taken just to pair them.</li>
      <li>At any time you may <strong>set down</strong> complete sets of 3+ from your hand face-down (🔒 "úp bộ"): others see only the backs, and the sets score their full concealed lệnh when you win.</li>
      <li>A flipped wall card they don't use is offered to the next player.</li>
      <li>If an offered card completes someone's whole hand, they <strong>win ("tới")</strong> instantly — the game detects this for you.</li>
      <li>If the wall runs out, the round is a draw.</li>
    </ul>
    <h3>Scoring (lệnh)</h3>
    <ul>
      <li>Pair: 0 · lone Tướng / color runs / 3 mixed Tốt: 1 · 4 mixed Tốt: 4</li>
      <li>3 alike: 1 exposed, 6 concealed (khạp) · 4 alike (quằn): 6 exposed, 8 concealed</li>
      <li>Winning adds +7. Only the winner scores — their lệnh total is added to their running tally; the other players' totals don't change.</li>
    </ul>
    <p style="margin-top:6px;opacity:.75">Some traditional forced-capture and priority rules are simplified — see the README.</p>`,
};

const vi: typeof en = {
  players: ['Bạn', 'Máy 1', 'Máy 2', 'Máy 3'],
  you: 'Bạn',
  bot: 'Máy',
  sub: 'bạn + 3 máy',
  tutorial: 'Hướng dẫn',
  rules: 'Luật chơi',
  newGame: 'Ván mới',
  langToggle: 'English',
  speedLabel: { slow: '🐢 Chậm rãi', normal: '▶ Vừa', fast: '⏩ Nhanh' },
  hintsOn: '🎓 Gợi ý: bật',
  hintsOff: '🎓 Gợi ý: tắt',
  sortLabel: {
    rank: 'Xếp: Quân',
    color: 'Xếp: Màu',
    melds: 'Xếp: Bộ',
    manual: 'Xếp: Tự do',
  },
  dragHint: 'Kéo thả lá bài để tự sắp xếp — dùng được ở mọi kiểu xếp.',
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
  discardHint:
    'Nhấn vào một lá để chọn, nhấn lần nữa (hoặc nhấn nút) để đánh ra. Kéo thả để tự sắp xếp.',
  passDraw: 'Bỏ qua — bốc nọc',
  passRelay: 'Không ăn — nhường qua',

  eatLabel: {
    pair: 'Đôi',
    triple: 'Ăn ba',
    quad: 'Quằn',
    tst: 'Tướng-Sĩ-Tượng',
    xpm: 'Xe-Pháo-Ngựa',
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
      case 'xpm': return `Xe-Pháo-Ngựa ${meldColorVi(uses)}`;
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
  paysLine: (lenh, name) =>
    `${name} cộng ${lenh} điểm vào bảng điểm — chỉ người tới được điểm. ${name} làm cái ván sau.`,
  tallyTitle: 'Bảng điểm',
  viewTable: 'Xem bàn',

  hintDiscard: (card) => `Gợi ý: đánh ${card} — lá này ít giúp bài của bạn nhất.`,
  hintEat: (label) => `Gợi ý: nên ăn — ghép thành “${label}” giúp bạn gần tới hơn.`,
  hintPass: 'Gợi ý: bỏ qua — ăn lúc này không giúp bài của bạn.',

  online: 'Chơi online',
  nameBtn: '✎',
  nameTitle: 'Tên của bạn',
  namePlaceholder: 'Tên hiển thị',
  save: 'Lưu',
  cancel: 'Hủy',
  onlineTitle: 'Chơi online',
  hostGame: 'Tạo phòng',
  joinGame: 'Vào phòng',
  codeLabel: 'Mã phòng',
  join: 'Vào',
  connecting: 'Đang kết nối…',
  waitingForPlayers: 'Gửi mã này cho bạn bè để cùng chơi. Ghế trống sẽ do máy chơi.',
  playersInLobby: 'Người chơi',
  emptySeat: '(máy)',
  startOnline: 'Bắt đầu',
  waitingHost: 'Chờ chủ phòng bắt đầu…',
  leave: 'Rời phòng',
  copy: 'Chép',
  copied: 'Đã chép!',
  roomFull: 'Phòng đã đủ người.',
  hostLeft: 'Chủ phòng đã thoát — quay lại chơi với máy.',
  connError: (msg) => `Lỗi kết nối: ${msg}`,
  onlineBadge: (code) => `Online · ${code}`,
  hostOnlyNewGame: 'Chỉ chủ phòng mới bắt đầu được ván mới.',
  reconnecting: 'Mất kết nối — đang kết nối lại…',

  declareBtn: '🔒 Úp bộ',
  declareTitle: 'Úp bộ kín',
  declareIntro:
    'Đặt các bộ đủ 3+ lá từ tay xuống bàn úp mặt. Người khác chỉ thấy lưng bài; bạn vẫn thấy mặt bài. Khi bạn tới, các bộ này ăn đủ lệnh kín, và lá đã úp không rút lại được.',
  declareNone: 'Trên tay chưa có bộ đủ 3+ lá.',

  resetTally: 'Xóa bảng điểm',
  sizeLabel: (n) => `👥 ${n}`,
  sizeTitle: 'Số người chơi (3 hoặc 4) — ghế trống do máy chơi',
  seatOccupied: 'Ghế 4 đang có người — hãy mời ra trước khi bớt ghế.',
  kick: 'Mời ra',
  kickedMsg: 'Chủ phòng đã mời bạn ra khỏi phòng.',
  chatEmpty: 'Chào cả bàn đi!',
  chatPlaceholder: 'Nhắn tin…',
  chatSend: 'Gửi',

  errorRecorded: 'Có lỗi xảy ra — đã ghi lại nhật ký lỗi.',
  reportProblem: 'Báo lỗi',
  reportTitle: 'Báo lỗi',
  reportIntro:
    'Báo cáo gồm các lỗi đã ghi và dữ liệu để phát lại ván bài (seed và các nước đi) — không có thông tin cá nhân. Nút gửi sẽ mở một issue GitHub điền sẵn để bạn xem lại trước khi gửi.',
  errorsLogged: (n) => `Đã ghi ${n} lỗi`,
  sendGitHub: 'Gửi qua GitHub',
  copyReport: 'Chép báo cáo',
  clearLog: 'Xóa nhật ký',

  logLine(e, names) {
    switch (e.type) {
      case 'new-game': return `Ván mới — ${names[e.dealer]} làm cái.`;
      case 'dealt-win': return `${names[e.player]} tới ngay khi chia bài (thiên tới)!`;
      case 'discard': return `${names[e.player]} đánh ${kindName(e.kind)}.`;
      case 'draw': return `${names[e.player]} bốc nọc: ${kindName(e.kind)}.`;
      case 'relay': return `${names[e.player]} không ăn, nhường ${kindName(e.kind)}.`;
      case 'eat': return `${names[e.player]} ăn ${kindName(e.kind)} (${vi.eatLabel[e.meld]}).`;
      case 'declare': return `${names[e.player]} úp một bộ kín (${e.size} lá).`;
      case 'win': return `${names[e.player]} TỚI với ${kindName(e.kind)} — ${e.lenh} lệnh!`;
      case 'wall-empty': return 'Hết nọc — ván hòa.';
    }
  },

  rulesHTML: `
    <h2>Luật chơi (bản rút gọn)</h2>
    <p>Bộ bài 112 lá: 7 quân (Tướng, Sĩ, Tượng, Xe, Pháo, Ngựa, Tốt) × 4 màu × 4 lá.
    Nhà cái nhận 21 lá, ba nhà kia 20 lá. Mục tiêu: sắp toàn bộ bài thành các nhóm hợp lệ.</p>
    <h3>Nhóm hợp lệ</h3>
    <ul>
      <li>Đôi / ba / bốn lá giống hệt nhau (cùng quân, cùng màu)</li>
      <li>Tướng-Sĩ-Tượng cùng màu · Xe-Pháo-Ngựa cùng màu</li>
      <li>3 hoặc 4 Tốt khác màu nhau</li>
      <li>Tướng lẻ một lá vẫn tính là một nhóm</li>
    </ul>
    <h3>Cách chơi</h3>
    <ul>
      <li>Nhà cái đánh 1 lá mở màn. Lá đánh ra được mời nhà kế tiếp.</li>
      <li>Người được mời có thể <strong>ăn</strong> (ghép thành nhóm ≥ 3 lá, lật lên bàn rồi đánh 1 lá) hoặc <strong>bỏ qua</strong> và bốc nọc.</li>
      <li>Lá tự bốc từ nọc còn có thể <strong>chui đôi</strong> — ghép với một lá giống hệt trên tay thành đôi lật lên bàn. Bài người khác đánh ra thì không được ăn chỉ để tạo đôi.</li>
      <li>Bất cứ lúc nào bạn cũng có thể <strong>úp bộ</strong> (🔒): đặt bộ đủ 3+ lá xuống bàn úp mặt — người khác chỉ thấy lưng bài, và bộ ăn đủ lệnh kín khi bạn tới.</li>
      <li>Lá nọc không ăn sẽ được nhường cho nhà kế tiếp.</li>
      <li>Ai ghép được lá đang mời để hoàn thành toàn bộ bài thì <strong>tới</strong> ngay (máy tự phát hiện).</li>
      <li>Hết nọc mà chưa ai tới thì hòa.</li>
    </ul>
    <h3>Tính lệnh</h3>
    <ul>
      <li>Đôi: 0 · Tướng lẻ / bộ ba màu / 3 Tốt: 1 · 4 Tốt khác màu: 4</li>
      <li>Ba lá giống: ăn lộ 1, giữ kín (khạp) 6 · Quằn: lộ 6, kín 8</li>
      <li>Tới cộng thêm 7 lệnh. Chỉ người tới được điểm — tổng lệnh cộng vào bảng điểm, các nhà khác không bị trừ.</li>
    </ul>
    <p style="margin-top:6px;opacity:.75">Bản chơi này lược giản một số luật ăn ép/ưu tiên của tứ sắc truyền thống — xem README.</p>`,
};

export const STR: Record<Locale, typeof en> = { en, vi };
