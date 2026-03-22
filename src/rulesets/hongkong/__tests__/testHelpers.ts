import type { Tile, Meld, ScoringContext } from '../../../types'
import { DEFAULT_RULES } from '../../../types'

let _id = 0
const uid = () => `t${++_id}`

// ── Tile factories ──────────────────────────────────────────────────────────
export const man   = (v: number): Tile => ({ id: uid(), suit: 'man',   value: v })
export const pin   = (v: number): Tile => ({ id: uid(), suit: 'pin',   value: v })
export const sou   = (v: number): Tile => ({ id: uid(), suit: 'sou',   value: v })
export const honor = (v: number): Tile => ({ id: uid(), suit: 'honor', value: v })
export const bonus = (v: number): Tile => ({ id: uid(), suit: 'bonus', value: v })

// Named honor shortcuts
export const East  = (): Tile => honor(1)  // East wind
export const South = (): Tile => honor(2)  // South wind
export const West  = (): Tile => honor(3)  // West wind
export const North = (): Tile => honor(4)  // North wind
export const Chun  = (): Tile => honor(5)  // Red dragon  (中)
export const Hatsu = (): Tile => honor(6)  // Green dragon (發)
export const Haku  = (): Tile => honor(7)  // White dragon (白)

// ── Meld factories ──────────────────────────────────────────────────────────
export function pungMeld(t: Tile, concealed = false): Meld {
  return { type: 'pung', tiles: [t, { ...t, id: uid() }, { ...t, id: uid() }], concealed }
}

export function kongMeld(t: Tile, concealed = false): Meld {
  return {
    type: 'kong',
    tiles: [t, { ...t, id: uid() }, { ...t, id: uid() }, { ...t, id: uid() }],
    concealed,
  }
}

export function chowMeld(t1: Tile, t2: Tile, t3: Tile, concealed = false): Meld {
  return { type: 'chow', tiles: [t1, t2, t3], concealed }
}

// ── Context factory ─────────────────────────────────────────────────────────
export function makeCtx(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    isZimo: false,
    isDealer: false,
    prevailingWind: 'east',
    seatWind: 'south',
    winTile: man(1),
    isLastTile: false,
    isKongWin: false,
    isRobbedKong: false,
    bonusTiles: [],
    winnerIndex: 1,
    loserIndex: 0,
    players: [],
    ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0 },
    ...overrides,
  }
}

// ── Result helpers ──────────────────────────────────────────────────────────
export function fanIds(result: { fans: Array<{ id: string }> }): string[] {
  return result.fans.map(f => f.id)
}
