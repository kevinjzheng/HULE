import type { Player, GameState, GameAction, Tile, Meld } from '../types'
import { shantenNumber, groupTiles } from '../engine/handAnalyzer'
import { tilesEqual, isHonor, isTerminal } from '../constants/tiles'
import { isValidWin, getChowOptions, getPungTiles, getKongTiles } from '../rulesets/hongkong'
import { sortHand } from '../engine/deck'

/**
 * Decide which tile the bot should discard.
 * Strategy: minimize shanten, prefer to discard isolated honors/terminals.
 */
export function botSelectDiscard(player: Player, state: GameState): Tile {
  const hand = player.hand
  if (hand.length === 0) return hand[0]

  let bestTile = hand[0]
  let bestScore = Infinity

  for (const tile of hand) {
    const testHand = hand.filter(t => t.id !== tile.id)
    const shanten = shantenNumber(testHand, player.melds)
    let score = shanten * 10

    // Prefer to discard isolated honors
    if (isHonor(tile)) {
      const count = hand.filter(t => tilesEqual(t, tile)).length
      if (count === 1) score -= 3  // solo honor: discard eagerly
    }
    // Prefer to discard isolated terminals
    if (isTerminal(tile) && !isHonor(tile)) {
      const count = hand.filter(t => tilesEqual(t, tile)).length
      if (count === 1) score -= 1
    }
    // Preserve connected tiles (sequence potential)
    if (!isHonor(tile)) {
      const sameSuit = hand.filter(t => t.id !== tile.id && t.suit === tile.suit)
      const connected = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2).length
      if (connected >= 2) score += 2      // strong sequence: keep it
      else if (connected === 1) score += 0.5  // weak connection: slight preference to keep
    }
    // Defensive: don't discard tiles that others have punged
    const otherDiscards = state.players
      .filter((_, i) => i !== state.players.indexOf(player))
      .flatMap(p => p.discards)
    const dangerCount = otherDiscards.filter(t => tilesEqual(t, tile)).length
    score += dangerCount * 0.5  // slightly prefer safe tiles

    if (score < bestScore) {
      bestScore = score
      bestTile = tile
    }
  }

  return bestTile
}

/**
 * Decide whether the bot should claim a discard.
 * Returns the action to perform or null to skip.
 */
export function botDecideClaim(
  playerIndex: number,
  state: GameState,
  discardedTile: Tile,
  discardedBy: number
): GameAction | null {
  const player = state.players[playerIndex]
  const claim = state.round.pendingClaims[playerIndex]
  if (!claim) return null

  // Always win if possible
  if (claim.canWin) {
    return { type: 'DECLARE_WIN', playerIndex }
  }

  // Consider kong
  if (claim.canKong) {
    // Kong is generally good (extra draw, more scoring)
    return { type: 'CLAIM_KONG', playerIndex }
  }

  const shantenBefore = shantenNumber(player.hand, player.melds)

  // Evaluate pung
  let pungShanten = Infinity
  if (claim.canPung) {
    const pungTiles = getPungTiles(player.hand, discardedTile)!
    const handAfterPung = player.hand.filter(t => !pungTiles.some(pt => pt.id === t.id))
    const testMeld: Meld = { type: 'pung', tiles: [pungTiles[0], pungTiles[1], discardedTile], concealed: false }
    pungShanten = shantenNumber(handAfterPung, [...player.melds, testMeld])
  }

  // Evaluate best chow (all options)
  let bestChow: [Tile, Tile] | null = null
  let chowShanten = Infinity
  if (claim.canChow && claim.canChow.length > 0) {
    for (const opt of claim.canChow) {
      const handAfter = player.hand.filter(t => !opt.some(bt => bt.id === t.id))
      const testMeld: Meld = { type: 'chow', tiles: [...opt, discardedTile], concealed: false }
      const s = shantenNumber(handAfter, [...player.melds, testMeld])
      if (s < chowShanten) { chowShanten = s; bestChow = opt as [Tile, Tile] }
    }
  }

  // Prefer whichever reduces shanten more; tie-break: pung (more flexible for scoring)
  if (chowShanten < pungShanten && chowShanten <= shantenBefore && bestChow) {
    return { type: 'CLAIM_CHOW', playerIndex, chowTiles: bestChow }
  }
  if (pungShanten <= shantenBefore) {
    return { type: 'CLAIM_PUNG', playerIndex }
  }
  if (chowShanten <= shantenBefore && bestChow) {
    return { type: 'CLAIM_CHOW', playerIndex, chowTiles: bestChow }
  }

  return null  // skip
}

/**
 * Bot decides after drawing a tile: win, kong, or continue to discard selection.
 */
export function botDecideAfterDraw(playerIndex: number, state: GameState): GameAction | null {
  const player = state.players[playerIndex]
  if (!player.drawnTile) return null

  // Check self-draw win
  if (isValidWin(player.hand.filter(t => t.id !== player.drawnTile!.id), player.melds, player.drawnTile)) {
    return { type: 'DECLARE_WIN', playerIndex }
  }

  // Check closed kong
  const closedKongs = getClosedKongOptions(player.hand)
  if (closedKongs.length > 0) {
    // Declare if it doesn't break tenpai
    const withoutKong = player.hand.filter(t => !closedKongs[0].some(kt => kt.id === t.id))
    const shantenBefore = shantenNumber(player.hand, player.melds)
    const shantenAfter = shantenNumber(withoutKong, player.melds)
    if (shantenAfter <= shantenBefore) {
      return { type: 'DECLARE_CLOSED_KONG', playerIndex, tile: closedKongs[0][0] }
    }
  }

  // Check extend kong
  const extendOptions = getExtendKongOptions(player.hand, player.melds, player.drawnTile)
  if (extendOptions.length > 0) {
    return { type: 'EXTEND_KONG', playerIndex, tile: player.drawnTile }
  }

  return null
}

// Re-export needed functions
function getClosedKongOptions(hand: Tile[]) {
  const groups = groupTiles(hand)
  const result: Tile[][] = []
  for (const g of groups.values()) {
    if (g.length >= 4) result.push(g.slice(0, 4))
  }
  return result
}

function getExtendKongOptions(hand: Tile[], melds: Meld[], drawn: Tile) {
  return melds.filter(m => m.type === 'pung' && tilesEqual(m.tiles[0], drawn))
}
