/**
 * Web UI for Bài Tứ Sắc. This layer only renders `GameState` and dispatches
 * engine actions — all rules live in src/core. A React Native or Capacitor
 * app would replace this folder and keep the core untouched.
 */

import './style.css';
import type { EatOption, GameState } from '../core';
import {
  aiChooseAction,
  applyAction,
  kindName,
  kindOf,
  leftoverCount,
  legalEats,
  newGame,
  toCounts,
  NUM_PLAYERS,
} from '../core';
import { cardHTML, kindCardHTML } from './cards';
import type { Locale } from './i18n';
import { STR } from './i18n';
import { tutorialSlides } from './tutorial';

const HUMAN = 0;

// ---------- session state ----------

let state: GameState;
let dealer = 0;
let selectedCardId: number | null = null;
let fast = false;
let aiTimerGen = 0;
let settled = false;
let chips: number[] = loadJSON('tusac-chips', new Array(NUM_PLAYERS).fill(0));
let locale: Locale = loadJSON<Locale>('tusac-locale', 'en');
let coach: boolean = loadJSON('tusac-coach', false);
let tutorialStep: number | null = null;

function t() {
  return STR[locale];
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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
  if (state.phase.player !== HUMAN) {
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
    saveJSON('tusac-chips', chips);
    dealer = winner; // winner deals the next round
  }
  render();
  (document.getElementById('result-dialog') as HTMLDialogElement | null)?.showModal();
}

// ---------- coach ----------

interface Suggestion {
  action: ReturnType<typeof aiChooseAction>;
  text: string;
}

function coachSuggestion(): Suggestion | null {
  if (!coach || state.phase.type === 'finished' || state.phase.player !== HUMAN) return null;
  const action = aiChooseAction(state);
  if (action.type === 'discard') {
    const card = state.players[HUMAN].hand.find((c) => c.id === action.cardId);
    return { action, text: t().hintDiscard(card ? kindName(kindOf(card)) : '?') };
  }
  if (action.type === 'eat') {
    return { action, text: t().hintEat(t().eatLabel[action.option.kind]) };
  }
  return { action, text: t().hintPass };
}

function sameEat(a: EatOption, b: EatOption): boolean {
  return (
    a.kind === b.kind &&
    a.fromHand.slice().sort().join() === b.fromHand.slice().sort().join()
  );
}

// ---------- rendering ----------

function backsHTML(n: number, max = 12): string {
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
  return `<span class="chips ${cls}">${t().points(v)}</span>`;
}

function seatIsActive(player: number): boolean {
  return state.phase.type !== 'finished' && state.phase.player === player;
}

function opponentSeatHTML(player: number, area: string): string {
  const p = state.players[player];
  return `<section class="seat seat-${area} ${seatIsActive(player) ? 'active' : ''}">
    <div class="who">${t().players[player]}
      ${state.dealer === player ? `<span class="badge">${t().dealer}</span>` : ''}
      ${chipsHTML(player)}
    </div>
    <div class="hand-count">${t().cardsInHand(p.hand.length)}</div>
    ${backsHTML(p.hand.length)}
    ${meldsHTML(player)}
  </section>`;
}

function statusText(): string {
  const phase = state.phase;
  const s = t();
  if (phase.type === 'finished') {
    if (phase.winner === null) return s.stDrawGame;
    return s.stWin(s.players[phase.winner], phase.score?.lenh ?? 0);
  }
  if (phase.type === 'discard') {
    return phase.player === HUMAN ? s.stYouDiscard : s.stAiDiscard(s.players[phase.player]);
  }
  const card = state.offered ? kindName(kindOf(state.offered)) : '';
  if (phase.player === HUMAN) {
    if (legalEats(state).length > 0) return s.stYouEat(card);
    return phase.source === 'discard' ? s.stYouCantDiscardSrc(card) : s.stYouCantWallSrc(card);
  }
  return s.stAiThinking(s.players[phase.player], card);
}

function centerHTML(): string {
  const offered = state.offered;
  const sourceLabel =
    state.phase.type === 'respond' && state.phase.source === 'wall' ? t().fromWall : t().fromDiscard;
  const dead = state.dead.slice(-14);
  return `<section class="center">
    <div class="status">${statusText()}</div>
    <div class="piles">
      <div class="pile">
        <div class="card back"></div>
        <span class="title">${t().wallCount(state.wall.length)}</span>
      </div>
      <div class="pile">
        ${offered ? cardHTML(offered, 'offered-big') : '<div class="card" style="opacity:.12"></div>'}
        <span class="title">${offered ? sourceLabel : '—'}</span>
      </div>
      <div class="pile" style="min-width:0">
        <div class="dead-cards">${dead.map((c) => cardHTML(c, 'mini')).join('') || `<span style="opacity:.4;font-size:.8rem">${t().empty}</span>`}</div>
        <span class="title">${t().deadCount(state.dead.length)}</span>
      </div>
    </div>
    <div class="log" id="log">${state.log
      .slice(-60)
      .map((e) => `<div>${t().logLine(e, t().players)}</div>`)
      .join('')}</div>
  </section>`;
}

function eatOptionHTML(opt: EatOption, index: number, suggested: boolean): string {
  const offered = state.offered!;
  return `<button class="eat-opt ${suggested ? 'suggest' : ''}" data-action="eat" data-opt="${index}">
    <span class="opt-label">${t().eatLabel[opt.kind]}</span>
    ${cardHTML(offered, 'mini')}
    ${opt.fromHand.map((k) => kindCardHTML(k)).join('')}
  </button>`;
}

function humanActionsHTML(sug: Suggestion | null): string {
  const phase = state.phase;
  if (phase.type === 'finished') {
    return `<div class="actions"><button class="primary" data-action="new-game">${t().newGame}</button></div>`;
  }
  if (phase.player !== HUMAN) return '';
  if (phase.type === 'discard') {
    const sel =
      selectedCardId !== null
        ? state.players[HUMAN].hand.find((c) => c.id === selectedCardId)
        : undefined;
    return `<div class="actions">
      ${
        sel
          ? `<button class="primary" data-action="confirm-discard">${t().discardBtn(kindName(kindOf(sel)))}</button>`
          : `<span class="hint">${t().discardHint}</span>`
      }
    </div>`;
  }
  const eats = legalEats(state);
  const passSuggested = sug?.action.type === 'pass';
  const passLabel = phase.source === 'discard' ? t().passDraw : t().passRelay;
  return `<div class="actions">
    ${eats
      .map((o, i) =>
        eatOptionHTML(o, i, sug?.action.type === 'eat' && sameEat(sug.action.option, o)),
      )
      .join('')}
    <button data-action="pass" class="${passSuggested ? 'suggest' : ''}">${passLabel}</button>
  </div>`;
}

function humanSeatHTML(): string {
  const p = state.players[HUMAN];
  const canPick = state.phase.type === 'discard' && state.phase.player === HUMAN;
  const sug = coachSuggestion();
  const suggestedId = sug?.action.type === 'discard' ? sug.action.cardId : null;
  const leftovers = leftoverCount(toCounts(p.hand));
  return `<section class="seat seat-bottom ${seatIsActive(HUMAN) ? 'active' : ''}">
    <div class="who">${t().players[HUMAN]}
      ${state.dealer === HUMAN ? `<span class="badge">${t().dealer}</span>` : ''}
      ${chipsHTML(HUMAN)}
      <span class="hand-count" style="margin-left:auto">${t().oddCards(leftovers)}</span>
    </div>
    ${meldsHTML(HUMAN)}
    <div class="hand">
      ${p.hand
        .map((c) =>
          cardHTML(
            c,
            `${canPick ? 'clickable' : ''} ${c.id === selectedCardId ? 'selected' : ''} ${c.id === suggestedId ? 'suggest' : ''}`,
            `data-action="select-card" data-card-id="${c.id}"`,
          ),
        )
        .join('')}
    </div>
    ${sug ? `<div class="hint-bar">${sug.text}</div>` : ''}
    ${humanActionsHTML(sug)}
  </section>`;
}

function resultDialogHTML(): string {
  if (state.phase.type !== 'finished') return '';
  const { winner, score, reason } = state.phase;
  const s = t();
  let body: string;
  if (winner === null || !score) {
    body = `<p>${s.drawLine}</p>`;
  } else {
    const rows = score.breakdown
      .map(
        (m) =>
          `<tr><td>${s.meldLabel(m.kind, m.uses)}${m.concealed ? '' : ` <em>${s.exposedTag}</em>`}</td><td>${m.lenh}</td></tr>`,
      )
      .join('');
    body = `
      <p>${s.winnerLine(s.players[winner], reason === 'dealt-win')}</p>
      <div class="result-cards">${state.players[winner].hand.map((c) => cardHTML(c, 'mini')).join('')}</div>
      <table class="score-table">
        ${rows}
        <tr><td>${s.winBonusRow}</td><td>${score.winBonus}</td></tr>
        <tr class="total"><td>${s.totalRow}</td><td>${score.lenh} lệnh</td></tr>
      </table>
      <p style="margin-top:8px">${s.paysLine(score.lenh, s.players[winner])}</p>`;
  }
  return `<dialog id="result-dialog">
    <h2>${s.resultTitle}</h2>
    ${body}
    <div class="dialog-actions">
      <button data-action="close-dialog">${s.viewTable}</button>
      <button class="primary" data-action="new-game">${s.newGame}</button>
    </div>
  </dialog>`;
}

function tutorialDialogHTML(): string {
  if (tutorialStep === null) return '';
  const slides = tutorialSlides(locale);
  const i = Math.min(tutorialStep, slides.length - 1);
  const slide = slides[i];
  const last = i === slides.length - 1;
  const practiceLabel = locale === 'vi' ? 'Chơi ván tập (bật gợi ý)' : 'Start practice game (hints on)';
  const dots = slides
    .map((_, d) => `<span class="dot ${d === i ? 'on' : ''}"></span>`)
    .join('');
  return `<dialog id="tutorial-dialog">
    <h2>${slide.title} <span class="tut-progress">${i + 1}/${slides.length}</span></h2>
    ${slide.body}
    <div class="tut-dots">${dots}</div>
    <div class="dialog-actions">
      <button data-action="tut-close">${locale === 'vi' ? 'Đóng' : 'Close'}</button>
      ${i > 0 ? `<button data-action="tut-prev">${locale === 'vi' ? '‹ Trước' : '‹ Back'}</button>` : ''}
      ${
        last
          ? `<button class="primary" data-action="tut-practice">${practiceLabel}</button>`
          : `<button class="primary" data-action="tut-next">${locale === 'vi' ? 'Tiếp ›' : 'Next ›'}</button>`
      }
    </div>
  </dialog>`;
}

function helpDialogHTML(): string {
  return `<dialog id="help-dialog">
    ${t().rulesHTML}
    <div class="dialog-actions">
      <button class="primary" data-action="close-dialog">${locale === 'vi' ? 'Đóng' : 'Close'}</button>
    </div>
  </dialog>`;
}

function render(): void {
  const app = document.getElementById('app')!;
  const s = t();
  app.innerHTML = `
    <header>
      <h1>Bài Tứ Sắc</h1>
      <span class="sub">${s.sub}</span>
      <div class="controls">
        <button data-action="toggle-lang">${s.langToggle}</button>
        <button data-action="toggle-speed">${fast ? s.speedFast : s.speedNormal}</button>
        <button data-action="toggle-coach">${coach ? s.hintsOn : s.hintsOff}</button>
        <button data-action="tutorial">${s.tutorial}</button>
        <button data-action="help">${s.rules}</button>
        <button class="primary" data-action="new-game">${s.newGame}</button>
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
    ${tutorialDialogHTML()}
  `;
  const log = document.getElementById('log');
  if (log) log.scrollTop = log.scrollHeight;
  if (tutorialStep !== null) {
    (document.getElementById('tutorial-dialog') as HTMLDialogElement | null)?.showModal();
  }
}

function openTutorial(step = 0): void {
  tutorialStep = step;
  render();
}

function closeTutorial(): void {
  tutorialStep = null;
  saveJSON('tusac-tutorial-seen', true);
  render();
  // Re-open the result dialog if the game is over behind the tutorial.
  if (state.phase.type === 'finished') {
    (document.getElementById('result-dialog') as HTMLDialogElement | null)?.showModal();
  }
}

// ---------- events ----------

document.addEventListener('click', (ev) => {
  const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;

  switch (target.dataset.action!) {
    case 'new-game':
      (document.getElementById('result-dialog') as HTMLDialogElement | null)?.close();
      startGame();
      break;
    case 'help':
      (document.getElementById('help-dialog') as HTMLDialogElement | null)?.showModal();
      break;
    case 'close-dialog':
      target.closest('dialog')?.close();
      break;
    case 'toggle-speed':
      fast = !fast;
      render();
      break;
    case 'toggle-lang':
      locale = locale === 'en' ? 'vi' : 'en';
      saveJSON('tusac-locale', locale);
      render();
      break;
    case 'toggle-coach':
      coach = !coach;
      saveJSON('tusac-coach', coach);
      render();
      break;
    case 'tutorial':
      openTutorial();
      break;
    case 'tut-next':
      if (tutorialStep !== null) openTutorial(tutorialStep + 1);
      break;
    case 'tut-prev':
      if (tutorialStep !== null) openTutorial(Math.max(0, tutorialStep - 1));
      break;
    case 'tut-close':
      closeTutorial();
      break;
    case 'tut-practice':
      tutorialStep = null;
      saveJSON('tusac-tutorial-seen', true);
      coach = true;
      saveJSON('tusac-coach', coach);
      startGame();
      break;
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
    case 'confirm-discard':
      if (selectedCardId !== null && state.phase.type === 'discard' && state.phase.player === HUMAN) {
        dispatch({ type: 'discard', player: HUMAN, cardId: selectedCardId });
      }
      break;
    case 'eat': {
      if (state.phase.type !== 'respond' || state.phase.player !== HUMAN) break;
      const opt = legalEats(state)[Number(target.dataset.opt)];
      if (opt) dispatch({ type: 'eat', player: HUMAN, option: opt });
      break;
    }
    case 'pass':
      if (state.phase.type === 'respond' && state.phase.player === HUMAN) {
        dispatch({ type: 'pass', player: HUMAN });
      }
      break;
  }
});

startGame();
if (!loadJSON('tusac-tutorial-seen', false)) {
  openTutorial();
}
