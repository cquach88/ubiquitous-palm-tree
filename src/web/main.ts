/**
 * Web UI for Bài Tứ Sắc. This layer only renders `GameState` and dispatches
 * engine actions — all rules live in src/core. A React Native or Capacitor
 * app would replace this folder and keep the core untouched.
 *
 * Modes:
 *  - solo:  you (seat 0) vs three local bots.
 *  - host:  you run the engine; friends join over WebRTC with a game code,
 *           empty seats are bots. You broadcast redacted views (see net.ts).
 *  - guest: you render views received from the host and send actions back.
 */

import './style.css';
import type { Action, Card, EatOption, GameState } from '../core';
import {
  aiChooseAction,
  applyAction,
  bestCoverGroups,
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
import { GuestNet, HostNet, makeCode, normalizeCode, redactFor } from './net';

// ---------- session state ----------

type Speed = 'slow' | 'normal' | 'fast';
type SortMode = 'rank' | 'color' | 'melds' | 'manual';
type NetMode = 'solo' | 'host' | 'guest';
type OnlineView = 'menu' | 'hostLobby' | 'joinForm' | 'guestLobby' | null;

const SPEED_MS: Record<Speed, number> = { slow: 1700, normal: 850, fast: 180 };
const SPEED_ORDER: Speed[] = ['slow', 'normal', 'fast'];
const SORT_ORDER: SortMode[] = ['rank', 'color', 'melds', 'manual'];

let state: GameState;
let dealer = 0;
let selectedCardId: number | null = null;
let aiTimerGen = 0;
let settled = false;
let chips: number[] = loadJSON('tusac-chips', new Array(NUM_PLAYERS).fill(0));
let locale: Locale = loadJSON<Locale>('tusac-locale', 'en');
let coach: boolean = loadJSON('tusac-coach', false);
let speed: Speed = loadJSON<Speed>('tusac-speed', 'normal');
let sortMode: SortMode = loadJSON<SortMode>('tusac-sort', 'rank');
let myName: string = loadJSON('tusac-name', '');
let tutorialStep: number | null = null;
let manualOrder: number[] = [];

// multiplayer
let netMode: NetMode = 'solo';
let mySeat = 0;
let host: HostNet | null = null;
let guest: GuestNet | null = null;
let mpNames: (string | null)[] = new Array(NUM_PLAYERS).fill(null);
let mpStarted = false;
let roomCode = '';
let onlineView: OnlineView = null;
let netError = '';
let nameDialogOpen = false;
let joinCodeDraft = '';
let nameDraft = '';
let copied = false;

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

// Per-tab session storage: survives a page refresh, gone when the tab closes.
function ssGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function ssSet(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function ssDel(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Stable per-tab identity so the host can give us our seat back on refresh. */
const myToken: string = (() => {
  let token = ssGet<string>('tusac-token');
  if (!token) {
    token = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Math.random()}${Date.now()}`;
    ssSet('tusac-token', token);
  }
  return token;
})();

interface OnlineSession {
  role: 'host' | 'guest';
  code: string;
}

interface HostSnapshot {
  state: GameState;
  chips: number[];
  mpNames: (string | null)[];
  tokens: (string | null)[];
  mpStarted: boolean;
  dealer: number;
  settled: boolean;
}

interface GuestSnapshot {
  state: GameState;
  chips: number[];
  mpNames: (string | null)[];
  mySeat: number;
}

let reconnecting = false;
let reconnectTries = 0;
const MAX_RECONNECT_TRIES = 20;

function clearOnlineSession(): void {
  ssDel('tusac-online');
  ssDel('tusac-hostgame');
  ssDel('tusac-guestgame');
}

function saveHostSnapshot(): void {
  if (netMode !== 'host') return;
  ssSet('tusac-online', { role: 'host', code: roomCode } satisfies OnlineSession);
  ssSet('tusac-hostgame', {
    state,
    chips,
    mpNames,
    tokens: host?.getTokens() ?? new Array(NUM_PLAYERS).fill(null),
    mpStarted,
    dealer,
    settled,
  } satisfies HostSnapshot);
}

function saveGuestSnapshot(): void {
  if (netMode !== 'guest') return;
  ssSet('tusac-online', { role: 'guest', code: roomCode } satisfies OnlineSession);
  ssSet('tusac-guestgame', { state, chips, mpNames, mySeat } satisfies GuestSnapshot);
}

function displayNames(): string[] {
  const names: string[] = [];
  for (let s = 0; s < NUM_PLAYERS; s++) {
    if (s === mySeat) names.push(myName || t().you);
    else if (netMode !== 'solo' && mpNames[s]) names.push(mpNames[s]!);
    else names.push(`${t().bot} ${s}`);
  }
  return names;
}

// ---------- game driving ----------

function isBotSeat(p: number): boolean {
  if (netMode === 'guest') return false;
  if (p === mySeat) return false;
  if (netMode === 'host') return !host!.connectedSeats()[p];
  return true;
}

function startGame(): void {
  aiTimerGen++;
  selectedCardId = null;
  settled = false;
  manualOrder = [];
  state = newGame({ seed: (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0, dealer });
  render();
  afterAction();
}

/** Route a local player's action: apply it (solo/host) or send it (guest). */
function userAction(action: Action): void {
  selectedCardId = null;
  if (netMode === 'guest') {
    guest?.send(action);
    render();
    return;
  }
  dispatch(action);
}

function dispatch(action: Action): void {
  state = applyAction(state, action);
  if (state.phase.type === 'finished') {
    onFinished();
    return;
  }
  render();
  broadcastState();
  afterAction();
}

function afterAction(): void {
  if (state.phase.type === 'finished') {
    onFinished();
    return;
  }
  if (netMode === 'guest') return;
  const p = state.phase.player;
  if (isBotSeat(p) && (onlineView === null || netMode === 'host')) {
    const gen = ++aiTimerGen;
    setTimeout(() => {
      if (gen !== aiTimerGen || state.phase.type === 'finished') return;
      dispatch(aiChooseAction(state));
    }, SPEED_MS[speed]);
  }
}

function onFinished(): void {
  if (settled) return;
  settled = true;
  if (netMode !== 'guest' && state.phase.type === 'finished') {
    const { winner, score } = state.phase;
    if (winner !== null && score) {
      // Winner-take-only tally: the winner banks their round score; nobody
      // else gains or loses anything.
      chips = chips.map((c, p) => (p === winner ? c + score.lenh : c));
      saveJSON('tusac-chips', chips);
      dealer = winner;
    }
  }
  render();
  broadcastState();
  (document.getElementById('result-dialog') as HTMLDialogElement | null)?.showModal();
}

// ---------- multiplayer ----------

function broadcastState(): void {
  if (netMode !== 'host' || !host) return;
  saveHostSnapshot();
  if (!mpStarted) return;
  const connected = host.connectedSeats();
  for (let s = 1; s < NUM_PLAYERS; s++) {
    if (connected[s]) {
      host.sendTo(s, { t: 'state', state: redactFor(state, s), chips, names: mpNames });
    }
  }
}

function broadcastLobby(): void {
  if (netMode !== 'host' || !host) return;
  saveHostSnapshot();
  const connected = host.connectedSeats();
  for (let s = 1; s < NUM_PLAYERS; s++) {
    if (connected[s]) host.sendTo(s, { t: 'lobby', seats: mpNames, yourSeat: s });
  }
}

function createHostNet(code: string, tokens?: (string | null)[]): void {
  host = new HostNet(
    code,
    {
      onOpen: () => {
        reconnecting = false;
        reconnectTries = 0;
        saveHostSnapshot();
        render();
      },
      onError: (message, type) => {
        // After a refresh the signaling server may briefly think our room ID
        // is still taken by the dead tab — retry until it frees up.
        if (type === 'unavailable-id' && netMode === 'host' && reconnectTries < MAX_RECONNECT_TRIES) {
          reconnecting = true;
          reconnectTries++;
          render();
          setTimeout(() => {
            if (netMode === 'host') {
              host?.close();
              createHostNet(code, tokens);
            }
          }, 2500);
          return;
        }
        netError = t().connError(message);
        render();
      },
      onJoin: (seat, name) => {
        mpNames[seat] = name;
        broadcastLobby();
        if (mpStarted) broadcastState();
        render();
      },
      onLeave: (seat) => {
        mpNames[seat] = null;
        broadcastLobby();
        if (mpStarted) {
          broadcastState();
          if (state.phase.type !== 'finished' && state.phase.player === seat) afterAction();
        }
        render();
      },
      onAction: (seat, action) => {
        if (netMode !== 'host' || !mpStarted) return;
        if (!action || action.player !== seat) return;
        try {
          dispatch(action);
        } catch {
          // Illegal/stale action — resync that guest.
          host?.sendTo(seat, { t: 'state', state: redactFor(state, seat), chips, names: mpNames });
        }
      },
    },
    tokens,
  );
}

function startHosting(): void {
  leaveOnline(false);
  netMode = 'host';
  mySeat = 0;
  roomCode = makeCode();
  mpNames = new Array(NUM_PLAYERS).fill(null);
  mpNames[0] = myName || 'Host';
  mpStarted = false;
  netError = '';
  onlineView = 'hostLobby';
  createHostNet(roomCode);
  saveHostSnapshot();
  render();
}

function createGuestNet(code: string): void {
  guest?.close();
  guest = new GuestNet(code, myName, myToken, {
    onLobby: (seats, yourSeat) => {
      reconnecting = false;
      reconnectTries = 0;
      mpNames = seats;
      mySeat = yourSeat;
      ssSet('tusac-online', { role: 'guest', code } satisfies OnlineSession);
      render();
    },
    onState: (s, c, names) => {
      reconnecting = false;
      reconnectTries = 0;
      state = s;
      chips = c;
      mpNames = names;
      if (!mpStarted) {
        mpStarted = true;
        if (onlineView === 'guestLobby') onlineView = null;
      }
      saveGuestSnapshot();
      if (state.phase.type === 'finished') {
        if (!settled) {
          settled = true;
          render();
          (document.getElementById('result-dialog') as HTMLDialogElement | null)?.showModal();
          return;
        }
      } else {
        settled = false;
      }
      render();
    },
    onFull: () => {
      netError = t().roomFull;
      clearOnlineSession();
      backToSolo();
    },
    onClose: () => guestConnectionLost(),
    onError: (message, type) => {
      if (type === 'peer-unavailable' || type === 'network' || type === 'disconnected') {
        guestConnectionLost();
        return;
      }
      netError = t().connError(message);
      render();
    },
  });
}

/** The host vanished (refresh, network blip). Keep the table and retry. */
function guestConnectionLost(): void {
  if (netMode !== 'guest') return;
  if (reconnectTries < MAX_RECONNECT_TRIES) {
    reconnecting = true;
    reconnectTries++;
    render();
    setTimeout(() => {
      if (netMode === 'guest') createGuestNet(roomCode);
    }, 2500);
    return;
  }
  netError = t().hostLeft;
  clearOnlineSession();
  backToSolo();
}

function joinGame(code: string): void {
  leaveOnline(false);
  netMode = 'guest';
  roomCode = code;
  mpStarted = false;
  netError = '';
  reconnecting = false;
  reconnectTries = 0;
  onlineView = 'guestLobby';
  createGuestNet(code);
  render();
}

function backToSolo(): void {
  leaveOnline(false);
  onlineView = netError ? 'menu' : null;
  startGame();
}

function leaveOnline(restart: boolean): void {
  host?.close();
  guest?.close();
  host = null;
  guest = null;
  netMode = 'solo';
  mySeat = 0;
  mpStarted = false;
  reconnecting = false;
  reconnectTries = 0;
  mpNames = new Array(NUM_PLAYERS).fill(null);
  roomCode = '';
  if (restart) {
    clearOnlineSession();
    onlineView = null;
    netError = '';
    startGame();
  }
}

/** Resume an online session after a page refresh (per-tab). */
function tryRestoreOnline(): boolean {
  const session = ssGet<OnlineSession>('tusac-online');
  if (!session || !session.code) return false;

  if (session.role === 'guest') {
    const snap = ssGet<GuestSnapshot>('tusac-guestgame');
    netMode = 'guest';
    roomCode = session.code;
    netError = '';
    if (snap) {
      state = snap.state;
      chips = snap.chips;
      mpNames = snap.mpNames;
      mySeat = snap.mySeat;
      mpStarted = true;
      settled = state.phase.type === 'finished';
      onlineView = null;
    } else {
      state = newGame({ seed: 1, dealer: 0 });
      mpStarted = false;
      onlineView = 'guestLobby';
    }
    reconnecting = true;
    createGuestNet(session.code);
    render();
    return true;
  }

  const snap = ssGet<HostSnapshot>('tusac-hostgame');
  if (!snap) return false;
  netMode = 'host';
  mySeat = 0;
  roomCode = session.code;
  mpNames = snap.mpNames;
  mpStarted = snap.mpStarted;
  dealer = snap.dealer;
  chips = snap.chips;
  settled = snap.settled;
  state = snap.state;
  netError = '';
  onlineView = mpStarted ? null : 'hostLobby';
  // Guests' connections died with the old tab; they will reconnect with
  // their tokens and get their seats back.
  for (let s = 1; s < NUM_PLAYERS; s++) mpNames[s] = null;
  createHostNet(roomCode, snap.tokens);
  render();
  if (mpStarted) afterAction();
  return true;
}

// ---------- coach ----------

interface Suggestion {
  action: Action;
  text: string;
}

function coachSuggestion(): Suggestion | null {
  if (!coach || state.phase.type === 'finished' || state.phase.player !== mySeat) return null;
  const action = aiChooseAction(state);
  if (action.type === 'discard') {
    const card = state.players[mySeat].hand.find((c) => c.id === action.cardId);
    return { action, text: t().hintDiscard(card ? kindName(kindOf(card)) : '?') };
  }
  if (action.type === 'eat') {
    return { action, text: t().hintEat(t().eatLabel[action.option.kind]) };
  }
  return { action, text: t().hintPass };
}

function sameEat(a: EatOption, b: EatOption): boolean {
  return (
    a.kind === b.kind && a.fromHand.slice().sort().join() === b.fromHand.slice().sort().join()
  );
}

// ---------- hand sorting ----------

const byKind = (a: Card, b: Card) => kindOf(a) - kindOf(b) || a.id - b.id;
const byColor = (a: Card, b: Card) => {
  const ka = kindOf(a), kb = kindOf(b);
  const keyA = (ka % 4) * 8 + Math.floor(ka / 4);
  const keyB = (kb % 4) * 8 + Math.floor(kb / 4);
  return keyA - keyB || a.id - b.id;
};

/** The player's hand in display order, plus indices that start a meld group. */
function displayedHand(): { cards: Card[]; starts: Set<number> } {
  const hand = state.players[mySeat].hand;
  if (sortMode === 'rank') return { cards: [...hand].sort(byKind), starts: new Set() };
  if (sortMode === 'color') return { cards: [...hand].sort(byColor), starts: new Set() };
  if (sortMode === 'melds') {
    const groups = bestCoverGroups(toCounts(hand));
    const pool = [...hand].sort(byKind);
    const cards: Card[] = [];
    const starts = new Set<number>();
    for (const meld of groups.melds) {
      starts.add(cards.length);
      for (const k of meld.uses) {
        const i = pool.findIndex((c) => kindOf(c) === k);
        cards.push(pool.splice(i, 1)[0]);
      }
    }
    if (pool.length > 0) starts.add(cards.length);
    cards.push(...pool);
    starts.delete(0);
    return { cards, starts };
  }
  // manual: keep known relative order, append newcomers in kind order
  const pos = new Map(manualOrder.map((id, i) => [id, i]));
  const cards = [...hand].sort(
    (a, b) =>
      (pos.get(a.id) ?? 10_000 + kindOf(a)) - (pos.get(b.id) ?? 10_000 + kindOf(b)) ||
      a.id - b.id,
  );
  manualOrder = cards.map((c) => c.id);
  return { cards, starts: new Set() };
}

function toManualOrder(order: number[]): void {
  if (sortMode !== 'manual') {
    sortMode = 'manual';
    saveJSON('tusac-sort', sortMode);
  }
  manualOrder = order;
  render();
}

/** Drag: move `dragId` in front of `targetId` (or to the end). */
function reorderManual(dragId: number, targetId: number | null): void {
  const without = displayedHand()
    .cards.map((c) => c.id)
    .filter((id) => id !== dragId);
  if (targetId === null || !without.includes(targetId)) {
    without.push(dragId);
  } else {
    without.splice(without.indexOf(targetId), 0, dragId);
  }
  toManualOrder(without);
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
  const N = displayNames();
  return `<section class="seat seat-${area} ${seatIsActive(player) ? 'active' : ''}">
    <div class="who">${N[player]}
      ${state.dealer === player ? `<span class="badge">${t().dealer}</span>` : ''}
      ${netMode !== 'solo' && mpNames[player] ? '<span class="badge net">●</span>' : ''}
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
  const N = displayNames();
  if (reconnecting) return s.reconnecting;
  if (phase.type === 'finished') {
    if (phase.winner === null) return s.stDrawGame;
    return s.stWin(N[phase.winner], phase.score?.lenh ?? 0);
  }
  if (phase.type === 'discard') {
    return phase.player === mySeat ? s.stYouDiscard : s.stAiDiscard(N[phase.player]);
  }
  const card = state.offered ? kindName(kindOf(state.offered)) : '';
  if (phase.player === mySeat) {
    if (legalEats(state).length > 0) return s.stYouEat(card);
    return phase.source === 'discard' ? s.stYouCantDiscardSrc(card) : s.stYouCantWallSrc(card);
  }
  return s.stAiThinking(N[phase.player], card);
}

function centerHTML(): string {
  const offered = state.offered;
  const sourceLabel =
    state.phase.type === 'respond' && state.phase.source === 'wall' ? t().fromWall : t().fromDiscard;
  const dead = state.dead.slice(-14);
  const N = displayNames();
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
      .map((e) => `<div>${t().logLine(e, N)}</div>`)
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
    if (netMode === 'guest') {
      return `<div class="actions"><span class="hint">${t().hostOnlyNewGame}</span></div>`;
    }
    return `<div class="actions"><button class="primary" data-action="new-game">${t().newGame}</button></div>`;
  }
  if (phase.player !== mySeat) return '';
  if (phase.type === 'discard') {
    const sel =
      selectedCardId !== null
        ? state.players[mySeat].hand.find((c) => c.id === selectedCardId)
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
  const canPick = state.phase.type === 'discard' && state.phase.player === mySeat;
  const sug = coachSuggestion();
  const suggestedId = sug?.action.type === 'discard' ? sug.action.cardId : null;
  const { cards, starts } = displayedHand();
  const leftovers = leftoverCount(toCounts(state.players[mySeat].hand));
  const N = displayNames();
  return `<section class="seat seat-bottom ${seatIsActive(mySeat) ? 'active' : ''}">
    <div class="who">${N[mySeat]}
      <button class="tiny" data-action="edit-name" title="${t().nameTitle}">${t().nameBtn}</button>
      ${state.dealer === mySeat ? `<span class="badge">${t().dealer}</span>` : ''}
      ${chipsHTML(mySeat)}
      <button class="tiny" data-action="cycle-sort" title="${t().dragHint}">${t().sortLabel[sortMode]}</button>
      <span class="hand-count" style="margin-left:auto">${t().oddCards(leftovers)}</span>
    </div>
    ${meldsHTML(mySeat)}
    <div class="hand" id="hand">
      ${cards
        .map((c, i) =>
          cardHTML(
            c,
            `${canPick ? 'clickable' : ''} ${c.id === selectedCardId ? 'selected' : ''} ${c.id === suggestedId ? 'suggest' : ''} ${starts.has(i) ? 'group-start' : ''}`,
            `data-action="select-card" data-card-id="${c.id}"`,
          ),
        )
        .join('')}
    </div>
    ${sug ? `<div class="hint-bar">${sug.text}</div>` : ''}
    ${humanActionsHTML(sug)}
  </section>`;
}

function tallyHTML(winner: number | null): string {
  const s = t();
  const N = displayNames();
  const rows = Array.from({ length: NUM_PLAYERS }, (_, p) => p)
    .sort((a, b) => chips[b] - chips[a])
    .map(
      (p) =>
        `<tr><td>${p === winner ? '🏆 ' : ''}${N[p]}</td><td>${chips[p]}</td></tr>`,
    )
    .join('');
  return `<h3>${s.tallyTitle}</h3><table class="score-table">${rows}</table>`;
}

function resultDialogHTML(): string {
  if (state.phase.type !== 'finished') return '';
  const { winner, score, reason } = state.phase;
  const s = t();
  const N = displayNames();
  let body: string;
  if (winner === null || !score) {
    body = `<p>${s.drawLine}</p>${tallyHTML(null)}`;
  } else {
    const rows = score.breakdown
      .map(
        (m) =>
          `<tr><td>${s.meldLabel(m.kind, m.uses)}${m.concealed ? '' : ` <em>${s.exposedTag}</em>`}</td><td>${m.lenh}</td></tr>`,
      )
      .join('');
    body = `
      <p>${s.winnerLine(N[winner], reason === 'dealt-win')}</p>
      <div class="result-cards">${state.players[winner].hand.map((c) => cardHTML(c, 'mini')).join('')}</div>
      <table class="score-table">
        ${rows}
        <tr><td>${s.winBonusRow}</td><td>${score.winBonus}</td></tr>
        <tr class="total"><td>${s.totalRow}</td><td>${score.lenh} lệnh</td></tr>
      </table>
      <p style="margin-top:8px">${s.paysLine(score.lenh, N[winner])}</p>
      ${tallyHTML(winner)}`;
  }
  const again =
    netMode === 'guest'
      ? `<span class="hint">${s.hostOnlyNewGame}</span>`
      : `<button class="primary" data-action="new-game">${s.newGame}</button>`;
  return `<dialog id="result-dialog">
    <h2>${s.resultTitle}</h2>
    ${body}
    <div class="dialog-actions">
      <button data-action="close-dialog">${s.viewTable}</button>
      ${again}
    </div>
  </dialog>`;
}

function onlineDialogHTML(): string {
  if (onlineView === null) return '';
  const s = t();
  const err = netError ? `<p class="net-error">${netError}</p>` : '';
  let body: string;
  if (onlineView === 'menu') {
    body = `${err}
      <div class="online-menu">
        <button class="primary" data-action="host-game">${s.hostGame}</button>
        <button data-action="show-join">${s.joinGame}</button>
      </div>`;
  } else if (onlineView === 'joinForm') {
    body = `${err}
      <label>${s.codeLabel}
        <input id="join-code" maxlength="6" autocomplete="off" spellcheck="false" value="${joinCodeDraft}" />
      </label>
      <div class="dialog-actions" style="justify-content:flex-start">
        <button class="primary" data-action="join-game">${s.join}</button>
        <button data-action="online-menu">${s.cancel}</button>
      </div>`;
  } else {
    // hostLobby / guestLobby
    const N = displayNames();
    const list = Array.from({ length: NUM_PLAYERS }, (_, seat) => {
      const filled = seat === 0 || mpNames[seat];
      const label = seat === mySeat ? `${N[seat]} ★` : filled ? (mpNames[seat] ?? N[seat]) : s.emptySeat;
      return `<li class="${filled ? 'filled' : 'empty'}">${seat + 1}. ${label}</li>`;
    }).join('');
    const codeBlock =
      onlineView === 'hostLobby'
        ? `<div class="code-row"><span class="game-code">${roomCode}</span>
             <button data-action="copy-code">${copied ? s.copied : s.copy}</button></div>
           <p class="hint">${s.waitingForPlayers}</p>`
        : `<p class="hint">${roomCode ? s.onlineBadge(roomCode) : ''} — ${mpStarted ? '' : s.waitingHost}</p>`;
    const startBtn =
      onlineView === 'hostLobby' && !mpStarted
        ? `<button class="primary" data-action="start-online">${s.startOnline}</button>`
        : '';
    body = `${err}
      ${codeBlock}
      <h3>${s.playersInLobby}</h3>
      <ul class="lobby-list">${list}</ul>
      <div class="dialog-actions">
        <button data-action="leave-online">${s.leave}</button>
        <button data-action="close-dialog">${s.viewTable}</button>
        ${startBtn}
      </div>`;
  }
  return `<dialog id="online-dialog"><h2>${s.onlineTitle}</h2>${body}</dialog>`;
}

function nameDialogHTML(): string {
  if (!nameDialogOpen) return '';
  const s = t();
  return `<dialog id="name-dialog">
    <h2>${s.nameTitle}</h2>
    <input id="name-input" maxlength="20" placeholder="${s.namePlaceholder}" value="${nameDraft}" />
    <div class="dialog-actions">
      <button data-action="close-dialog">${s.cancel}</button>
      <button class="primary" data-action="save-name">${s.save}</button>
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
  const dots = slides.map((_, d) => `<span class="dot ${d === i ? 'on' : ''}"></span>`).join('');
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
  const left = (mySeat + 1) % NUM_PLAYERS;
  const top = (mySeat + 2) % NUM_PLAYERS;
  const right = (mySeat + 3) % NUM_PLAYERS;
  const onlineLabel = netMode === 'solo' ? s.online : s.onlineBadge(roomCode);
  app.innerHTML = `
    <header>
      <h1>Bài Tứ Sắc</h1>
      <span class="sub">${s.sub}</span>
      <div class="controls">
        <button data-action="toggle-lang">${s.langToggle}</button>
        ${netMode === 'guest' ? '' : `<button data-action="toggle-speed">${s.speedLabel[speed]}</button>`}
        <button data-action="toggle-coach">${coach ? s.hintsOn : s.hintsOff}</button>
        <button data-action="tutorial">${s.tutorial}</button>
        <button data-action="help">${s.rules}</button>
        <button data-action="online" class="${netMode !== 'solo' ? 'online-active' : ''}">${onlineLabel}</button>
        ${netMode === 'guest' ? '' : `<button class="primary" data-action="new-game">${s.newGame}</button>`}
      </div>
    </header>
    <main class="table">
      ${opponentSeatHTML(top, 'top')}
      ${opponentSeatHTML(left, 'left')}
      ${centerHTML()}
      ${opponentSeatHTML(right, 'right')}
      ${humanSeatHTML()}
    </main>
    ${resultDialogHTML()}
    ${helpDialogHTML()}
    ${tutorialDialogHTML()}
    ${onlineDialogHTML()}
    ${nameDialogHTML()}
  `;
  const log = document.getElementById('log');
  if (log) log.scrollTop = log.scrollHeight;
  reattachDrag();
  if (tutorialStep !== null) {
    (document.getElementById('tutorial-dialog') as HTMLDialogElement | null)?.showModal();
  }
  if (onlineView !== null) {
    (document.getElementById('online-dialog') as HTMLDialogElement | null)?.showModal();
  }
  if (nameDialogOpen) {
    (document.getElementById('name-dialog') as HTMLDialogElement | null)?.showModal();
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
  if (state.phase.type === 'finished') {
    (document.getElementById('result-dialog') as HTMLDialogElement | null)?.showModal();
  }
}

// ---------- events ----------

document.addEventListener('input', (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.id === 'join-code') joinCodeDraft = normalizeCode(el.value);
  if (el.id === 'name-input') nameDraft = el.value;
});

// Keep UI state in sync when dialogs close via Escape.
document.addEventListener(
  'close',
  (ev) => {
    const id = (ev.target as HTMLElement).id;
    if (id === 'online-dialog') onlineView = null;
    if (id === 'name-dialog') nameDialogOpen = false;
    if (id === 'tutorial-dialog' && tutorialStep !== null) {
      tutorialStep = null;
      saveJSON('tusac-tutorial-seen', true);
    }
  },
  true,
);

// Drag-to-reorder the hand. Implemented with pointer events (not HTML5
// drag-and-drop) so it works with both mouse and touch. A small horizontal
// threshold separates drags from taps; vertical gestures stay free for
// page scrolling on phones (touch-action: pan-y on the cards).
interface DragState {
  id: number;
  startX: number;
  startY: number;
  pointerId: number;
  el: HTMLElement;
  active: boolean;
  transform: string;
}
let drag: DragState | null = null;
let suppressNextClick = false;

function dropTargetAt(x: number, y: number): HTMLElement | null {
  return (
    (document
      .elementsFromPoint(x, y)
      .find(
        (el) => el instanceof HTMLElement && el.matches('#hand .card') && el !== drag?.el,
      ) as HTMLElement | undefined) ?? null
  );
}

function clearDropMarkers(): void {
  document.querySelectorAll('#hand .card.drop-before').forEach((el) => el.classList.remove('drop-before'));
}

document.addEventListener('pointerdown', (ev) => {
  const card = (ev.target as HTMLElement).closest<HTMLElement>('#hand .card');
  if (!card || !ev.isPrimary) return;
  drag = {
    id: Number(card.dataset.cardId),
    startX: ev.clientX,
    startY: ev.clientY,
    pointerId: ev.pointerId,
    el: card,
    active: false,
    transform: '',
  };
});

document.addEventListener(
  'pointermove',
  (ev) => {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const dx = ev.clientX - drag.startX;
    const dy = ev.clientY - drag.startY;
    if (!drag.active) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      drag.active = true;
      drag.el.classList.add('dragging');
    }
    ev.preventDefault();
    drag.transform = `translate(${dx}px, ${dy}px)`;
    drag.el.style.transform = drag.transform;
    clearDropMarkers();
    dropTargetAt(ev.clientX, ev.clientY)?.classList.add('drop-before');
  },
  { passive: false },
);

function endDrag(ev: PointerEvent, apply: boolean): void {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  const d = drag;
  drag = null;
  clearDropMarkers();
  d.el.classList.remove('dragging');
  d.el.style.transform = '';
  if (!d.active) return;
  // A click may fire right after pointerup (same task); swallow it, but clear
  // the flag afterwards in case the browser doesn't dispatch one.
  suppressNextClick = true;
  setTimeout(() => {
    suppressNextClick = false;
  }, 0);
  if (apply) {
    const over = dropTargetAt(ev.clientX, ev.clientY);
    const overHand = document.elementsFromPoint(ev.clientX, ev.clientY).some((el) => el.id === 'hand');
    const targetId = over ? Number(over.dataset.cardId) : null;
    if (over || overHand) reorderManual(d.id, targetId);
    else render();
  } else {
    render();
  }
}

document.addEventListener('pointerup', (ev) => endDrag(ev, true));
document.addEventListener('pointercancel', (ev) => endDrag(ev, false));

/** Keep an in-flight drag attached to the fresh DOM after a re-render. */
function reattachDrag(): void {
  if (!drag) return;
  const el = document.querySelector<HTMLElement>(`#hand .card[data-card-id="${drag.id}"]`);
  if (!el) {
    drag = null;
    return;
  }
  drag.el = el;
  if (drag.active) {
    el.classList.add('dragging');
    el.style.transform = drag.transform;
  }
}

document.addEventListener('click', (ev) => {
  const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;

  switch (target.dataset.action!) {
    case 'new-game':
      if (netMode === 'guest') break;
      (document.getElementById('result-dialog') as HTMLDialogElement | null)?.close();
      startGame();
      break;
    case 'help':
      (document.getElementById('help-dialog') as HTMLDialogElement | null)?.showModal();
      break;
    case 'close-dialog':
      target.closest('dialog')?.close();
      render();
      break;
    case 'toggle-speed': {
      speed = SPEED_ORDER[(SPEED_ORDER.indexOf(speed) + 1) % SPEED_ORDER.length];
      saveJSON('tusac-speed', speed);
      render();
      break;
    }
    case 'cycle-sort': {
      sortMode = SORT_ORDER[(SORT_ORDER.indexOf(sortMode) + 1) % SORT_ORDER.length];
      saveJSON('tusac-sort', sortMode);
      if (sortMode === 'manual') manualOrder = displayedHand().cards.map((c) => c.id);
      render();
      break;
    }
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
    case 'edit-name':
      nameDraft = myName;
      nameDialogOpen = true;
      render();
      break;
    case 'save-name': {
      myName = nameDraft.trim().slice(0, 20);
      saveJSON('tusac-name', myName);
      nameDialogOpen = false;
      if (netMode === 'host') {
        mpNames[0] = myName || 'Host';
        broadcastLobby();
        broadcastState();
      }
      render();
      break;
    }
    case 'online':
      netError = '';
      onlineView = netMode === 'solo' ? 'menu' : netMode === 'host' ? 'hostLobby' : 'guestLobby';
      render();
      break;
    case 'online-menu':
      onlineView = 'menu';
      render();
      break;
    case 'show-join':
      onlineView = 'joinForm';
      render();
      break;
    case 'host-game':
      startHosting();
      break;
    case 'join-game': {
      const code = normalizeCode(joinCodeDraft);
      if (code.length === 6) joinGame(code);
      break;
    }
    case 'start-online':
      if (netMode === 'host' && !mpStarted) {
        mpStarted = true;
        onlineView = null;
        dealer = 0;
        startGame();
        broadcastState();
      }
      break;
    case 'copy-code':
      navigator.clipboard?.writeText(roomCode).then(
        () => {
          copied = true;
          render();
          setTimeout(() => {
            copied = false;
            render();
          }, 1500);
        },
        () => {},
      );
      break;
    case 'leave-online':
      (document.getElementById('online-dialog') as HTMLDialogElement | null)?.close();
      leaveOnline(true);
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
      if (netMode === 'solo') startGame();
      else render();
      break;
    case 'select-card': {
      if (suppressNextClick) {
        suppressNextClick = false;
        break;
      }
      if (state.phase.type !== 'discard' || state.phase.player !== mySeat) break;
      const id = Number(target.dataset.cardId);
      if (selectedCardId === id) {
        userAction({ type: 'discard', player: mySeat, cardId: id });
      } else {
        selectedCardId = id;
        render();
      }
      break;
    }
    case 'confirm-discard':
      if (selectedCardId !== null && state.phase.type === 'discard' && state.phase.player === mySeat) {
        userAction({ type: 'discard', player: mySeat, cardId: selectedCardId });
      }
      break;
    case 'eat': {
      if (state.phase.type !== 'respond' || state.phase.player !== mySeat) break;
      const opt = legalEats(state)[Number(target.dataset.opt)];
      if (opt) userAction({ type: 'eat', player: mySeat, option: opt });
      break;
    }
    case 'pass':
      if (state.phase.type === 'respond' && state.phase.player === mySeat) {
        userAction({ type: 'pass', player: mySeat });
      }
      break;
  }
});

if (!tryRestoreOnline()) {
  startGame();
  if (!loadJSON('tusac-tutorial-seen', false)) {
    openTutorial();
  }
}
