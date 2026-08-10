/**
 * Web UI for Bài Tứ Sắc. This layer only renders `GameState` and dispatches
 * engine actions — all rules live in src/core. A React Native or Capacitor
 * app would replace this file (and style.css) and keep the core untouched.
 */

import './style.css';
import type { Card, EatOption, GameState } from '../core';
import {
  aiChooseAction,
  applyAction,
  cardName,
  colorOfKind,
  kindName,
  leftoverCount,
  legalEats,
  newGame,
  rankOfKind,
  setLogNames,
  toCounts,
  RANK_INFO,
  COLOR_INFO,
  NUM_PLAYERS,
} from '../core';

const HUMAN = 0;
const PLAYER_NAMES = ['Bạn', 'Máy 1', 'Máy 2', 'Máy 3'];
setLogNames((p) => PLAYER_NAMES[p]);

// ---------- session state ----------

let state: GameState;
let dealer = 0;
let selectedCardId: number | null = null;
let fast = false;
let aiTimerGen = 0;
let settled = false;
let chips: number[] = loadChips();

function loadChips(): number[] {
  try {
    const raw = localStorage.getItem('tusac-chips');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === NUM_PLAYERS) return arr.map(Number);
    }
  } catch {
    /* ignore */
  }
  return new Array(NUM_PLAYERS).fill(0);
}

function saveChips(): void {
  try {
    localStorage.setItem('tusac-chips', JSON.stringify(chips));
  } catch {
    /* ignore */
  }
}

function startGame(): void {
  aiTimerGen++;
  selectedCardId = null;
  settled = false;
  state = newGame({ seed: (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0, dealer });
  render();
  afterAction();
}

function dispatch(action: Parameters<typeof applyAction>[1]): void {
  state = applyAction(state, action);
  selectedCardId = null;
  render();
  afterAction();
}

function afterAction(): void {
  if (state.phase.type === 'finished') {
    finishGame();
    return;
  }
  const player = state.phase.player;
  if (player !== HUMAN) {
    const gen = ++aiTimerGen;
    const delay = fast ? 180 : 850;
    setTimeout(() => {
      if (gen !== aiTimerGen || state.phase.type === 'finished') return;
      dispatch(aiChooseAction(state));
    }, delay);
  }
}

function finishGame(): void {
  if (state.phase.type !== 'finished' || settled) return;
  settled = true;
  const { winner, score } = state.phase;
  if (winner !== null && score) {
    chips = chips.map((c, p) => (p === winner ? c + score.lenh * (NUM_PLAYERS - 1) : c - score.lenh));
    saveChips();
    dealer = winner; // winner deals the next round
  }
  render();
  const dlg = document.getElementById('result-dialog') as HTMLDialogElement | null;
  dlg?.showModal();
}

// ---------- rendering ----------

function cardHTML(card: Card, cls = '', attrs = ''): string {
  const rank = RANK_INFO[card.rank];
  const color = COLOR_INFO[card.color];
  return `<div class="card ${card.color} ${cls}" ${attrs} title="${cardName(card)}">
    <span class="glyph">${rank.glyph}</span>
    <span class="label">${rank.vi} ${color.vi}</span>
  </div>`;
}

function kindCardHTML(kind: number, cls = 'mini'): string {
  const rank = RANK_INFO[rankOfKind(kind)];
  return `<div class="card ${colorOfKind(kind)} ${cls}" title="${kindName(kind)}">
    <span class="glyph">${rank.glyph}</span>
    <span class="label">${kindName(kind)}</span>
  </div>`;
}

function backsHTML(n: number, max = 21): string {
  const shown = Math.min(n, max);
  let html = '<div class="backs">';
  for (let i = 0; i < shown; i++) html += '<div class="card mini back"></div>';
  html += '</div>';
  return html;
}

function meldsHTML(player: number): string {
  const melds = state.players[player].melds;
  if (melds.length === 0) return '';
  return `<div class="melds">${melds
    .map((m) => `<div class="meld">${m.cards.map((c) => cardHTML(c, 'mini')).join('')}</div>`)
    .join('')}</div>`;
}

function chipsHTML(player: number): string {
  const v = chips[player];
  const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : '';
  return `<span class="chips ${cls}">${v >= 0 ? '+' : ''}${v} điểm</span>`;
}

function seatIsActive(player: number): boolean {
  return state.phase.type !== 'finished' && state.phase.player === player;
}

function opponentSeatHTML(player: number, area: string): string {
  const p = state.players[player];
  return `<section class="seat seat-${area} ${seatIsActive(player) ? 'active' : ''}">
    <div class="who">${PLAYER_NAMES[player]}
      ${state.dealer === player ? '<span class="badge">Cái</span>' : ''}
      ${chipsHTML(player)}
    </div>
    <div class="hand-count">${p.hand.length} lá trên tay</div>
    ${backsHTML(p.hand.length, 12)}
    ${meldsHTML(player)}
  </section>`;
}

function statusText(): string {
  const phase = state.phase;
  if (phase.type === 'finished') {
    if (phase.winner === null) return 'Hết nọc — ván hòa.';
    return `${PLAYER_NAMES[phase.winner]} tới! (${phase.score?.lenh ?? 0} lệnh)`;
  }
  const name = PLAYER_NAMES[phase.player];
  if (phase.type === 'discard') {
    return phase.player === HUMAN ? 'Bạn: chọn một lá để đánh ra.' : `${name} đang chọn bài đánh…`;
  }
  const what = state.offered ? cardName(state.offered) : '';
  if (phase.player === HUMAN) {
    return legalEats(state).length > 0
      ? `Bạn: có ăn ${what} không?`
      : phase.source === 'discard'
        ? `Bạn không ăn được ${what} — bốc nọc.`
        : `Bạn không ăn được ${what} — nhường qua.`;
  }
  return `${name} đang tính với ${what}…`;
}

function centerHTML(): string {
  const offered = state.offered;
  const sourceLabel =
    state.phase.type === 'respond' && state.phase.source === 'wall' ? 'Bài nọc' : 'Bài đánh ra';
  const dead = state.dead.slice(-14);
  return `<section class="center">
    <div class="status">${statusText()}</div>
    <div class="piles">
      <div class="pile">
        <div class="card back"></div>
        <span class="title">Nọc: ${state.wall.length} lá</span>
      </div>
      <div class="pile">
        ${offered ? cardHTML(offered, 'offered-big') : '<div class="card" style="opacity:.12"></div>'}
        <span class="title">${offered ? sourceLabel : '—'}</span>
      </div>
      <div class="pile" style="min-width:0">
        <div class="dead-cards">${dead.map((c) => cardHTML(c, 'mini')).join('') || '<span style="opacity:.4;font-size:.8rem">chưa có</span>'}</div>
        <span class="title">Bài bỏ: ${state.dead.length} lá</span>
      </div>
    </div>
    <div class="log" id="log">${state.log.slice(-60).map((l) => `<div>${l}</div>`).join('')}</div>
  </section>`;
}

function eatOptionHTML(opt: EatOption, index: number): string {
  const offered = state.offered!;
  const label =
    opt.kind === 'quad'
      ? 'Quằn'
      : opt.kind === 'triple'
        ? 'Ăn ba'
        : opt.kind === 'tst'
          ? 'Tướng-Sĩ-Tượng'
          : opt.kind === 'xpm'
            ? 'Xe-Pháo-Mã'
            : 'Tốt khác màu';
  return `<button class="eat-opt" data-action="eat" data-opt="${index}">
    <span class="opt-label">${label}</span>
    ${cardHTML(offered, 'mini')}
    ${opt.fromHand.map((k) => kindCardHTML(k)).join('')}
  </button>`;
}

function humanActionsHTML(): string {
  const phase = state.phase;
  if (phase.type === 'finished') {
    return `<div class="actions"><button class="primary" data-action="new-game">Ván mới</button></div>`;
  }
  if (phase.player !== HUMAN) return '';
  if (phase.type === 'discard') {
    const sel = selectedCardId !== null ? state.players[HUMAN].hand.find((c) => c.id === selectedCardId) : undefined;
    return `<div class="actions">
      ${
        sel
          ? `<button class="primary" data-action="confirm-discard">Đánh ${cardName(sel)}</button>`
          : '<span class="hint">Nhấn vào một lá bài để chọn, nhấn nút để đánh ra.</span>'
      }
    </div>`;
  }
  // respond
  const eats = legalEats(state);
  const passLabel = phase.source === 'discard' ? 'Bỏ qua — bốc nọc' : 'Không ăn — nhường qua';
  return `<div class="actions">
    ${eats.map((o, i) => eatOptionHTML(o, i)).join('')}
    <button data-action="pass">${passLabel}</button>
  </div>`;
}

function humanSeatHTML(): string {
  const p = state.players[HUMAN];
  const canPick = state.phase.type === 'discard' && state.phase.player === HUMAN;
  const leftovers = leftoverCount(toCounts(p.hand));
  return `<section class="seat seat-bottom ${seatIsActive(HUMAN) ? 'active' : ''}">
    <div class="who">${PLAYER_NAMES[HUMAN]}
      ${state.dealer === HUMAN ? '<span class="badge">Cái</span>' : ''}
      ${chipsHTML(HUMAN)}
      <span class="hand-count" style="margin-left:auto">Bài lẻ: ${leftovers} lá</span>
    </div>
    ${meldsHTML(HUMAN)}
    <div class="hand">
      ${p.hand
        .map((c) =>
          cardHTML(
            c,
            `${canPick ? 'clickable' : ''} ${c.id === selectedCardId ? 'selected' : ''}`,
            `data-action="select-card" data-card-id="${c.id}"`,
          ),
        )
        .join('')}
    </div>
    ${humanActionsHTML()}
  </section>`;
}

function resultDialogHTML(): string {
  if (state.phase.type !== 'finished') return '';
  const { winner, score, reason } = state.phase;
  let body: string;
  if (winner === null || !score) {
    body = '<p>Hết nọc mà chưa ai tới — ván này hòa, không ai ăn điểm.</p>';
  } else {
    const rows = score.breakdown
      .map(
        (m) =>
          `<tr><td>${m.label}${m.concealed ? '' : ' <em>(lộ)</em>'}</td><td>${m.lenh}</td></tr>`,
      )
      .join('');
    body = `
      <p><strong>${PLAYER_NAMES[winner]}</strong> tới${reason === 'dealt-win' ? ' ngay khi chia bài (thiên tới)' : ''}!</p>
      <div class="result-cards">${state.players[winner].hand.map((c) => cardHTML(c, 'mini')).join('')}</div>
      <table class="score-table">
        ${rows}
        <tr><td>Tới</td><td>${score.winBonus}</td></tr>
        <tr class="total"><td>Tổng</td><td>${score.lenh} lệnh</td></tr>
      </table>
      <p style="margin-top:8px">Mỗi nhà thua trả ${score.lenh} điểm. ${PLAYER_NAMES[winner]} làm cái ván sau.</p>`;
  }
  return `<dialog id="result-dialog">
    <h2>Kết quả</h2>
    ${body}
    <div class="dialog-actions">
      <button data-action="close-dialog">Xem bàn</button>
      <button class="primary" data-action="new-game">Ván mới</button>
    </div>
  </dialog>`;
}

function helpDialogHTML(): string {
  return `<dialog id="help-dialog">
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
      <li>Người được mời có thể <strong>ăn</strong> (ghép với bài trên tay thành nhóm ≥ 3 lá, lật nhóm lên bàn rồi đánh ra 1 lá) hoặc <strong>bỏ qua</strong> và bốc nọc.</li>
      <li>Lá bốc từ nọc nếu không ăn sẽ được nhường cho nhà kế tiếp.</li>
      <li>Bất kỳ ai ghép được lá đang mời để hoàn thành toàn bộ bài thì <strong>tới</strong> ngay (máy tự phát hiện cho bạn).</li>
      <li>Hết nọc mà chưa ai tới thì hòa.</li>
    </ul>
    <h3>Tính lệnh</h3>
    <ul>
      <li>Đôi: 0 · Tướng lẻ / bộ ba màu / 3 Tốt: 1 · 4 Tốt khác màu: 4</li>
      <li>Ba lá giống: ăn lộ 1, giữ kín (khạp) 6 · Bốn lá giống (quằn): lộ 6, kín 8</li>
      <li>Tới được cộng thêm 3 lệnh; mỗi nhà thua trả đủ số lệnh.</li>
    </ul>
    <p style="margin-top:6px;opacity:.75">Bản chơi này lược giản một số luật ăn ép/ưu tiên của tứ sắc truyền thống — xem README để biết chi tiết.</p>
    <div class="dialog-actions">
      <button class="primary" data-action="close-dialog">Đóng</button>
    </div>
  </dialog>`;
}

function render(): void {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <header>
      <h1>Bài Tứ Sắc</h1>
      <span class="sub">4 người · bạn + 3 máy</span>
      <div class="controls">
        <button data-action="toggle-speed">${fast ? '⏩ Nhanh' : '▶ Chậm'}</button>
        <button data-action="help">Luật chơi</button>
        <button class="primary" data-action="new-game">Ván mới</button>
      </div>
    </header>
    <main class="table">
      ${opponentSeatHTML(2, 'top')}
      ${opponentSeatHTML(1, 'left')}
      ${centerHTML()}
      ${opponentSeatHTML(3, 'right')}
      ${humanSeatHTML()}
    </main>
    ${resultDialogHTML()}
    ${helpDialogHTML()}
  `;
  const log = document.getElementById('log');
  if (log) log.scrollTop = log.scrollHeight;
}

// ---------- events ----------

document.addEventListener('click', (ev) => {
  const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;
  const action = target.dataset.action!;

  switch (action) {
    case 'new-game': {
      (document.getElementById('result-dialog') as HTMLDialogElement | null)?.close();
      startGame();
      break;
    }
    case 'help': {
      (document.getElementById('help-dialog') as HTMLDialogElement | null)?.showModal();
      break;
    }
    case 'close-dialog': {
      target.closest('dialog')?.close();
      break;
    }
    case 'toggle-speed': {
      fast = !fast;
      render();
      break;
    }
    case 'select-card': {
      if (state.phase.type !== 'discard' || state.phase.player !== HUMAN) break;
      const id = Number(target.dataset.cardId);
      if (selectedCardId === id) {
        dispatch({ type: 'discard', player: HUMAN, cardId: id });
      } else {
        selectedCardId = id;
        render();
      }
      break;
    }
    case 'confirm-discard': {
      if (selectedCardId !== null && state.phase.type === 'discard' && state.phase.player === HUMAN) {
        dispatch({ type: 'discard', player: HUMAN, cardId: selectedCardId });
      }
      break;
    }
    case 'eat': {
      if (state.phase.type !== 'respond' || state.phase.player !== HUMAN) break;
      const opt = legalEats(state)[Number(target.dataset.opt)];
      if (opt) dispatch({ type: 'eat', player: HUMAN, option: opt });
      break;
    }
    case 'pass': {
      if (state.phase.type === 'respond' && state.phase.player === HUMAN) {
        dispatch({ type: 'pass', player: HUMAN });
      }
      break;
    }
  }
});

startGame();
