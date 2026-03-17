import type { Tile, Meld } from '../../types'
import { tilesEqual } from '../../constants/tiles'
import { removeTiles } from '../../engine/handAnalyzer'

/**
 * Check if a hand is a valid winning hand.
 * hand = concealed tiles (not including winTile)
 * melds = exposed melds
 * winTile = the tile just drawn or claimed
 */
export function isValidWin(hand: Tile[], melds: Meld[], winTile: Tile): boolean {
  const allConcealed = [...hand, winTile]
  const meldCount = melds.filter(m => m.type !== 'kong').length +
    melds.filter(m => m.type === 'kong').length

  // Check special hands first
  if (isThirteenOrphans(allConcealed, melds)) return true
  if (isSevenPairs(allConcealed, melds)) return true

  // Standard hand: 4 melds + 1 pair (accounting for exposed melds)
  const slotsNeeded = 4 - meldCount
  return canFormStandardHand(allConcealed, slotsNeeded)
}

export function isThirteenOrphans(concealed: Tile[], melds: Meld[]): boolean {
  if (melds.length > 0) return false
  if (concealed.length !== 14) return false

  const orphans = [
    { suit: 'man', value: 1 }, { suit: 'man', value: 9 },
    { suit: 'pin', value: 1 }, { suit: 'pin', value: 9 },
    { suit: 'sou', value: 1 }, { suit: 'sou', value: 9 },
    { suit: 'honor', value: 1 }, { suit: 'honor', value: 2 },
    { suit: 'honor', value: 3 }, { suit: 'honor', value: 4 },
    { suit: 'honor', value: 5 }, { suit: 'honor', value: 6 },
    { suit: 'honor', value: 7 },
  ]

  for (const orphan of orphans) {
    const count = concealed.filter(t => t.suit === orphan.suit && t.value === orphan.value).length
    if (count === 0) return false
  }
  return true
}

export function isSevenPairs(concealed: Tile[], melds: Meld[]): boolean {
  if (melds.length > 0) return false
  if (concealed.length !== 14) return false

  const pairs = new Map<string, number>()
  for (const t of concealed) {
    const k = `${t.suit}-${t.value}`
    pairs.set(k, (pairs.get(k) ?? 0) + 1)
  }
  // Must have exactly 7 pairs (each tile appears exactly twice)
  for (const count of pairs.values()) {
    if (count !== 2) return false
  }
  return pairs.size === 7
}

export function canFormStandardHand(tiles: Tile[], meldsNeeded: number): boolean {
  if (tiles.length !== meldsNeeded * 3 + 2) return false

  // Try each possible pair
  const tried = new Set<string>()
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (!tilesEqual(tiles[i], tiles[j])) continue
      const key = `${tiles[i].suit}-${tiles[i].value}`
      if (tried.has(key)) continue
      tried.add(key)

      const remaining = removeTiles(tiles, [tiles[i], tiles[j]])
      if (canFormMelds(remaining, meldsNeeded)) return true
    }
  }
  return false
}

export function canFormMelds(tiles: Tile[], count: number): boolean {
  if (tiles.length === 0 && count === 0) return true
  if (tiles.length === 0 || count === 0) return false

  // Sort for deterministic processing
  const sorted = [...tiles].sort((a, b) => {
    const so: Record<string, number> = { man: 0, pin: 1, sou: 2, honor: 3, bonus: 4 }
    const sd = (so[a.suit] ?? 5) - (so[b.suit] ?? 5)
    return sd !== 0 ? sd : a.value - b.value
  })

  const first = sorted[0]
  const rest = sorted.slice(1)

  // Try pung
  const idx2 = rest.findIndex(t => tilesEqual(t, first))
  if (idx2 !== -1) {
    const after2 = [...rest.slice(0, idx2), ...rest.slice(idx2 + 1)]
    const idx3 = after2.findIndex(t => tilesEqual(t, first))
    if (idx3 !== -1) {
      const after3 = [...after2.slice(0, idx3), ...after2.slice(idx3 + 1)]
      if (canFormMelds(after3, count - 1)) return true
    }
  }

  // Try chow
  if (first.suit !== 'honor' && first.suit !== 'bonus') {
    const midIdx = rest.findIndex(t => t.suit === first.suit && t.value === first.value + 1)
    if (midIdx !== -1) {
      const after2 = [...rest.slice(0, midIdx), ...rest.slice(midIdx + 1)]
      const hiIdx = after2.findIndex(t => t.suit === first.suit && t.value === first.value + 2)
      if (hiIdx !== -1) {
        const after3 = [...after2.slice(0, hiIdx), ...after2.slice(hiIdx + 1)]
        if (canFormMelds(after3, count - 1)) return true
      }
    }
  }

  return false
}

/** Get possible chow combinations given 2 tiles from hand */
export function getChowOptions(hand: Tile[], discarded: Tile): Tile[][] {
  if (discarded.suit === 'honor' || discarded.suit === 'bonus') return []

  const options: Tile[][] = []
  const v = discarded.value
  const s = discarded.suit

  // Pattern: discard is LOW  (d, d+1, d+2)
  const mid1 = hand.find(t => t.suit === s && t.value === v + 1)
  const hi1 = hand.find(t => t.suit === s && t.value === v + 2)
  if (mid1 && hi1) options.push([mid1, hi1])

  // Pattern: discard is MID  (d-1, d, d+1)
  const lo2 = hand.find(t => t.suit === s && t.value === v - 1)
  const hi2 = hand.find(t => t.suit === s && t.value === v + 1)
  if (lo2 && hi2) options.push([lo2, hi2])

  // Pattern: discard is HIGH (d-2, d-1, d)
  const lo3 = hand.find(t => t.suit === s && t.value === v - 2)
  const mid3 = hand.find(t => t.suit === s && t.value === v - 1)
  if (lo3 && mid3) options.push([lo3, mid3])

  return options
}

/** Tiles needed for a pung from hand */
export function getPungTiles(hand: Tile[], discarded: Tile): Tile[] | null {
  const matches = hand.filter(t => tilesEqual(t, discarded))
  if (matches.length >= 2) return [matches[0], matches[1]]
  return null
}

/** Tiles needed to kong a discard */
export function getKongTiles(hand: Tile[], discarded: Tile): Tile[] | null {
  const matches = hand.filter(t => tilesEqual(t, discarded))
  if (matches.length >= 3) return [matches[0], matches[1], matches[2]]
  return null
}

/** Check if player can declare a closed kong (4 of same in hand) */
export function getClosedKongOptions(hand: Tile[]): Tile[][] {
  const groups = new Map<string, Tile[]>()
  for (const t of hand) {
    const k = `${t.suit}-${t.value}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(t)
  }
  const result: Tile[][] = []
  for (const group of groups.values()) {
    if (group.length === 4) result.push(group)
  }
  return result
}

/** Check if player can extend an existing pung to a kong with drawn tile */
export function getExtendKongOptions(hand: Tile[], melds: Meld[], drawnTile: Tile): Meld[] {
  return melds.filter(
    m => m.type === 'pung' && tilesEqual(m.tiles[0], drawnTile)
  )
}
