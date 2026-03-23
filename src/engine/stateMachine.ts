import type {
  GameState, GameAction, Player, RoundState, RoundResult, Tile, Meld, PendingClaim, ScoringContext, RuleSettings, GameLogEntry
} from '../types'
import { DEFAULT_RULES } from '../types'
import { createFullDeck, shuffleDeck, dealHands, sortHand } from './deck'
import {
  isValidWin, getChowOptions, getPungTiles, getKongTiles,
  getClosedKongOptions, getExtendKongOptions,
} from '../rulesets/hongkong'
import { calculateScore, checkWinMeetsFan } from '../rulesets/hongkong/scoring'
import { tilesEqual, tileEnglish } from '../constants/tiles'
import { removeTiles } from './handAnalyzer'

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialState(
  names: string[],
  mode: 'full' | 'half',
  ruleSettings: RuleSettings = DEFAULT_RULES
): GameState {
  const players: Player[] = names.map((name, i) => ({
    id: `player-${i}`,
    name,
    type: i === 0 ? 'human' : 'bot',
    seatWind: (['east', 'south', 'west', 'north'] as const)[i],
    score: 0,
    hand: [],
    melds: [],
    discards: [],
    bonusTiles: [],
    drawnTile: null,
    isDealer: i === 0,
  }))

  return {
    phase: 'idle',
    mode,
    rulesetId: 'hongkong',
    ruleSettings,
    players,
    round: createRoundState(0, 0, 0),
    roundHistory: [],
    maxWindRounds: mode === 'full' ? 4 : 2,
    humanPlayerIndex: 0,
    gameLog: [],
  }
}

function createRoundState(roundNumber: number, windRoundIndex: number, dealerIndex: number): RoundState {
  return {
    roundNumber,
    prevailingWind: (['east', 'south', 'west', 'north'] as const)[windRoundIndex],
    windRoundIndex,
    dealerIndex,
    dealerConsecutiveWins: 0,
    wall: [],
    deadWall: [],
    doraIndicators: [],
    turnIndex: dealerIndex,
    lastDiscard: null,
    lastDiscardBy: null,
    kongPending: false,
    bonusDrawSeq: 0,
    pendingClaims: [null, null, null, null],
    skipCount: 0,
  }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': return handleStartGame(state)
    case 'SHUFFLE_COMPLETE': return handleShuffleComplete(state)
    case 'DEAL_COMPLETE': return handleDealComplete(state)
    case 'DRAW_TILE': return handleDrawTile(state)
    case 'DISCARD_TILE': return handleDiscard(state, action)
    case 'CLAIM_CHOW': return handleClaimChow(state, action)
    case 'CLAIM_PUNG': return handleClaimPung(state, action)
    case 'CLAIM_KONG': return handleClaimKong(state, action)
    case 'DECLARE_CLOSED_KONG': return handleClosedKong(state, action)
    case 'EXTEND_KONG': return handleExtendKong(state, action)
    case 'DECLARE_WIN': return handleDeclareWin(state, action)
    case 'DECLARE_DRAW': return handleDeclareDraw(state)
    case 'SKIP_CLAIM': return handleSkipClaim(state, action)
    case 'NEXT_ROUND': return handleNextRound(state)
    case 'END_GAME': return { ...state, phase: 'game_over' }
    default: return state
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function handleStartGame(state: GameState): GameState {
  return { ...state, phase: 'shuffle' }
}

function handleShuffleComplete(state: GameState): GameState {
  return { ...state, phase: 'dealing' }
}

const MAX_LOG_ENTRIES = 200

function log(state: GameState, playerIndex: number, message: string): GameLogEntry[] {
  if (!state.ruleSettings.enableGameLog) return state.gameLog
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  const s = now.getSeconds().toString().padStart(2, '0')
  const entry: GameLogEntry = {
    id: Date.now() + Math.random(),
    playerIndex,
    playerName: state.players[playerIndex]?.name ?? '',
    message,
    timestamp: `${h}:${m}:${s}`,
  }
  const updated = [...state.gameLog, entry]
  return updated.length > MAX_LOG_ENTRIES ? updated.slice(-MAX_LOG_ENTRIES) : updated
}

function handleDealComplete(state: GameState): GameState {
  const deck = shuffleDeck(createFullDeck())
  const dealerIdx = state.round.dealerIndex
  const { hands, wall } = dealHands(deck, dealerIdx)

  const players = state.players.map((p, i) => {
    // Separate bonus tiles
    const bonusTiles = hands[i].filter(t => t.suit === 'bonus')
    const hand = sortHand(hands[i].filter(t => t.suit !== 'bonus'))
    return { ...p, hand, bonusTiles, melds: [], discards: [], drawnTile: null }
  })

  // Handle bonus tile replacement draws (draw from wall)
  let wallLeft = [...wall]
  const playersWithReplacements = players.map(p => {
    let bonusCount = p.bonusTiles.length
    const extra: Tile[] = []
    while (bonusCount > 0 && wallLeft.length > 0) {
      let drawn = wallLeft.shift()!
      while (drawn.suit === 'bonus' && wallLeft.length > 0) {
        extra.push(drawn)
        drawn = wallLeft.shift()!
      }
      if (drawn.suit !== 'bonus') extra.push(drawn)
      bonusCount--
    }
    const newHand = sortHand([...p.hand, ...extra.filter(t => t.suit !== 'bonus')])
    const newBonus = [...p.bonusTiles, ...extra.filter(t => t.suit === 'bonus')]
    return { ...p, hand: newHand, bonusTiles: newBonus }
  })

  return {
    ...state,
    players: playersWithReplacements,
    round: {
      ...state.round,
      wall: wallLeft,
      deadWall: [],
      turnIndex: dealerIdx,
      lastDiscard: null,
      lastDiscardBy: null,
      kongPending: false,
      pendingClaims: [null, null, null, null],
      skipCount: 0,
    },
    phase: 'playing',
  }
}

function handleDrawTile(state: GameState): GameState {
  const { round, players } = state
  if (round.wall.length === 0) {
    return { ...state, phase: 'round_end' }
  }

  // Guard: if the current player already has a drawn tile, don't draw again
  const currentPlayer = players[round.turnIndex]
  if (currentPlayer.drawnTile !== null) return state

  // Kong replacement: draw from END of main wall (HK mahjong has no dead wall)
  // Normal draw: draw from START of main wall
  const wall = round.wall
  const drawn = round.kongPending ? wall[wall.length - 1] : wall[0]
  const mainWall = round.kongPending ? wall.slice(0, -1) : wall.slice(1)

  const ti = round.turnIndex
  const player = players[ti]

  let newHand = sortHand([...player.hand, drawn])
  let bonusTiles = [...player.bonusTiles]

  // Handle if drawn tile is a bonus
  if (drawn.suit === 'bonus') {
    bonusTiles = [...bonusTiles, drawn]
    const updatedPlayers = players.map((p, i) =>
      i === ti ? { ...p, hand: player.hand, bonusTiles, drawnTile: null } : p
    )
    return {
      ...state,
      players: updatedPlayers,
      round: {
        ...round,
        wall: mainWall,
        kongPending: true,
        bonusDrawSeq: round.bonusDrawSeq + 1,  // always changes → re-fires effect
      },
      gameLog: log(state, ti, 'drew a flower/season tile'),
    }
  }

  const updatedPlayers = players.map((p, i) =>
    i === ti
      ? { ...p, hand: newHand, drawnTile: drawn, bonusTiles }
      : p
  )

  return {
    ...state,
    players: updatedPlayers,
    round: {
      ...round,
      wall: mainWall,
      kongPending: false,
      lastDiscardBy: null,  // clear so isZimo is correctly true for self-draw wins
    },
    phase: ti === state.humanPlayerIndex ? 'awaiting_discard' : 'bot_turn',
    gameLog: ti === state.humanPlayerIndex ? log(state, ti, 'drew a tile') : state.gameLog,
  }
}


function handleDiscard(state: GameState, action: GameAction): GameState {
  const { round, players } = state
  const ti = action.playerIndex ?? round.turnIndex
  const tile = action.tile!
  const player = players[ti]

  const newHand = removeTile(player.hand, tile)
  const newDiscards = [...player.discards, tile]

  const updatedPlayers = players.map((p, i) =>
    i === ti
      ? { ...p, hand: newHand, discards: newDiscards, drawnTile: null }
      : p
  )

  // Compute pending claims for all other players
  const pendingClaims: (PendingClaim | null)[] = players.map((p, i) => {
    if (i === ti) return null
    const canWin = isValidWin(p.hand, p.melds, tile) &&
      checkWinMeetsFan(p.hand, p.melds, tile, false, p, round.prevailingWind,
        round.wall.length === 0, i, ti, players, state.ruleSettings)
    const canPung = !!(getPungTiles(p.hand, tile))
    const canKong = !!(getKongTiles(p.hand, tile))
    // Chow: only player to discarder's left
    const isLeft = (ti + 1) % 4 === i
    const chowOpts = isLeft ? getChowOptions(p.hand, tile) : []
    const canChow = chowOpts.length > 0
    if (!canWin && !canPung && !canKong && !canChow) return null
    return { canChow: chowOpts, canPung, canKong, canWin }
  })

  const hasClaims = pendingClaims.some(c => c !== null)
  const nextTurn = (ti + 1) % 4

  return {
    ...state,
    players: updatedPlayers,
    round: {
      ...round,
      lastDiscard: tile,
      lastDiscardBy: ti,
      pendingClaims,
      skipCount: 0,
      turnIndex: hasClaims ? round.turnIndex : nextTurn,
    },
    phase: hasClaims ? 'awaiting_action' : 'playing',
    gameLog: log(state, ti, `discarded ${tileEnglish(tile)}`),
  }
}

function handleClaimChow(state: GameState, action: GameAction): GameState {
  const { round, players } = state
  const pi = action.playerIndex!
  const chowTiles = action.chowTiles!
  const lastDiscard = round.lastDiscard!

  const player = players[pi]
  const newHand = removeTiles(player.hand, chowTiles)
  const meld: Meld = {
    type: 'chow',
    tiles: sortChow([chowTiles[0], chowTiles[1], lastDiscard]),
    concealed: false,
    claimedFrom: round.lastDiscardBy ?? undefined,
  }

  const updatedPlayers = players.map((p, i) =>
    i === pi ? { ...p, hand: newHand, melds: [...p.melds, meld], drawnTile: null } : p
  )

  return {
    ...state,
    players: updatedPlayers,
    round: {
      ...round,
      turnIndex: pi,
      lastDiscard: null,
      lastDiscardBy: null,
      pendingClaims: [null, null, null, null],
    },
    phase: pi === state.humanPlayerIndex ? 'awaiting_discard' : 'bot_turn',
    gameLog: log(state, pi, `chowed ${tileEnglish(lastDiscard)}`),
  }
}

function handleClaimPung(state: GameState, action: GameAction): GameState {
  const { round, players } = state
  const pi = action.playerIndex!
  const lastDiscard = round.lastDiscard!

  const player = players[pi]
  const pungTiles = getPungTiles(player.hand, lastDiscard)!
  const newHand = removeTiles(player.hand, pungTiles)
  const meld: Meld = {
    type: 'pung',
    tiles: [pungTiles[0], pungTiles[1], lastDiscard],
    concealed: false,
    claimedFrom: round.lastDiscardBy ?? undefined,
  }

  const updatedPlayers = players.map((p, i) =>
    i === pi ? { ...p, hand: newHand, melds: [...p.melds, meld], drawnTile: null } : p
  )

  return {
    ...state,
    players: updatedPlayers,
    round: {
      ...round,
      turnIndex: pi,
      lastDiscard: null,
      pendingClaims: [null, null, null, null],
    },
    phase: pi === state.humanPlayerIndex ? 'awaiting_discard' : 'bot_turn',
    gameLog: log(state, pi, `ponged ${tileEnglish(lastDiscard)}`),
  }
}

function handleClaimKong(state: GameState, action: GameAction): GameState {
  const { round, players } = state
  const pi = action.playerIndex!
  const lastDiscard = round.lastDiscard!

  const player = players[pi]
  const kongTiles = getKongTiles(player.hand, lastDiscard)!
  const newHand = removeTiles(player.hand, kongTiles)
  const meld: Meld = {
    type: 'kong',
    tiles: [...kongTiles, lastDiscard],
    concealed: false,
    claimedFrom: round.lastDiscardBy ?? undefined,
  }

  const updatedPlayers = players.map((p, i) =>
    i === pi ? { ...p, hand: newHand, melds: [...p.melds, meld], drawnTile: null } : p
  )

  return {
    ...state,
    players: updatedPlayers,
    round: {
      ...round,
      turnIndex: pi,
      lastDiscard: null,
      pendingClaims: [null, null, null, null],
      kongPending: true,
    },
    phase: 'playing',
    gameLog: log(state, pi, `konged ${tileEnglish(lastDiscard)}`),
  }
}

function handleClosedKong(state: GameState, action: GameAction): GameState {
  const { players, round } = state
  const pi = action.playerIndex!
  const tile = action.tile!
  const player = players[pi]

  const matches = player.hand.filter(t => tilesEqual(t, tile))
  const newHand = removeTiles(player.hand, matches.slice(0, 4))
  const meld: Meld = { type: 'kong', tiles: matches.slice(0, 4), concealed: true }

  const updatedPlayers = players.map((p, i) =>
    i === pi ? { ...p, hand: newHand, melds: [...p.melds, meld], drawnTile: null } : p
  )

  return {
    ...state,
    players: updatedPlayers,
    round: { ...round, kongPending: true, turnIndex: pi },
    phase: 'playing',
    gameLog: log(state, pi, `declared closed kong`),
  }
}

function handleExtendKong(state: GameState, action: GameAction): GameState {
  const { players, round } = state
  const pi = action.playerIndex!
  const tile = action.tile!
  const player = players[pi]

  const meldIdx = player.melds.findIndex(m => m.type === 'pung' && tilesEqual(m.tiles[0], tile))
  if (meldIdx === -1) return state

  const newHand = removeTile(player.hand, tile)
  const newMelds = player.melds.map((m, i) =>
    i === meldIdx ? { ...m, type: 'kong' as const, tiles: [...m.tiles, tile] } : m
  )

  const updatedPlayers = players.map((p, i) =>
    i === pi ? { ...p, hand: newHand, melds: newMelds, drawnTile: null } : p
  )

  return {
    ...state,
    players: updatedPlayers,
    round: { ...round, kongPending: true, turnIndex: pi },
    phase: 'playing',
    gameLog: log(state, pi, `extended kong with ${tileEnglish(tile)}`),
  }
}

function handleDeclareWin(state: GameState, action: GameAction): GameState {
  // Support single winner (action.playerIndex) or multiple winners (action.winners)
  const winnerIndices: number[] = action.winners ?? (action.playerIndex != null ? [action.playerIndex] : [])
  if (winnerIndices.length === 0) return state

  const { round } = state
  const isDiscardWin = round.lastDiscardBy !== null
  const loserIndex = isDiscardWin ? round.lastDiscardBy : null

  // Compute score deltas across all winners
  const combinedDeltas = [0, 0, 0, 0]
  const primaryBreakdown = (() => {
    let first = null
    for (const pi of winnerIndices) {
      const player = state.players[pi]
      const isZimo = !isDiscardWin
      const winTile = isZimo ? player.drawnTile! : round.lastDiscard!

      const ctx: ScoringContext = {
        isZimo,
        isDealer: player.isDealer,
        prevailingWind: round.prevailingWind,
        seatWind: player.seatWind,
        winTile,
        isLastTile: round.wall.length === 0,
        isKongWin: round.kongPending,
        isRobbedKong: false,
        bonusTiles: player.bonusTiles,
        winnerIndex: pi,
        loserIndex,
        players: state.players,
        ruleSettings: state.ruleSettings,
      }

      // For self-draw: player.hand already contains the drawn tile.
      // calculateScore adds winTile internally, so filter it out to avoid counting it twice.
      const handForScoring = isZimo
        ? player.hand.filter(t => t.id !== winTile.id)
        : player.hand
      const breakdown = calculateScore(handForScoring, player.melds, ctx)

      for (let i = 0; i < 4; i++) combinedDeltas[i] += breakdown.payments[i]
      if (!first) first = breakdown
    }
    return first
  })()

  if (!primaryBreakdown) return state  // no valid winner after rule checks

  const primaryWinner = winnerIndices[0]
  const primaryPlayer = state.players[primaryWinner]

  // Apply score deltas
  const players = state.players.map((p, i) => ({
    ...p,
    score: p.score + combinedDeltas[i],
    isDealer: false,
  }))

  const result: RoundResult = {
    roundNumber: round.roundNumber,
    winner: primaryWinner,
    multiWinners: winnerIndices.length > 1 ? winnerIndices : undefined,
    loser: loserIndex,
    winTile: isDiscardWin ? round.lastDiscard! : primaryPlayer.drawnTile!,
    scoreDeltas: combinedDeltas,
    fanBreakdown: primaryBreakdown,
    dealerWon: primaryPlayer.isDealer,
    isDraw: false,
  }

  return {
    ...state,
    players,
    round: { ...round },
    roundHistory: [...state.roundHistory, result],
    phase: 'scoring',
    gameLog: log(state, primaryWinner, `won the hand! (${primaryBreakdown.totalFan} fan)`),
  }
}

function handleSkipClaim(state: GameState, action: GameAction): GameState {
  const pi = action.playerIndex!
  const { round } = state

  // Guard: only process if this player actually has a pending claim
  if (round.pendingClaims[pi] === null) return state

  const newPendingClaims = round.pendingClaims.map((c, i) => i === pi ? null : c)
  const newSkipCount = round.skipCount + 1

  const remainingClaimers = newPendingClaims.filter(c => c !== null).length

  if (remainingClaimers === 0) {
    const nextTurn = (round.lastDiscardBy! + 1) % 4
    return {
      ...state,
      round: {
        ...round,
        pendingClaims: [null, null, null, null],
        skipCount: 0,
        turnIndex: nextTurn,
      },
      phase: 'playing',
    }
  }

  return {
    ...state,
    round: { ...round, pendingClaims: newPendingClaims, skipCount: newSkipCount },
  }
}

function handleDeclareDraw(state: GameState): GameState {
  const result: RoundResult = {
    roundNumber: state.round.roundNumber,
    winner: null,
    loser: null,
    winTile: null,
    scoreDeltas: [0, 0, 0, 0],
    fanBreakdown: null,
    dealerWon: false,
    isDraw: true,
  }
  return {
    ...state,
    roundHistory: [...state.roundHistory, result],
    phase: 'scoring',
  }
}

function handleNextRound(state: GameState): GameState {
  const lastResult = state.roundHistory[state.roundHistory.length - 1]
  if (!lastResult) return state

  let { windRoundIndex, dealerIndex, dealerConsecutiveWins } = state.round

  const isDraw = lastResult.isDraw
  const dealerWon = lastResult.dealerWon

  if (isDraw || dealerWon) {
    dealerConsecutiveWins = dealerWon ? dealerConsecutiveWins + 1 : dealerConsecutiveWins
  } else {
    dealerConsecutiveWins = 0
    dealerIndex = (dealerIndex + 1) % 4
    if (dealerIndex === 0) {
      windRoundIndex = windRoundIndex + 1
    }
  }

  if (windRoundIndex >= state.maxWindRounds && !dealerWon && !isDraw) {
    if (dealerIndex === 0 && windRoundIndex >= state.maxWindRounds) {
      return { ...state, phase: 'game_over' }
    }
  }

  const players = state.players.map((p, i) => {
    const newSeatWind = (['east', 'south', 'west', 'north'] as const)[
      (i - dealerIndex + 4) % 4
    ]
    return {
      ...p,
      seatWind: newSeatWind,
      isDealer: i === dealerIndex,
      hand: [],
      melds: [],
      discards: [],
      bonusTiles: [],
      drawnTile: null,
    }
  })

  const newRound = createRoundState(
    state.round.roundNumber + 1,
    windRoundIndex,
    dealerIndex
  )

  return {
    ...state,
    players,
    round: { ...newRound, dealerConsecutiveWins },
    phase: 'shuffle',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function removeTile(hand: Tile[], tile: Tile): Tile[] {
  const idx = hand.findIndex(t => t.id === tile.id)
  if (idx === -1) return hand
  return [...hand.slice(0, idx), ...hand.slice(idx + 1)]
}

function sortChow(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => a.value - b.value)
}

export function computePendingClaims(
  players: Player[],
  discardedTile: Tile,
  discardedBy: number,
  state: GameState
): (PendingClaim | null)[] {
  const { round, ruleSettings } = state
  return players.map((p, i) => {
    if (i === discardedBy) return null
    const canWin = isValidWin(p.hand, p.melds, discardedTile) &&
      checkWinMeetsFan(p.hand, p.melds, discardedTile, false, p, round.prevailingWind,
        round.wall.length === 0, i, discardedBy, players, ruleSettings)
    const canPung = !!getPungTiles(p.hand, discardedTile)
    const canKong = !!getKongTiles(p.hand, discardedTile)
    const isLeft = (discardedBy + 1) % 4 === i
    const chowOpts = isLeft ? getChowOptions(p.hand, discardedTile) : []
    if (!canWin && !canPung && !canKong && !chowOpts.length) return null
    return { canChow: chowOpts, canPung, canKong, canWin }
  })
}
