import type { GameState, GameAction, RuleSettings, GameMode } from './index'

// ── Client → Server ──────────────────────────────────────────────────────────
export type ClientMessage =
  | { type: 'CREATE'; name: string; mode: GameMode; ruleSettings: RuleSettings }
  | { type: 'JOIN'; name: string; roomId: string }
  | { type: 'RECONNECT'; roomId: string; token: string }
  | { type: 'START' }           // host (seat 0) starts the game from lobby
  | { type: 'ACTION'; action: GameAction }
  | { type: 'NEXT_ROUND_ACK' }  // client acknowledges win/score, advances to next round

// ── Server → Client ──────────────────────────────────────────────────────────
export type ServerMessage =
  | { type: 'JOINED'; seatIndex: number; token: string; roomId: string; state: GameState }
  | { type: 'STATE_UPDATE'; state: GameState }
  | { type: 'ERROR'; code: string; message: string }
  | { type: 'ROOM_CLOSED' }
