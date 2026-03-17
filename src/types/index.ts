// ─── Tiles ───────────────────────────────────────────────────────────────────

export type Suit = 'man' | 'pin' | 'sou' | 'honor' | 'bonus'

export type WindValue = 1 | 2 | 3 | 4   // east south west north
export type DragonValue = 5 | 6 | 7     // chun(red) hatsu(green) haku(white)

export interface Tile {
  id: string        // e.g. "man-1-0", "honor-1-2"
  suit: Suit
  value: number     // 1-9 for man/pin/sou; 1-4 wind, 5-7 dragon, 1-8 bonus
}

// ─── Melds ───────────────────────────────────────────────────────────────────

export type MeldType = 'chow' | 'pung' | 'kong' | 'pair'

export type SeatWind = 'east' | 'south' | 'west' | 'north'

export interface Meld {
  type: MeldType
  tiles: Tile[]
  concealed: boolean    // true = closed kong declared from hand
  claimedFrom?: number  // player index who discarded
}

// ─── Players ─────────────────────────────────────────────────────────────────

export type PlayerType = 'human' | 'bot'

export interface Player {
  id: string
  name: string
  type: PlayerType
  seatWind: SeatWind
  score: number
  hand: Tile[]
  melds: Meld[]
  discards: Tile[]
  bonusTiles: Tile[]
  drawnTile: Tile | null
  isDealer: boolean
}

// ─── Rule settings ────────────────────────────────────────────────────────────

export interface RuleSettings {
  minFanToWin: number        // 0 = none, 1 = at least 1 fan, 3 = common HK standard
  sevenPairs: boolean        // allow 七對子 as winning hand
  flowers: boolean           // count flower/season bonus tiles
  multipleWinners: boolean   // allow multiple players to win on the same discard
  turnTimeLimit: number      // seconds per turn for human, 0 = no limit
  pointsPerFan: number       // points awarded per fan (e.g. 1 = 3 fans → 3 pts)
}

export const DEFAULT_RULES: RuleSettings = {
  minFanToWin: 3,
  sevenPairs: true,
  flowers: true,
  multipleWinners: true,
  turnTimeLimit: 45,
  pointsPerFan: 1,
}

// ─── Game state ───────────────────────────────────────────────────────────────

export type GameMode = 'full' | 'half'

export type GamePhase =
  | 'idle'
  | 'shuffle'
  | 'dealing'
  | 'playing'
  | 'awaiting_action'   // human can respond to a discard
  | 'awaiting_discard'  // human must discard
  | 'bot_turn'
  | 'win_declared'
  | 'scoring'
  | 'round_end'
  | 'game_over'

export type PrevailingWind = SeatWind

export interface PendingClaim {
  canChow: Tile[][]   // possible chow combos
  canPung: boolean
  canKong: boolean
  canWin: boolean
}

export interface RoundState {
  roundNumber: number
  prevailingWind: PrevailingWind
  windRoundIndex: number      // 0=East 1=South 2=West 3=North
  dealerIndex: number         // index into players[]
  dealerConsecutiveWins: number
  wall: Tile[]
  deadWall: Tile[]            // kept for type compat; unused in HK mahjong
  doraIndicators: Tile[]      // unused in HK mahjong
  turnIndex: number
  lastDiscard: Tile | null
  lastDiscardBy: number | null
  kongPending: boolean        // replacement draw needed
  pendingClaims: (PendingClaim | null)[]  // per player
  skipCount: number           // how many players skipped current discard
}

export interface RoundResult {
  roundNumber: number
  winner: number | null       // primary winner (null = draw)
  multiWinners?: number[]     // set when multiple players win on same discard
  loser: number | null        // null = self-draw or draw
  winTile: Tile | null
  scoreDeltas: number[]
  fanBreakdown: FanBreakdown | null
  dealerWon: boolean
  isDraw: boolean
}

export interface GameState {
  phase: GamePhase
  mode: GameMode
  rulesetId: string
  ruleSettings: RuleSettings
  players: Player[]
  round: RoundState
  roundHistory: RoundResult[]
  maxWindRounds: number   // 2 for half, 4 for full
  humanPlayerIndex: number
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface Fan {
  id: string
  nameEn: string
  nameZh: string
  fan: number
  isLimit?: boolean
}

export interface FanBreakdown {
  fans: Fan[]
  totalFan: number
  basePoints: number
  payments: number[]   // signed delta per player
}

export interface ScoringContext {
  isZimo: boolean
  isDealer: boolean
  prevailingWind: PrevailingWind
  seatWind: SeatWind
  winTile: Tile
  isLastTile: boolean
  isKongWin: boolean
  isRobbedKong: boolean
  bonusTiles: Tile[]
  winnerIndex: number
  loserIndex: number | null
  players: Player[]
  ruleSettings: RuleSettings
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type ActionType =
  | 'START_GAME'
  | 'SHUFFLE_COMPLETE'
  | 'DEAL_COMPLETE'
  | 'DRAW_TILE'
  | 'DISCARD_TILE'
  | 'CLAIM_CHOW'
  | 'CLAIM_PUNG'
  | 'CLAIM_KONG'
  | 'DECLARE_CLOSED_KONG'
  | 'EXTEND_KONG'
  | 'DECLARE_WIN'
  | 'DECLARE_DRAW'
  | 'SKIP_CLAIM'
  | 'NEXT_ROUND'
  | 'END_GAME'

export interface GameAction {
  type: ActionType
  playerIndex?: number
  winners?: number[]    // for DECLARE_WIN with multiple simultaneous winners
  tile?: Tile
  chowTiles?: [Tile, Tile]   // the 2 tiles from hand forming the chow
}
