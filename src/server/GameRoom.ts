import type { GameState, GameAction, RuleSettings, GameMode } from '../types'
import { gameReducer, createInitialState } from '../engine/stateMachine'
import { botSelectDiscard, botDecideClaim, botDecideAfterDraw } from '../ai/botPlayer'

const BOT_THINK_MS = 900
const BOT_CLAIM_MS = 700

// WebSocket-like interface so GameRoom can be tested without the `ws` package
export interface WSLike {
  send(data: string): void
  terminate(): void
  readyState: number
}

export const WS_OPEN = 1

interface Slot {
  ws: WSLike
  token: string
  name: string
  connected: boolean
}

export class GameRoom {
  readonly id: string
  private state: GameState
  private slots: (Slot | null)[] = [null, null, null, null]
  private humanSeats = new Set<number>()
  private phaseTimer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false
  private started = false

  constructor(id: string, mode: GameMode, ruleSettings: RuleSettings) {
    this.id = id
    const names = ['Player 1', 'Player 2', 'Player 3', 'Player 4']
    this.state = createInitialState(names, mode, ruleSettings)
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** Join as a human player. Returns seatIndex, or -1 if room is full. */
  join(ws: WSLike, token: string, name: string): number {
    const seat = this.slots.findIndex(s => s === null)
    if (seat === -1) return -1
    this.slots[seat] = { ws, token, name, connected: true }
    this.humanSeats.add(seat)
    this.updatePlayerName(seat, name)
    this.broadcast()
    return seat
  }

  /** Reconnect with an existing token. Returns seatIndex, or -1 if token invalid. */
  reconnect(ws: WSLike, token: string): number {
    const seat = this.slots.findIndex(s => s !== null && s.token === token)
    if (seat === -1) return -1
    const slot = this.slots[seat]!
    this.slots[seat] = { ...slot, ws, connected: true }
    return seat
  }

  /** Mark a player as disconnected (slot preserved for reconnect). */
  disconnect(token: string): void {
    const seat = this.slots.findIndex(s => s?.token === token)
    if (seat !== -1 && this.slots[seat]) {
      this.slots[seat]!.connected = false
    }
  }

  get isEmpty(): boolean {
    return this.slots.every(s => !s?.connected)
  }

  getState(): GameState {
    return this.state
  }

  /** Start the game (only seat 0 / host can call this). */
  startGame(seatIndex: number): boolean {
    if (seatIndex !== 0 || this.started) return false
    this.started = true
    this.apply({ type: 'START_GAME' })
    return true
  }

  destroy(): void {
    this.destroyed = true
    this.clearTimer()
  }

  /** Returns the seat index for a given token, or -1 if not found. */
  getSeatByToken(token: string): number {
    return this.slots.findIndex(s => s?.token === token)
  }

  /** Returns true if a connected player already has this name (case-insensitive). */
  hasName(name: string): boolean {
    const lower = name.toLowerCase()
    return this.slots.some(s => s?.connected && s.name.toLowerCase() === lower)
  }

  // ── Action handling ─────────────────────────────────────────────────────────

  handleAction(action: GameAction, senderSeat: number): void {
    if (!this.validateAction(action, senderSeat)) return
    this.apply(action)
  }

  private validateAction(action: GameAction, senderSeat: number): boolean {
    const playerActions = [
      'DISCARD_TILE', 'CLAIM_CHOW', 'CLAIM_PUNG', 'CLAIM_KONG',
      'DECLARE_CLOSED_KONG', 'EXTEND_KONG', 'SKIP_CLAIM',
    ]
    if (playerActions.includes(action.type)) {
      return (action.playerIndex ?? -1) === senderSeat
    }
    if (action.type === 'DECLARE_WIN') {
      if (action.winners) return action.winners.includes(senderSeat)
      return (action.playerIndex ?? -1) === senderSeat
    }
    if (action.type === 'NEXT_ROUND') return true
    return false // unknown action types rejected
  }

  // ── Private state management ────────────────────────────────────────────────

  private apply(action: GameAction): void {
    this.state = gameReducer(this.state, action)
    this.broadcast()
    this.schedulePhase()
  }

  private broadcast(): void {
    for (let i = 0; i < 4; i++) {
      const slot = this.slots[i]
      if (!slot?.connected || slot.ws.readyState !== WS_OPEN) continue
      const sanitized = sanitizeStateFor(this.state, i)
      try {
        slot.ws.send(JSON.stringify({ type: 'STATE_UPDATE', state: sanitized }))
      } catch { /* ignore disconnected client */ }
    }
  }

  private clearTimer(): void {
    if (this.phaseTimer !== null) {
      clearTimeout(this.phaseTimer)
      this.phaseTimer = null
    }
  }

  private isBot(seatIndex: number): boolean {
    return !this.humanSeats.has(seatIndex)
  }

  private schedulePhase(): void {
    if (this.destroyed) return
    this.clearTimer()
    const { phase, round, players, humanPlayerIndex } = this.state

    switch (phase) {
      case 'shuffle':
        this.phaseTimer = setTimeout(() => {
          if (this.state.phase !== 'shuffle') return
          this.apply({ type: 'SHUFFLE_COMPLETE' })
        }, 4500)
        break

      case 'dealing':
        this.phaseTimer = setTimeout(() => {
          if (this.state.phase !== 'dealing') return
          this.apply({ type: 'DEAL_COMPLETE' })
        }, 1500)
        break

      case 'playing':
        this.phaseTimer = setTimeout(() => {
          if (this.state.phase !== 'playing') return
          this.apply({ type: 'DRAW_TILE' })
        }, 300)
        break

      case 'awaiting_discard': {
        const ti = round.turnIndex
        if (!this.isBot(ti)) break // human handles their own discard
        this.phaseTimer = setTimeout(() => {
          if (this.state.phase !== 'awaiting_discard') return
          const tile = botSelectDiscard(this.state.players[ti], this.state)
          this.apply({ type: 'DISCARD_TILE', playerIndex: ti, tile })
        }, BOT_THINK_MS + Math.random() * 400)
        break
      }

      case 'bot_turn': {
        const ti = round.turnIndex
        if (!this.isBot(ti)) break // human handles their own turn
        this.phaseTimer = setTimeout(() => {
          if (this.state.phase !== 'bot_turn') return
          const action = botDecideAfterDraw(ti, this.state)
          if (action) { this.apply(action); return }
          const tile = botSelectDiscard(this.state.players[ti], this.state)
          this.apply({ type: 'DISCARD_TILE', playerIndex: ti, tile })
        }, BOT_THINK_MS + Math.random() * 400)
        break
      }

      case 'awaiting_action': {
        const botPendingSeats = players
          .map((_, i) => i)
          .filter(i => this.isBot(i) && round.pendingClaims[i] !== null)

        if (botPendingSeats.length === 0) break

        const anyCanWin = players.some((_, i) => round.pendingClaims[i]?.canWin)
        const humanHasClaim = this.humanSeats.size > 0 &&
          [...this.humanSeats].some(i => round.pendingClaims[i] !== null)
        const delay = anyCanWin ? BOT_CLAIM_MS * 4 : humanHasClaim ? BOT_CLAIM_MS * 2 : BOT_CLAIM_MS

        this.phaseTimer = setTimeout(() => {
          if (this.state.phase !== 'awaiting_action') return
          const latest = this.state

          // Collect bot winners
          const botWinners = botPendingSeats.filter(i => latest.round.pendingClaims[i]?.canWin)
          if (botWinners.length > 0) {
            if (latest.ruleSettings.multipleWinners) {
              const humanWinners = [...this.humanSeats].filter(i => latest.round.pendingClaims[i]?.canWin)
              const winners = [...humanWinners, ...botWinners]
              this.apply({ type: 'DECLARE_WIN', winners })
            } else {
              this.apply({ type: 'DECLARE_WIN', playerIndex: botWinners[0] })
            }
            return
          }

          // Skip all bots if anyone still has canWin option
          if (latest.players.some((_, i) => latest.round.pendingClaims[i]?.canWin)) {
            for (const i of botPendingSeats) {
              if (this.state.round.pendingClaims[i] !== null && this.state.phase === 'awaiting_action') {
                this.apply({ type: 'SKIP_CLAIM', playerIndex: i })
              }
            }
            return
          }

          // Non-win bot claims
          for (const i of botPendingSeats) {
            if (this.state.phase !== 'awaiting_action') break
            if (this.state.round.pendingClaims[i] === null) continue
            const disc = this.state.round.lastDiscard
            const discBy = this.state.round.lastDiscardBy ?? 0
            const action = disc
              ? botDecideClaim(i, this.state, disc, discBy)
              : null
            const actionToApply = action ?? { type: 'SKIP_CLAIM' as const, playerIndex: i }
            this.apply(actionToApply)
          }
        }, delay)
        break
      }

      case 'win_declared':
        // Give clients 30s to view winning hand, then advance
        this.phaseTimer = setTimeout(() => {
          if (this.state.phase !== 'win_declared') return
          this.apply({ type: 'NEXT_ROUND' })
        }, 30000)
        break

      case 'scoring':
        this.phaseTimer = setTimeout(() => {
          if (this.state.phase !== 'scoring') return
          this.apply({ type: 'NEXT_ROUND' })
        }, 500)
        break

      case 'round_end':
        this.phaseTimer = setTimeout(() => {
          if (this.state.phase !== 'round_end') return
          this.apply({ type: 'NEXT_ROUND' })
        }, 1000)
        break
    }
  }

  private updatePlayerName(seat: number, name: string): void {
    this.state = {
      ...this.state,
      players: this.state.players.map((p, i) =>
        i === seat ? { ...p, name, type: 'human' as const } : p
      ),
    }
  }
}

// ── State sanitization ────────────────────────────────────────────────────────

/** Strip opponent hand tiles before sending state to a specific client. */
export function sanitizeStateFor(state: GameState, viewerSeat: number): GameState {
  const hiddenTile = { id: 'hidden', suit: 'honor' as const, value: 0 }
  // If it's this viewer's turn but phase is bot_turn (state machine only knows seat 0 as human),
  // rewrite to awaiting_discard so the UI shows discard options
  const phase = state.phase === 'bot_turn' && state.round.turnIndex === viewerSeat
    ? 'awaiting_discard'
    : state.phase
  return {
    ...state,
    phase,
    humanPlayerIndex: viewerSeat,
    players: state.players.map((p, i) => {
      if (i === viewerSeat) return p
      return {
        ...p,
        hand: p.hand.map(() => ({ ...hiddenTile })),
        drawnTile: p.drawnTile ? { ...hiddenTile } : null,
      }
    }),
  }
}
