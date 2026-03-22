/**
 * Comprehensive scoring tests for all winning hand combinations.
 *
 * Key bug covered: Half Flush (mixed_flush) was incorrectly triggered when a
 * player held concealed tiles of one suit plus an exposed meld of another suit,
 * because the decomposition algorithm failed to find the correct grouping when
 * the pair tiles sorted before the remaining meld tiles (man pair < sou chows
 * in sort order). The fallback returned only the exposed melds, making
 * isMixedFlush see a single suit.
 */

import { calculateScore } from '../scoring'
import { DEFAULT_RULES } from '../../../types'
import type { Meld } from '../../../types'
import {
  man, pin, sou,
  East, South, West, North, Chun, Hatsu, Haku,
  bonus,
  pungMeld, kongMeld, chowMeld,
  makeCtx, fanIds,
} from './testHelpers'

const noMelds: Meld[] = []

// ─────────────────────────────────────────────────────────────────────────────
// DECOMPOSITION BUG — pair sorts before meld tiles
// ─────────────────────────────────────────────────────────────────────────────

describe('Decomposition correctness (pair before meld in sort order)', () => {
  test('man+sou all-chow hand with man pair: scores all_chows, not all_pungs', () => {
    // pair(9m) sorts before sou chows — old algorithm got stuck here
    // Valid decomp: chow(1m2m3m) chow(4m5m6m) chow(1s2s3s) chow(4s5s6s) pair(9m9m)
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), sou(1),sou(2),sou(3), sou(4),sou(5),sou(6), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_chows')
    expect(fanIds(result)).not.toContain('all_pungs')
    expect(fanIds(result)).not.toContain('mixed_terminals')
    expect(fanIds(result)).not.toContain('mixed_flush')
  })

  test('man+sou all-chow hand with sou pair: scores all_chows correctly', () => {
    // pair(9s) sorts after man chows — both old and new should handle this
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), sou(1),sou(2),sou(3), sou(4),sou(5),sou(6), sou(9)]
    const winTile = sou(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_chows')
    expect(fanIds(result)).not.toContain('mixed_flush')
  })

  test('man concealed chows + sou exposed pung: NOT half flush (the reported bug)', () => {
    // Exposed pung of sou tiles. Old decomp failed → fell back to [exposed_pung_only]
    // → isMixedFlush saw only sou → incorrectly returned Half Flush
    const exposed = [pungMeld(sou(5), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), sou(1),sou(2),sou(3), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('mixed_flush')
    expect(fanIds(result)).not.toContain('all_pungs')
  })

  test('pin+sou all-chow hand with pin pair: scores all_chows, not all_pungs', () => {
    // pair(9p) sorts before sou chows
    const hand = [pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), sou(1),sou(2),sou(3), sou(4),sou(5),sou(6), pin(9)]
    const winTile = pin(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_chows')
    expect(fanIds(result)).not.toContain('all_pungs')
    expect(fanIds(result)).not.toContain('mixed_terminals')
  })

  test('man chow + sou pung hand with man pair: correct decomposition', () => {
    // chow(1m2m3m) chow(4m5m6m) pung(1s1s1s) pung(2s2s2s) pair(9m9m)
    // pair(9m) sorts before sou pungs
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), sou(1),sou(1),sou(1), sou(2),sou(2),sou(2), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    // Should NOT vacuously score all_pungs or mixed_terminals
    expect(fanIds(result)).not.toContain('all_pungs')
    expect(fanIds(result)).not.toContain('mixed_terminals')
    expect(fanIds(result)).not.toContain('mixed_flush')
  })

  test('pin concealed chows + sou exposed pung: NOT half flush', () => {
    const exposed = [pungMeld(sou(3), false)]
    const hand = [pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), sou(7),sou(8),sou(9), pin(9)]
    const winTile = pin(9)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('mixed_flush')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// HALF FLUSH (混一色) — 3 fan
// ─────────────────────────────────────────────────────────────────────────────

describe('Half Flush (混一色) — 3 fan', () => {
  // POSITIVE: one numbered suit + honors only

  test('man + wind honors → half flush', () => {
    // chow(1m2m3m) chow(4m5m6m) pung(E) pung(S) pair(W)
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), East(),East(),East(), South(),South(),South(), West()]
    const winTile = West()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, prevailingWind: 'north', seatWind: 'north' }))
    expect(fanIds(result)).toContain('mixed_flush')
    expect(result.fans.find(f => f.id === 'mixed_flush')!.fan).toBe(3)
  })

  test('pin + wind honors → half flush', () => {
    const hand = [pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), East(),East(),East(), South(),South(),South(), West()]
    const winTile = West()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, prevailingWind: 'north', seatWind: 'north' }))
    expect(fanIds(result)).toContain('mixed_flush')
  })

  test('sou + wind honors → half flush', () => {
    const hand = [sou(1),sou(2),sou(3), sou(4),sou(5),sou(6), East(),East(),East(), South(),South(),South(), West()]
    const winTile = West()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, prevailingWind: 'north', seatWind: 'north' }))
    expect(fanIds(result)).toContain('mixed_flush')
  })

  test('man + dragon honors → half flush', () => {
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), Chun(),Chun(),Chun(), Hatsu(),Hatsu(),Hatsu(), Haku()]
    const winTile = Haku()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('mixed_flush')
  })

  test('sou + dragon honors → half flush', () => {
    const hand = [sou(1),sou(2),sou(3), sou(4),sou(5),sou(6), Chun(),Chun(),Chun(), Hatsu(),Hatsu(),Hatsu(), Haku()]
    const winTile = Haku()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('mixed_flush')
  })

  test('pin + mixed honors → half flush', () => {
    const hand = [pin(2),pin(3),pin(4), pin(5),pin(6),pin(7), East(),East(),East(), Chun(),Chun(),Chun(), Haku()]
    const winTile = Haku()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, prevailingWind: 'north', seatWind: 'north' }))
    expect(fanIds(result)).toContain('mixed_flush')
  })

  test('half flush with exposed melds', () => {
    const exposed = [pungMeld(East(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), Haku()]
    const winTile = Haku()
    const result = calculateScore(hand, exposed, makeCtx({ winTile, prevailingWind: 'north', seatWind: 'north' }))
    expect(fanIds(result)).toContain('mixed_flush')
  })

  test('half flush + all pungs combo', () => {
    const exposed = [pungMeld(East(), false)]
    const hand = [man(1),man(1),man(1), man(9),man(9),man(9), Haku(),Haku(),Haku(), man(5)]
    const winTile = man(5)
    const result = calculateScore(hand, exposed, makeCtx({ winTile, prevailingWind: 'north', seatWind: 'north' }))
    expect(fanIds(result)).toContain('mixed_flush')
    expect(fanIds(result)).toContain('all_pungs')
  })

  // NEGATIVE: must NOT trigger

  test('man + sou (no honors) → NOT half flush', () => {
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), sou(1),sou(2),sou(3), sou(4),sou(5),sou(6), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('mixed_flush')
  })

  test('man + pin (no honors) → NOT half flush', () => {
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('mixed_flush')
  })

  test('pin + sou (no honors) → NOT half flush', () => {
    const hand = [pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), sou(1),sou(2),sou(3), sou(4),sou(5),sou(6), pin(9)]
    const winTile = pin(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('mixed_flush')
  })

  test('man + sou + honors (three groups) → NOT half flush', () => {
    const exposed = [pungMeld(East(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), sou(1),sou(2),sou(3), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, exposed, makeCtx({ winTile, prevailingWind: 'north', seatWind: 'north' }))
    expect(fanIds(result)).not.toContain('mixed_flush')
  })

  test('all man (full flush) → NOT half flush', () => {
    const hand = [man(1),man(2),man(3), man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('full_flush')
    expect(fanIds(result)).not.toContain('mixed_flush')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FULL FLUSH (清一色) — 7 fan
// ─────────────────────────────────────────────────────────────────────────────

describe('Full Flush (清一色) — 7 fan', () => {
  test('all man, chow hand', () => {
    const hand = [man(1),man(2),man(3), man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('full_flush')
    expect(result.fans.find(f => f.id === 'full_flush')!.fan).toBe(7)
  })

  test('all pin, chow hand', () => {
    const hand = [pin(1),pin(2),pin(3), pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), pin(7),pin(8),pin(9), pin(9)]
    const winTile = pin(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('full_flush')
  })

  test('all sou, chow hand', () => {
    const hand = [sou(1),sou(2),sou(3), sou(1),sou(2),sou(3), sou(4),sou(5),sou(6), sou(7),sou(8),sou(9), sou(9)]
    const winTile = sou(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('full_flush')
  })

  test('all man, pung hand — full flush + all pungs', () => {
    const exposed = [pungMeld(man(1), false)]
    const hand = [man(2),man(2),man(2), man(3),man(3),man(3), man(4),man(4),man(4), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('full_flush')
    expect(fanIds(result)).toContain('all_pungs')
  })

  test('all sou, pung hand — full flush + all pungs', () => {
    const exposed = [pungMeld(sou(1), false)]
    const hand = [sou(2),sou(2),sou(2), sou(3),sou(3),sou(3), sou(4),sou(4),sou(4), sou(9)]
    const winTile = sou(9)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('full_flush')
    expect(fanIds(result)).toContain('all_pungs')
  })

  test('full flush beats half flush (no mixed_flush)', () => {
    const hand = [man(1),man(2),man(3), man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('mixed_flush')
  })

  test('full flush + all chows', () => {
    const hand = [pin(2),pin(3),pin(4), pin(4),pin(5),pin(6), pin(5),pin(6),pin(7), pin(7),pin(8),pin(9), pin(1)]
    const winTile = pin(1)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('full_flush')
    expect(fanIds(result)).toContain('all_chows')
  })

  test('NOT triggered for multi-suit hand', () => {
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), sou(1),sou(2),sou(3), sou(4),sou(5),sou(6), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('full_flush')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ALL PUNGS (對對胡) — 3 fan
// ─────────────────────────────────────────────────────────────────────────────

describe('All Pungs (對對胡) — 3 fan', () => {
  test('all pungs, mixed suits, one exposed', () => {
    const exposed = [pungMeld(pin(1), false)]
    const hand = [man(1),man(1),man(1), man(2),man(2),man(2), man(3),man(3),man(3), man(5)]
    const winTile = man(5)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_pungs')
    expect(result.fans.find(f => f.id === 'all_pungs')!.fan).toBe(3)
  })

  test('all pungs, single suit, one exposed kong', () => {
    const exposed = [kongMeld(sou(9), false)]
    const hand = [sou(1),sou(1),sou(1), sou(2),sou(2),sou(2), sou(3),sou(3),sou(3), sou(5)]
    const winTile = sou(5)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_pungs')
  })

  test('all pungs with honor pungs', () => {
    const exposed = [pungMeld(East(), false)]
    const hand = [man(1),man(1),man(1), pin(9),pin(9),pin(9), Chun(),Chun(),Chun(), man(5)]
    const winTile = man(5)
    const result = calculateScore(hand, exposed, makeCtx({ winTile, prevailingWind: 'north', seatWind: 'north' }))
    expect(fanIds(result)).toContain('all_pungs')
  })

  test('NOT triggered when hand has a chow', () => {
    const exposed = [pungMeld(man(1), false)]
    const hand = [man(2),man(3),man(4), man(5),man(5),man(5), man(6),man(6),man(6), pin(9)]
    const winTile = pin(9)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('all_pungs')
  })

  test('NOT triggered for pure chow hand', () => {
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('all_pungs')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ALL CHOWS (平胡) — 1 fan
// ─────────────────────────────────────────────────────────────────────────────

describe('All Chows (平胡) — 1 fan', () => {
  test('all chows, mixed suits', () => {
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_chows')
    expect(result.fans.find(f => f.id === 'all_chows')!.fan).toBe(1)
  })

  test('all chows, single suit (full flush + all chows)', () => {
    const hand = [man(1),man(2),man(3), man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_chows')
    expect(fanIds(result)).toContain('full_flush')
  })

  test('all chows, man+sou (not same suit as any exposed meld)', () => {
    const hand = [man(2),man(3),man(4), man(5),man(6),man(7), sou(1),sou(2),sou(3), sou(5),sou(6),sou(7), pin(5)]
    const winTile = pin(5)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_chows')
    expect(fanIds(result)).not.toContain('all_pungs')
  })

  test('NOT triggered when hand has a pung', () => {
    const exposed = [pungMeld(man(1), false)]
    const hand = [man(2),man(3),man(4), man(5),man(6),man(7), pin(1),pin(2),pin(3), pin(5)]
    const winTile = pin(5)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('all_chows')
  })

  test('does not combine with all_pungs', () => {
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_chows')
    expect(fanIds(result)).not.toContain('all_pungs')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MIXED TERMINALS (混么九) — 2 fan
// ─────────────────────────────────────────────────────────────────────────────

describe('Mixed Terminals (混么九) — 2 fan', () => {
  test('terminals + honors, multiple suits', () => {
    const exposed = [pungMeld(East(), false)]
    const hand = [man(1),man(1),man(1), pin(1),pin(1),pin(1), sou(9),sou(9),sou(9), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('mixed_terminals')
    expect(result.fans.find(f => f.id === 'mixed_terminals')!.fan).toBe(2)
  })

  test('terminals + honors, all pungs', () => {
    const exposed = [pungMeld(Chun(), false)]
    const hand = [man(1),man(1),man(1), pin(9),pin(9),pin(9), sou(1),sou(1),sou(1), sou(9)]
    const winTile = sou(9)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('mixed_terminals')
    expect(fanIds(result)).toContain('all_pungs')
  })

  test('NOT triggered when middle tiles present', () => {
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('mixed_terminals')
  })

  test('NOT triggered for middle-tile pung hand', () => {
    const exposed = [pungMeld(man(5), false)]
    const hand = [pin(5),pin(5),pin(5), sou(5),sou(5),sou(5), East(),East(),East(), Chun()]
    const winTile = Chun()
    const result = calculateScore(hand, exposed, makeCtx({ winTile, prevailingWind: 'north', seatWind: 'north' }))
    expect(fanIds(result)).not.toContain('mixed_terminals')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SEVEN PAIRS (七對子) — 4 fan
// ─────────────────────────────────────────────────────────────────────────────

describe('Seven Pairs (七對子) — 4 fan', () => {
  const sevenPairsRules = { ...DEFAULT_RULES, minFanToWin: 0, sevenPairs: true }

  test('basic seven pairs', () => {
    const hand = [man(1),man(1), man(2),man(2), man(3),man(3), man(4),man(4), man(5),man(5), man(6),man(6), man(7)]
    const winTile = man(7)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, ruleSettings: sevenPairsRules }))
    expect(fanIds(result)).toContain('seven_pairs')
    expect(result.fans.find(f => f.id === 'seven_pairs')!.fan).toBe(4)
  })

  test('seven pairs of honors and numbered tiles', () => {
    const hand = [East(),East(), West(),West(), Chun(),Chun(), Hatsu(),Hatsu(), Haku(),Haku(), man(1),man(1), pin(9)]
    const winTile = pin(9)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, ruleSettings: sevenPairsRules }))
    expect(fanIds(result)).toContain('seven_pairs')
  })

  test('seven pairs + all_concealed on discard win', () => {
    const hand = [man(1),man(1), man(2),man(2), man(3),man(3), man(4),man(4), man(5),man(5), man(6),man(6), man(7)]
    const winTile = man(7)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: false, ruleSettings: sevenPairsRules }))
    expect(fanIds(result)).toContain('seven_pairs')
    expect(fanIds(result)).toContain('all_concealed')
  })

  test('seven pairs + concealed_self_draw on zimo', () => {
    const hand = [man(1),man(1), man(2),man(2), man(3),man(3), man(4),man(4), man(5),man(5), man(6),man(6), man(7)]
    const winTile = man(7)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: true, ruleSettings: sevenPairsRules }))
    expect(fanIds(result)).toContain('seven_pairs')
    expect(fanIds(result)).toContain('concealed_self_draw')
  })

  test('disabled when rule is off', () => {
    const hand = [man(1),man(1), man(2),man(2), man(3),man(3), man(4),man(4), man(5),man(5), man(6),man(6), man(7)]
    const winTile = man(7)
    const result = calculateScore(hand, noMelds, makeCtx({
      winTile,
      ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, sevenPairs: false },
    }))
    expect(fanIds(result)).not.toContain('seven_pairs')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SMALL THREE DRAGONS (小三元) — 3 fan
// ─────────────────────────────────────────────────────────────────────────────

describe('Small Three Dragons (小三元) — 3 fan', () => {
  test('two dragon pungs + dragon pair', () => {
    const hand = [Chun(),Chun(),Chun(), Hatsu(),Hatsu(),Hatsu(), Haku(),Haku(), man(1),man(2),man(3), man(4),man(5)]
    const winTile = man(6)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('small_three_dragons')
    expect(result.fans.find(f => f.id === 'small_three_dragons')!.fan).toBe(3)
  })

  test('small_three_dragons + mixed_flush', () => {
    const hand = [Chun(),Chun(),Chun(), Hatsu(),Hatsu(),Hatsu(), Haku(),Haku(), man(1),man(2),man(3), man(4),man(5)]
    const winTile = man(6)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('small_three_dragons')
    expect(fanIds(result)).toContain('mixed_flush')
  })

  test('two dragon pungs via exposed melds + dragon pair', () => {
    // 2 exposed melds → concealed hand needs 7 tiles + 1 winTile = 8 (1 pair + 2 melds)
    const exposed = [pungMeld(Chun(), false), pungMeld(Hatsu(), false)]
    const hand = [Haku(),Haku(), man(1),man(2),man(3), man(4),man(5)]
    const winTile = man(6)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('small_three_dragons')
  })

  test('does NOT trigger with only one dragon pung (dragon_pung instead)', () => {
    const exposed = [pungMeld(Chun(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), pin(5)]
    const winTile = pin(5)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('small_three_dragons')
    expect(fanIds(result)).toContain('dragon_pung')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SMALL FOUR WINDS (小四喜) — 3 fan
// ─────────────────────────────────────────────────────────────────────────────

describe('Small Four Winds (小四喜) — 3 fan', () => {
  test('three wind pungs + pair of fourth wind', () => {
    const hand = [East(),East(),East(), South(),South(),South(), West(),West(),West(), North(),North(), man(1),man(2)]
    const winTile = man(3)
    const ctx = makeCtx({ winTile, seatWind: 'north', prevailingWind: 'north' })
    const result = calculateScore(hand, noMelds, ctx)
    expect(fanIds(result)).toContain('small_four_winds')
    expect(result.fans.find(f => f.id === 'small_four_winds')!.fan).toBe(3)
  })

  test('does NOT trigger for four wind pungs (big_four_winds limit instead)', () => {
    const melds = [pungMeld(East(),false), pungMeld(South(),false), pungMeld(West(),false), pungMeld(North(),false)]
    const hand = [man(5)]
    const winTile = man(5)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('big_four_winds')
    expect(fanIds(result)).not.toContain('small_four_winds')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DRAGON PUNGS (箭刻) — 1 fan each
// ─────────────────────────────────────────────────────────────────────────────

describe('Dragon Pungs (箭刻) — 1 fan each', () => {
  test('red dragon (中) pung — 1 fan', () => {
    const exposed = [pungMeld(Chun(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), pin(2)]
    const winTile = pin(2)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(result.fans.filter(f => f.id === 'dragon_pung')).toHaveLength(1)
  })

  test('green dragon (發) pung — 1 fan', () => {
    const exposed = [pungMeld(Hatsu(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), pin(2)]
    const winTile = pin(2)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(result.fans.filter(f => f.id === 'dragon_pung')).toHaveLength(1)
  })

  test('white dragon (白) pung — 1 fan', () => {
    const exposed = [pungMeld(Haku(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), pin(2)]
    const winTile = pin(2)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(result.fans.filter(f => f.id === 'dragon_pung')).toHaveLength(1)
  })

  test('two dragon pungs = 2 dragon_pung fans', () => {
    const exposed = [pungMeld(Chun(), false), pungMeld(Hatsu(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), pin(2)]
    const winTile = pin(2)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(result.fans.filter(f => f.id === 'dragon_pung')).toHaveLength(2)
  })

  test('three dragon pungs → big_three_dragons limit, no dragon_pung', () => {
    const melds = [pungMeld(Chun(),false), pungMeld(Hatsu(),false), pungMeld(Haku(),false)]
    const hand = [man(1),man(1),man(1), man(2)]
    const winTile = man(2)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('big_three_dragons')
    expect(fanIds(result)).not.toContain('dragon_pung')
  })

  test('dragon kong also counts as dragon_pung', () => {
    const exposed = [kongMeld(Chun(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), pin(2)]
    const winTile = pin(2)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(result.fans.filter(f => f.id === 'dragon_pung')).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// WIND PUNGS (門風 / 圈風) — 1 fan each
// ─────────────────────────────────────────────────────────────────────────────

describe('Wind Pungs (門風/圈風) — 1 fan each', () => {
  test('seat wind pung only (not prevailing)', () => {
    const hand = [South(),South(),South(), man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), Hatsu()]
    const winTile = Hatsu()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, seatWind: 'south', prevailingWind: 'west' }))
    expect(fanIds(result)).toContain('seat_wind_pung')
    expect(fanIds(result)).not.toContain('prevailing_wind_pung')
  })

  test('prevailing wind pung only (not seat)', () => {
    const hand = [East(),East(),East(), man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), Hatsu()]
    const winTile = Hatsu()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, seatWind: 'north', prevailingWind: 'east' }))
    expect(fanIds(result)).toContain('prevailing_wind_pung')
    expect(fanIds(result)).not.toContain('seat_wind_pung')
  })

  test('both seat and prevailing wind pung — 2 fans', () => {
    const hand = [East(),East(),East(), man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), Hatsu()]
    const winTile = Hatsu()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, seatWind: 'east', prevailingWind: 'east' }))
    expect(fanIds(result)).toContain('seat_wind_pung')
    expect(fanIds(result)).toContain('prevailing_wind_pung')
  })

  test('non-seat non-prevailing wind pung = no wind fan', () => {
    const hand = [North(),North(),North(), man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), Hatsu()]
    const winTile = Hatsu()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, seatWind: 'east', prevailingWind: 'east' }))
    expect(fanIds(result)).not.toContain('seat_wind_pung')
    expect(fanIds(result)).not.toContain('prevailing_wind_pung')
  })

  test('wind kong counts for wind fan', () => {
    const exposed = [kongMeld(South(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), Hatsu()]
    const winTile = Hatsu()
    const result = calculateScore(hand, exposed, makeCtx({ winTile, seatWind: 'south', prevailingWind: 'west' }))
    expect(fanIds(result)).toContain('seat_wind_pung')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SELF DRAW & CONCEALED (自摸 / 門前清)
// ─────────────────────────────────────────────────────────────────────────────

describe('Self Draw and Concealed fans', () => {
  const base = () => ({
    hand: [man(1),man(2),man(3), man(4),man(5),man(6), pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), man(9)],
    winTile: man(9),
  })

  test('concealed_self_draw — zimo, fully concealed', () => {
    const { hand, winTile } = base()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: true }))
    expect(fanIds(result)).toContain('concealed_self_draw')
    expect(fanIds(result)).not.toContain('self_draw')
    expect(fanIds(result)).not.toContain('all_concealed')
  })

  test('self_draw — zimo with exposed meld', () => {
    const { hand, winTile } = base()
    const exposed = [pungMeld(sou(5), false)]
    const result = calculateScore(
      [man(1),man(2),man(3), man(4),man(5),man(6), pin(1),pin(2),pin(3), man(9)],
      exposed,
      makeCtx({ winTile, isZimo: true }),
    )
    expect(fanIds(result)).toContain('self_draw')
    expect(fanIds(result)).not.toContain('concealed_self_draw')
  })

  test('all_concealed — discard win, fully concealed', () => {
    const { hand, winTile } = base()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: false }))
    expect(fanIds(result)).toContain('all_concealed')
    expect(fanIds(result)).not.toContain('self_draw')
    expect(fanIds(result)).not.toContain('concealed_self_draw')
  })

  test('no concealed fan — discard win with exposed meld', () => {
    const exposed = [pungMeld(man(7), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), pin(1),pin(2),pin(3), pin(5)]
    const winTile = pin(5)
    const result = calculateScore(hand, exposed, makeCtx({ winTile, isZimo: false }))
    expect(fanIds(result)).not.toContain('all_concealed')
    expect(fanIds(result)).not.toContain('self_draw')
    expect(fanIds(result)).not.toContain('concealed_self_draw')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT FANS
// ─────────────────────────────────────────────────────────────────────────────

describe('Context fans', () => {
  const base = () => ({
    hand: [man(1),man(2),man(3), man(4),man(5),man(6), pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), man(9)],
    winTile: man(9),
  })

  test('last_tile_draw — zimo on last wall tile', () => {
    const { hand, winTile } = base()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: true, isLastTile: true }))
    expect(fanIds(result)).toContain('last_tile_draw')
    expect(fanIds(result)).not.toContain('last_tile_claim')
  })

  test('last_tile_claim — discard claim on last tile', () => {
    const { hand, winTile } = base()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: false, isLastTile: true }))
    expect(fanIds(result)).toContain('last_tile_claim')
    expect(fanIds(result)).not.toContain('last_tile_draw')
  })

  test('win_on_kong — kong replacement draw win', () => {
    const { hand, winTile } = base()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isKongWin: true, isZimo: true }))
    expect(fanIds(result)).toContain('win_on_kong')
  })

  test('robbing_kong — claiming extended kong tile', () => {
    const { hand, winTile } = base()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isRobbedKong: true }))
    expect(fanIds(result)).toContain('robbing_kong')
  })

  test('flower_bonus — matching seat flower (value 1 = east)', () => {
    const { hand, winTile } = base()
    const ctx = makeCtx({
      winTile,
      seatWind: 'east',
      bonusTiles: [bonus(1)],
      ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, flowers: true },
    })
    const result = calculateScore(hand, noMelds, ctx)
    expect(result.fans.filter(f => f.id === 'flower_bonus')).toHaveLength(1)
  })

  test('flower_bonus — matching season (value 5 = east via modulo)', () => {
    const { hand, winTile } = base()
    const ctx = makeCtx({
      winTile,
      seatWind: 'east',
      bonusTiles: [bonus(5)],
      ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, flowers: true },
    })
    const result = calculateScore(hand, noMelds, ctx)
    expect(result.fans.filter(f => f.id === 'flower_bonus')).toHaveLength(1)
  })

  test('flower_bonus — two matching bonus tiles = 2 fans', () => {
    const { hand, winTile } = base()
    const ctx = makeCtx({
      winTile,
      seatWind: 'east',
      bonusTiles: [bonus(1), bonus(5)],
      ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, flowers: true },
    })
    const result = calculateScore(hand, noMelds, ctx)
    expect(result.fans.filter(f => f.id === 'flower_bonus')).toHaveLength(2)
  })

  test('flower_bonus — non-matching bonus tile = no fan', () => {
    const { hand, winTile } = base()
    const ctx = makeCtx({
      winTile,
      seatWind: 'east',
      bonusTiles: [bonus(2)],
      ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, flowers: true },
    })
    const result = calculateScore(hand, noMelds, ctx)
    expect(fanIds(result)).not.toContain('flower_bonus')
  })

  test('no_bonus — winner has no bonus tiles and rule enabled', () => {
    const { hand, winTile } = base()
    const ctx = makeCtx({
      winTile,
      bonusTiles: [],
      ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, noBonusFan: true },
    })
    const result = calculateScore(hand, noMelds, ctx)
    expect(fanIds(result)).toContain('no_bonus')
  })

  test('no_bonus — NOT given when bonus tiles present', () => {
    const { hand, winTile } = base()
    const ctx = makeCtx({
      winTile,
      bonusTiles: [bonus(1)],
      ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, noBonusFan: true },
    })
    const result = calculateScore(hand, noMelds, ctx)
    expect(fanIds(result)).not.toContain('no_bonus')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCORING AND PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Scoring and payments', () => {
  const allChowHand = () => ({
    hand: [man(1),man(2),man(3), man(4),man(5),man(6), pin(1),pin(2),pin(3), pin(4),pin(5),pin(6), man(9)],
    winTile: man(9),
  })

  test('totalFan is sum of individual fan values', () => {
    const { hand, winTile } = allChowHand()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    const sum = result.fans.reduce((s, f) => s + f.fan, 0)
    expect(result.totalFan).toBe(sum)
  })

  test('limit hand always gives totalFan = 13', () => {
    const hand = [man(1),man(9),pin(1),pin(9),sou(1),sou(9),East(),South(),West(),North(),Chun(),Hatsu(),Haku()]
    const result = calculateScore(hand, noMelds, makeCtx({ winTile: man(1) }))
    expect(result.totalFan).toBe(13)
    expect(result.fans.some(f => f.isLimit)).toBe(true)
  })

  test('basePoints = totalFan × pointsPerFan', () => {
    const { hand, winTile } = allChowHand()
    const ctx = makeCtx({ winTile, ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, pointsPerFan: 5 } })
    const result = calculateScore(hand, noMelds, ctx)
    expect(result.basePoints).toBe(result.totalFan * 5)
  })

  test('zimo — winner receives from all three players', () => {
    const { hand, winTile } = allChowHand()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: true, winnerIndex: 0, loserIndex: null }))
    expect(result.payments[0]).toBeGreaterThan(0)
    expect(result.payments[1]).toBeLessThan(0)
    expect(result.payments[2]).toBeLessThan(0)
    expect(result.payments[3]).toBeLessThan(0)
  })

  test('discard win — only the discarder pays', () => {
    const { hand, winTile } = allChowHand()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: false, winnerIndex: 0, loserIndex: 2 }))
    expect(result.payments[0]).toBeGreaterThan(0)
    expect(result.payments[2]).toBeLessThan(0)
    expect(result.payments[1]).toBe(0)
    expect(result.payments[3]).toBe(0)
  })

  test('payments sum to zero (zero-sum game)', () => {
    const { hand, winTile } = allChowHand()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: true, winnerIndex: 1, loserIndex: null }))
    const total = result.payments.reduce((s, p) => s + p, 0)
    expect(total).toBe(0)
  })

  test('best decomposition selected (all_pungs 3 fan beats all_chows 1 fan)', () => {
    const exposed = [pungMeld(pin(1), false)]
    const hand = [man(2),man(2),man(2), man(3),man(3),man(3), man(4),man(4),man(4), man(5)]
    const winTile = man(5)
    const result = calculateScore(hand, exposed, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_pungs')
    expect(fanIds(result)).not.toContain('all_chows')
  })
})
