/**
 * Online multiplayer transport over WebRTC data channels (PeerJS).
 *
 * The host creates a room whose PeerJS ID is derived from a short game code;
 * guests connect to that ID with the same code. The host is authoritative:
 * it runs the engine (src/core), receives actions from guests, and broadcasts
 * each guest a redacted view of the state (their own hand real, other hands
 * and the wall replaced by dummies).
 *
 * Signaling uses the free public PeerJS cloud; game traffic is peer-to-peer.
 * For local testing, `?peer=host:port` in the URL points at a local
 * PeerServer (`npx peerjs --port 9099`).
 */

import { Peer } from 'peerjs';
import type { DataConnection, PeerJSOption } from 'peerjs';
import type { Action, Card, GameState } from '../core';
import { NUM_PLAYERS } from '../core';

export type NetMsg =
  | { t: 'hello'; name: string; token: string }
  | { t: 'lobby'; seats: (string | null)[]; yourSeat: number }
  | { t: 'state'; state: GameState; chips: number[]; names: (string | null)[] }
  | { t: 'action'; action: Action }
  | { t: 'chat'; seat: number; name: string; text: string }
  | { t: 'kicked' }
  | { t: 'full' };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export function makeCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function peerIdFor(code: string): string {
  return `tusac-v1-${code}`;
}

function peerOptions(): PeerJSOption {
  const override = new URLSearchParams(location.search).get('peer');
  if (!override) return {};
  const [host, port] = override.split(':');
  const local = host === 'localhost' || host === '127.0.0.1';
  return { host, port: Number(port ?? (local ? 9000 : 443)), path: '/', secure: !local };
}

/**
 * Hide private information from a guest's copy of the state: other players'
 * hands and the wall become dummy cards (lengths preserved — that is all the
 * UI shows). Once the game is finished the full state is sent so the winning
 * hand can be displayed.
 */
export function redactFor(state: GameState, viewer: number): GameState {
  if (state.phase.type === 'finished') return state;
  const dummy = (): Card => ({ id: -1, rank: 'general', color: 'red' });
  const clone = structuredClone(state);
  for (let p = 0; p < clone.players.length; p++) {
    if (p !== viewer) {
      clone.players[p].hand = clone.players[p].hand.map(dummy);
      // Face-down declared sets: others see only backs (counts preserved).
      clone.players[p].declared = clone.players[p].declared.map((m) => ({
        kind: 'triple',
        cards: m.cards.map(dummy),
      }));
    }
  }
  clone.wall = clone.wall.map(dummy);
  return clone;
}

export interface HostHandlers {
  onOpen(): void;
  onJoin(seat: number, name: string): void;
  onLeave(seat: number): void;
  onAction(seat: number, action: Action): void;
  onChat(seat: number, text: string): void;
  onError(message: string, type: string): void;
}

export class HostNet {
  private peer: Peer;
  private conns: (DataConnection | null)[] = new Array(NUM_PLAYERS).fill(null);
  /** Highest seat index guests may occupy is seatLimit - 1 (table size). */
  private seatLimit = NUM_PLAYERS;
  /**
   * Stable per-tab identity of the guest last seen in each seat. A guest who
   * refreshes reconnects with the same token and gets their seat back.
   */
  private tokens: (string | null)[] = new Array(NUM_PLAYERS).fill(null);

  constructor(code: string, private handlers: HostHandlers, savedTokens?: (string | null)[]) {
    if (savedTokens && savedTokens.length === NUM_PLAYERS) this.tokens = savedTokens.slice();
    this.peer = new Peer(peerIdFor(code), peerOptions());
    this.peer.on('open', () => handlers.onOpen());
    this.peer.on('error', (e) =>
      handlers.onError(
        String((e as Error).message ?? e),
        String((e as { type?: string }).type ?? ''),
      ),
    );
    this.peer.on('connection', (conn) => this.accept(conn));
  }

  private accept(conn: DataConnection): void {
    conn.on('data', (data) => {
      const msg = data as NetMsg;
      if (msg.t === 'hello') {
        const token = String(msg.token ?? '');
        const inRange = (i: number) => i > 0 && i < this.seatLimit;
        // Reclaim: same token gets its old seat back (never the host's).
        let seat = token ? this.tokens.indexOf(token) : -1;
        if (!inRange(seat)) seat = -1;
        if (seat < 0) {
          seat = this.conns.findIndex((c, i) => inRange(i) && c === null && this.tokens[i] === null);
        }
        if (seat < 0) {
          // No untouched seat: reuse one abandoned by a departed guest.
          seat = this.conns.findIndex((c, i) => inRange(i) && c === null);
        }
        if (seat < 0) {
          conn.send({ t: 'full' } satisfies NetMsg);
          setTimeout(() => conn.close(), 500);
          return;
        }
        this.conns[seat]?.close();
        this.conns[seat] = conn;
        this.tokens[seat] = token || null;
        conn.on('close', () => {
          if (this.conns[seat] === conn) {
            this.conns[seat] = null;
            this.handlers.onLeave(seat);
          }
        });
        this.handlers.onJoin(seat, String(msg.name).slice(0, 20) || `Player ${seat + 1}`);
      } else if (msg.t === 'action') {
        const seat = this.conns.indexOf(conn);
        if (seat > 0) this.handlers.onAction(seat, msg.action);
      } else if (msg.t === 'chat') {
        const seat = this.conns.indexOf(conn);
        if (seat > 0) this.handlers.onChat(seat, String(msg.text ?? ''));
      }
    });
  }

  getTokens(): (string | null)[] {
    return this.tokens.slice();
  }

  /** Restrict which seats guests may take (table size 3 or 4). */
  setSeatLimit(n: number): void {
    this.seatLimit = n;
  }

  /** Token of the guest currently connected in a seat (null for bots/host). */
  connectedTokenOf(seat: number): string | null {
    return this.conns[seat] ? this.tokens[seat] : null;
  }

  /** Remove a guest: tell them, drop the connection, forget their seat claim. */
  kick(seat: number): void {
    const conn = this.conns[seat];
    if (!conn) return;
    conn.send({ t: 'kicked' } satisfies NetMsg);
    this.tokens[seat] = null;
    setTimeout(() => conn.close(), 300);
  }

  connectedSeats(): boolean[] {
    return this.conns.map((c) => c !== null);
  }

  sendTo(seat: number, msg: NetMsg): void {
    this.conns[seat]?.send(msg);
  }

  close(): void {
    this.peer.destroy();
  }
}

export interface GuestHandlers {
  onLobby(seats: (string | null)[], yourSeat: number): void;
  onState(state: GameState, chips: number[], names: (string | null)[]): void;
  onChat(seat: number, name: string, text: string): void;
  onKicked(): void;
  onFull(): void;
  onClose(): void;
  onError(message: string, type: string): void;
}

export class GuestNet {
  private peer: Peer;
  private conn: DataConnection | null = null;

  constructor(code: string, name: string, token: string, private handlers: GuestHandlers) {
    this.peer = new Peer(peerOptions());
    this.peer.on('error', (e) =>
      handlers.onError(
        String((e as Error).message ?? e),
        String((e as { type?: string }).type ?? ''),
      ),
    );
    this.peer.on('open', () => {
      const conn = this.peer.connect(peerIdFor(code), { reliable: true });
      this.conn = conn;
      conn.on('open', () => conn.send({ t: 'hello', name, token } satisfies NetMsg));
      conn.on('close', () => handlers.onClose());
      conn.on('data', (data) => {
        const msg = data as NetMsg;
        if (msg.t === 'lobby') this.handlers.onLobby(msg.seats, msg.yourSeat);
        else if (msg.t === 'state') this.handlers.onState(msg.state, msg.chips, msg.names);
        else if (msg.t === 'chat') this.handlers.onChat(msg.seat, msg.name, msg.text);
        else if (msg.t === 'kicked') this.handlers.onKicked();
        else if (msg.t === 'full') this.handlers.onFull();
      });
    });
  }

  send(action: Action): void {
    this.conn?.send({ t: 'action', action } satisfies NetMsg);
  }

  sendChat(text: string): void {
    this.conn?.send({ t: 'chat', seat: -1, name: '', text } satisfies NetMsg);
  }

  close(): void {
    this.peer.destroy();
  }
}
