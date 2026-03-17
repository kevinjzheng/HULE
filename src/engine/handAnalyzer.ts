import type { Tile, Meld } from '../types'
import { tilesEqual } from '../constants/tiles'

/** Count occurrences of a tile in an array */
export function countTile(tiles: Tile[], tile: Tile): number {
  return tiles.filter(t => tilesEqual(t, tile)).length
}

/** Group tiles by suit+value key */
export function groupTiles(tiles: Tile[]): Map<string, Tile[]> {
  const map = new Map<string, Tile[]>()
  for (const t of tiles) {
    const k = `${t.suit}-${t.value}`
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(t)
  }
  return map
}

/** Return unique tile types (suit+value) */
export function uniqueTypes(tiles: Tile[]): Array<{ suit: string; value: number; tiles: Tile[] }> {
  const g = groupTiles(tiles)
  return Array.from(g.values()).map(ts => ({ suit: ts[0].suit, value: ts[0].value, tiles: ts }))
}

/**
 * Compute shanten number for a hand.
 * -1 = already won (complete hand)
 *  0 = tenpai (one tile away)
 *  n = n tiles away from tenpai
 */
export function shantenNumber(hand: Tile[], melds: Meld[]): number {
  // Tiles not in exposed melds
  const concealed = [...hand]
  const meldCount = melds.filter(m => !m.concealed || m.type === 'kong').length
  const slotsNeeded = 4 - meldCount

  // Check seven pairs first (special hand)
  const sevenPairsShanten = sevenPairsShanten_(concealed)
  const standardShanten = standardShanten_(concealed, slotsNeeded)

  return Math.min(sevenPairsShanten, standardShanten)
}

function sevenPairsShanten_(tiles: Tile[]): number {
  const pairs = new Set<string>()
  const groups = groupTiles(tiles)
  for (const [key, group] of groups) {
    if (group.length >= 2) pairs.add(key)
  }
  return 6 - pairs.size
}

function standardShanten_(tiles: Tile[], slotsNeeded: number): number {
  let best = 8
  const groups = groupTiles(tiles)
  const typeList = Array.from(groups.entries()).map(([k, ts]) => ({ key: k, tiles: ts }))

  // Try each possible pair
  for (const { key, tiles: pairCandidates } of typeList) {
    if (pairCandidates.length < 2) continue
    const remaining = removeTiles(tiles, [pairCandidates[0], pairCandidates[1]])
    const s = calcMelds(remaining, slotsNeeded)
    best = Math.min(best, s)
  }

  // Also try without a pair (incomplete hand assessment)
  const s = calcMelds(tiles, slotsNeeded)
  best = Math.min(best, s + 1) // +1 because no pair yet

  return best
}

function calcMelds(tiles: Tile[], needed: number): number {
  // Greedy count of complete + partial melds
  const sorted = sortForMeld(tiles)
  const { complete, partial } = countMeldsRecursive([...sorted], 0, 0)
  // shanten = needed - complete - partial - 1 (the -1 for the pair already accounted by caller)
  return needed - complete - partial
}

function sortForMeld(tiles: Tile[]): Tile[] {
  const order: Record<string, number> = { man: 0, pin: 1, sou: 2, honor: 3, bonus: 4 }
  return [...tiles].sort((a, b) => {
    const sd = (order[a.suit] ?? 5) - (order[b.suit] ?? 5)
    return sd !== 0 ? sd : a.value - b.value
  })
}

function countMeldsRecursive(
  tiles: Tile[],
  complete: number,
  partial: number
): { complete: number; partial: number } {
  if (tiles.length === 0) return { complete, partial }

  const first = tiles[0]
  const rest = tiles.slice(1)

  let best = { complete, partial }

  // Try pung
  const idx2 = rest.findIndex(t => tilesEqual(t, first))
  if (idx2 !== -1) {
    const afterPair = removeAt(rest, idx2)
    const idx3 = afterPair.findIndex(t => tilesEqual(t, first))
    if (idx3 !== -1) {
      const afterPung = removeAt(afterPair, idx3)
      const r = countMeldsRecursive(afterPung, complete + 1, partial)
      if (r.complete + r.partial > best.complete + best.partial) best = r
    }
    // Partial pung
    const r2 = countMeldsRecursive(afterPair, complete, partial + 1)
    if (r2.complete + r2.partial > best.complete + best.partial) best = r2
  }

  // Try chow (only for suited tiles)
  if (first.suit === 'man' || first.suit === 'pin' || first.suit === 'sou') {
    const mid = rest.findIndex(t => t.suit === first.suit && t.value === first.value + 1)
    const hi = rest.findIndex(t => t.suit === first.suit && t.value === first.value + 2)
    if (mid !== -1 && hi !== -1) {
      const after = removeAt(removeAt(rest, Math.max(mid, hi)), Math.min(mid, hi))
      const r = countMeldsRecursive(after, complete + 1, partial)
      if (r.complete + r.partial > best.complete + best.partial) best = r
    }
    if (mid !== -1) {
      const r = countMeldsRecursive(removeAt(rest, mid), complete, partial + 1)
      if (r.complete + r.partial > best.complete + best.partial) best = r
    }
    if (hi !== -1) {
      const r = countMeldsRecursive(removeAt(rest, hi), complete, partial + 1)
      if (r.complete + r.partial > best.complete + best.partial) best = r
    }
  }

  // Skip first tile (isolated)
  const rSkip = countMeldsRecursive(rest, complete, partial)
  if (rSkip.complete + rSkip.partial > best.complete + best.partial) best = rSkip

  return best
}

function removeAt<T>(arr: T[], idx: number): T[] {
  return [...arr.slice(0, idx), ...arr.slice(idx + 1)]
}

export function removeTiles(tiles: Tile[], toRemove: Tile[]): Tile[] {
  const result = [...tiles]
  for (const tr of toRemove) {
    const idx = result.findIndex(t => t.id === tr.id)
    if (idx !== -1) result.splice(idx, 1)
  }
  return result
}

/** Get tiles player is waiting on (tenpai waits) */
export function getTenpaiWaits(hand: Tile[], melds: Meld[]): Tile[] {
  // Generate all possible tile types
  const waits: Tile[] = []
  const candidates: Array<{ suit: string; value: number }> = []
  for (const suit of ['man', 'pin', 'sou'] as const) {
    for (let v = 1; v <= 9; v++) candidates.push({ suit, value: v })
  }
  for (let v = 1; v <= 7; v++) candidates.push({ suit: 'honor', value: v })

  const currentShanten = shantenNumber(hand, melds)
  if (currentShanten > 0) return []

  for (const c of candidates) {
    const testTile: Tile = { id: 'test', suit: c.suit as any, value: c.value }
    const testHand = [...hand, testTile]
    if (shantenNumber(testHand, melds) === -1) {
      waits.push(testTile)
    }
  }
  return waits
}
