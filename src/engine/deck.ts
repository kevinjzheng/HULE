import type { Tile, Suit } from '../types'

let _idCounter = 0
function nextId(): string {
  return String(_idCounter++)
}

export function createFullDeck(): Tile[] {
  const tiles: Tile[] = []

  // 4 copies of each numbered suit (man, pin, sou) 1-9 = 108 tiles
  const suits: Suit[] = ['man', 'pin', 'sou']
  for (const suit of suits) {
    for (let value = 1; value <= 9; value++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({ id: nextId(), suit, value })
      }
    }
  }

  // 4 copies of each wind (1-4) = 16 tiles
  for (let value = 1; value <= 4; value++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({ id: nextId(), suit: 'honor', value })
    }
  }

  // 4 copies of each dragon (5-7) = 12 tiles
  for (let value = 5; value <= 7; value++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({ id: nextId(), suit: 'honor', value })
    }
  }

  // Bonus tiles: 4 flowers (1-4) + 4 seasons (5-8) = 8 tiles
  for (let value = 1; value <= 8; value++) {
    tiles.push({ id: nextId(), suit: 'bonus', value })
  }

  return tiles
}

export function shuffleDeck(tiles: Tile[]): Tile[] {
  const arr = [...tiles]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Deal initial hands from a shuffled deck.
 * HK deal: each player gets 13 tiles. Dealer draws first via DRAW_TILE.
 * No dead wall in HK mahjong — kong replacements draw from the end of the main wall.
 */
export function dealHands(shuffled: Tile[], dealerIndex: number): {
  hands: Tile[][]
  wall: Tile[]
} {
  const hands: Tile[][] = [[], [], [], []]

  // Deal 4 tiles at a time, 3 rounds = 12 tiles each
  let idx = 0
  for (let round = 0; round < 3; round++) {
    for (let p = 0; p < 4; p++) {
      const pi = (dealerIndex + p) % 4
      for (let t = 0; t < 4; t++) {
        hands[pi].push(shuffled[idx++])
      }
    }
  }

  // Deal 1 more to each player = 13 tiles each
  for (let p = 0; p < 4; p++) {
    const pi = (dealerIndex + p) % 4
    hands[pi].push(shuffled[idx++])
  }

  // Dealer draws their 14th tile naturally via DRAW_TILE in the 'playing' phase
  const wall = shuffled.slice(idx)
  return { hands, wall }
}

export function sortHand(hand: Tile[]): Tile[] {
  const suitOrder: Record<string, number> = { man: 0, pin: 1, sou: 2, honor: 3, bonus: 4 }
  return [...hand].sort((a, b) => {
    const suitDiff = (suitOrder[a.suit] ?? 5) - (suitOrder[b.suit] ?? 5)
    if (suitDiff !== 0) return suitDiff
    return a.value - b.value
  })
}
