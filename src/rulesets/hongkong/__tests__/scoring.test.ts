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

// ── helpers ──────────────────────────────────────────────────────────────────

/** All-chows hand with pair of highest tile (sorts last → algorithm finds pair) */
function manChows999(): { hand: ReturnType<typeof man>[]; winTile: ReturnType<typeof man> } {
  // 123m 123m 456m 789m + pair(9m)
  return {
    hand: [man(1),man(2),man(3), man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), man(9)],
    winTile: man(9),
  }
}

/** All-chows across two suits */
function mixedChows(): { hand: ReturnType<typeof man | typeof pin>[]; winTile: ReturnType<typeof pin> } {
  return {
    hand: [man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), pin(1),pin(2),pin(3), pin(5)],
    winTile: pin(5),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIMIT HANDS
// ─────────────────────────────────────────────────────────────────────────────

describe('Limit hands', () => {
  test('thirteen_orphans', () => {
    const hand = [man(1),man(9),pin(1),pin(9),sou(1),sou(9),East(),South(),West(),North(),Chun(),Hatsu(),Haku()]
    const winTile = man(1)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('thirteen_orphans')
    expect(result.totalFan).toBe(13)
  })

  test('nine_gates', () => {
    const hand = [man(1),man(1),man(1),man(2),man(3),man(4),man(5),man(6),man(7),man(8),man(9),man(9),man(9)]
    const winTile = man(5)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('nine_gates')
    expect(result.totalFan).toBe(13)
  })

  test('four_concealed_pungs — fully concealed', () => {
    // Use concealed hand; isFourConcealedPungs checked before other limits
    const hand = [man(1),man(1),man(1), man(9),man(9),man(9), pin(1),pin(1),pin(1), pin(9),pin(9),pin(9), sou(1)]
    const winTile = sou(1)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('four_concealed_pungs')
    expect(result.totalFan).toBe(13)
  })

  test('four_concealed_pungs — not triggered with exposed non-kong meld', () => {
    const exposed = pungMeld(man(1), false)
    const hand = [man(9),man(9),man(9), pin(1),pin(1),pin(1), pin(9),pin(9),pin(9), sou(1)]
    const winTile = sou(1)
    const result = calculateScore(hand, [exposed], makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('four_concealed_pungs')
  })

  // To isolate all_honors, use exposed pungs so isFourConcealedPungs=false,
  // and only 3 wind pungs so isBigFourWinds=false (checked after isAllHonors anyway)
  test('all_honors — exposed pungs of mixed winds+dragon, no terminals', () => {
    const melds = [pungMeld(East(),false), pungMeld(South(),false), pungMeld(West(),false), pungMeld(Chun(),false)]
    const hand = [Hatsu()]
    const winTile = Hatsu()
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_honors')
    expect(result.totalFan).toBe(13)
  })

  // all_terminals: all tiles 1 or 9, use exposed pungs to avoid four_concealed_pungs
  test('all_terminals — exposed terminal pungs', () => {
    const melds = [pungMeld(man(1),false), pungMeld(man(9),false), pungMeld(pin(1),false), pungMeld(pin(9),false)]
    const hand = [sou(1)]
    const winTile = sou(1)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_terminals')
    expect(result.totalFan).toBe(13)
  })

  // big_four_winds: use exposed pungs + non-honor pair so isAllHonors=false
  test('big_four_winds — four exposed wind pungs, non-honor pair', () => {
    const melds = [pungMeld(East(),false), pungMeld(South(),false), pungMeld(West(),false), pungMeld(North(),false)]
    const hand = [man(5)]
    const winTile = man(5)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('big_four_winds')
    expect(result.totalFan).toBe(13)
  })

  // big_three_dragons: exposed dragon pungs + concealed pung + pair
  test('big_three_dragons — three exposed dragon pungs', () => {
    const melds = [pungMeld(Chun(),false), pungMeld(Hatsu(),false), pungMeld(Haku(),false)]
    const hand = [man(1),man(1),man(1), man(2)]
    const winTile = man(2)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('big_three_dragons')
    expect(result.totalFan).toBe(13)
  })

  test('four_kongs', () => {
    const melds = [kongMeld(man(1),false), kongMeld(man(2),false), kongMeld(man(3),false), kongMeld(man(4),false)]
    const hand = [man(5)]
    const winTile = man(5)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('four_kongs')
    expect(result.totalFan).toBe(13)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// HIGH-VALUE HANDS
// ─────────────────────────────────────────────────────────────────────────────

describe('High-value hands', () => {
  // full_flush: all-chow man hand; pair of 9m sorts last so algorithm finds it
  test('full_flush (7 fan)', () => {
    const { hand, winTile } = manChows999()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('full_flush')
    expect(result.fans.find(f => f.id === 'full_flush')!.fan).toBe(7)
  })

  test('seven_pairs (4 fan)', () => {
    const hand = [man(1),man(1),man(2),man(2),man(3),man(3),man(4),man(4),man(5),man(5),man(6),man(6),man(7)]
    const winTile = man(7)
    const ctx = makeCtx({ winTile, ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, sevenPairs: true } })
    const result = calculateScore(hand, noMelds, ctx)
    expect(fanIds(result)).toContain('seven_pairs')
    expect(result.fans.find(f => f.id === 'seven_pairs')!.fan).toBe(4)
  })

  test('seven_pairs disabled when rule is off', () => {
    const hand = [man(1),man(1),man(2),man(2),man(3),man(3),man(4),man(4),man(5),man(5),man(6),man(6),man(7)]
    const winTile = man(7)
    const ctx = makeCtx({ winTile, ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, sevenPairs: false } })
    const result = calculateScore(hand, noMelds, ctx)
    expect(fanIds(result)).not.toContain('seven_pairs')
  })

  // all_pungs: use exposed pung to prevent four_concealed_pungs
  test('all_pungs (3 fan)', () => {
    const melds = [pungMeld(pin(1), false)]
    const hand = [man(1),man(1),man(1), man(2),man(2),man(2), man(3),man(3),man(3), man(5)]
    const winTile = man(5)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_pungs')
    expect(result.fans.find(f => f.id === 'all_pungs')!.fan).toBe(3)
  })

  test('mixed_flush (3 fan) — one suit + honors', () => {
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), East(),East(),East(), South(),South(),South(), West()]
    const winTile = West()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, prevailingWind: 'west', seatWind: 'north' }))
    expect(fanIds(result)).toContain('mixed_flush')
    expect(result.fans.find(f => f.id === 'mixed_flush')!.fan).toBe(3)
  })

  test('mixed_flush does not trigger if multiple suits', () => {
    const hand = [man(1),man(2),man(3), pin(4),pin(5),pin(6), East(),East(),East(), South(),South(),South(), West()]
    const winTile = West()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('mixed_flush')
  })

  test('small_three_dragons (3 fan)', () => {
    const hand = [Chun(),Chun(),Chun(), Hatsu(),Hatsu(),Hatsu(), Haku(),Haku(), man(1),man(2),man(3), man(4),man(5)]
    const winTile = man(6)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('small_three_dragons')
    expect(result.fans.find(f => f.id === 'small_three_dragons')!.fan).toBe(3)
  })

  test('small_four_winds (3 fan)', () => {
    // E,S,W pung + N pair + 1 chow; use seatWind/prevailing=north to avoid extra wind fans
    const hand = [East(),East(),East(), South(),South(),South(), West(),West(),West(), North(),North(), man(1),man(2)]
    const winTile = man(3)
    const ctx = makeCtx({ winTile, seatWind: 'north', prevailingWind: 'north' })
    const result = calculateScore(hand, noMelds, ctx)
    expect(fanIds(result)).toContain('small_four_winds')
    expect(result.fans.find(f => f.id === 'small_four_winds')!.fan).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MEDIUM / LOW FANS
// ─────────────────────────────────────────────────────────────────────────────

describe('Medium and low fans', () => {
  test('mixed_terminals (2 fan) — terminals + honors, multiple suits', () => {
    // Use exposed pung to prevent four_concealed_pungs (needs exposedNonKong.length=0)
    const melds = [pungMeld(East(), false)]
    const hand = [man(1),man(1),man(1), pin(1),pin(1),pin(1), sou(1),sou(1),sou(1), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('mixed_terminals')
    expect(result.fans.find(f => f.id === 'mixed_terminals')!.fan).toBe(2)
  })

  test('all_chows (1 fan)', () => {
    const { hand, winTile } = mixedChows()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_chows')
    expect(result.fans.find(f => f.id === 'all_chows')!.fan).toBe(1)
  })

  test('all_chows does not combine with all_pungs', () => {
    const { hand, winTile } = mixedChows()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).not.toContain('all_pungs')
  })

  test('concealed_self_draw (1 fan) — zimo, no exposed melds', () => {
    const { hand, winTile } = mixedChows()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: true }))
    expect(fanIds(result)).toContain('concealed_self_draw')
    expect(fanIds(result)).not.toContain('self_draw')
  })

  test('self_draw (1 fan) — zimo with exposed meld', () => {
    const exposed = pungMeld(man(7), false)
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), pin(1),pin(2),pin(3), pin(5)]
    const winTile = pin(5)
    const result = calculateScore(hand, [exposed], makeCtx({ winTile, isZimo: true }))
    expect(fanIds(result)).toContain('self_draw')
    expect(fanIds(result)).not.toContain('concealed_self_draw')
  })

  test('all_concealed (1 fan) — claimed tile, fully concealed hand', () => {
    const { hand, winTile } = mixedChows()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: false }))
    expect(fanIds(result)).toContain('all_concealed')
    expect(fanIds(result)).not.toContain('self_draw')
    expect(fanIds(result)).not.toContain('concealed_self_draw')
  })

  test('dragon_pung (1 fan) — single red dragon pung', () => {
    // Chun pung + man chows + pin pair. pair=2p (pin sorts after man but before honor)
    // Use exposed pung so Chun pung appears in allMelds
    const melds = [pungMeld(Chun(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), pin(2)]
    const winTile = pin(2)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('dragon_pung')
    expect(result.fans.filter(f => f.id === 'dragon_pung')).toHaveLength(1)
  })

  test('dragon_pung — two dragon pungs give 2 instances', () => {
    const melds = [pungMeld(Chun(), false), pungMeld(Hatsu(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), pin(2)]
    const winTile = pin(2)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(result.fans.filter(f => f.id === 'dragon_pung')).toHaveLength(2)
  })

  // For wind fan tests, pair must sort after the wind pung.
  // Wind tiles are honor suit → honor sorts after man/pin/sou.
  // Use pair of Hatsu (honor val=6) so it naturally falls last after E/S/W/N (val 1-4).
  test('seat_wind_pung (1 fan) — south seat, south pung', () => {
    const hand = [South(),South(),South(), man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), Hatsu()]
    const winTile = Hatsu()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, seatWind: 'south', prevailingWind: 'west' }))
    expect(fanIds(result)).toContain('seat_wind_pung')
    expect(fanIds(result)).not.toContain('prevailing_wind_pung')
  })

  test('prevailing_wind_pung (1 fan) — east prevailing, east pung', () => {
    const hand = [East(),East(),East(), man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), Hatsu()]
    const winTile = Hatsu()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, seatWind: 'north', prevailingWind: 'east' }))
    expect(fanIds(result)).toContain('prevailing_wind_pung')
    expect(fanIds(result)).not.toContain('seat_wind_pung')
  })

  test('both seat_wind_pung and prevailing_wind_pung — east seat & east prevailing', () => {
    const hand = [East(),East(),East(), man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), Hatsu()]
    const winTile = Hatsu()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, seatWind: 'east', prevailingWind: 'east' }))
    expect(fanIds(result)).toContain('seat_wind_pung')
    expect(fanIds(result)).toContain('prevailing_wind_pung')
  })

  test('last_tile_draw (1 fan)', () => {
    const { hand, winTile } = mixedChows()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: true, isLastTile: true }))
    expect(fanIds(result)).toContain('last_tile_draw')
    expect(fanIds(result)).not.toContain('last_tile_claim')
  })

  test('last_tile_claim (1 fan)', () => {
    const { hand, winTile } = mixedChows()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: false, isLastTile: true }))
    expect(fanIds(result)).toContain('last_tile_claim')
    expect(fanIds(result)).not.toContain('last_tile_draw')
  })

  test('win_on_kong (1 fan)', () => {
    const { hand, winTile } = mixedChows()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isKongWin: true, isZimo: true }))
    expect(fanIds(result)).toContain('win_on_kong')
  })

  test('robbing_kong (1 fan)', () => {
    const { hand, winTile } = mixedChows()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isRobbedKong: true }))
    expect(fanIds(result)).toContain('robbing_kong')
  })

  test('flower_bonus (1 fan per matching bonus tile)', () => {
    const { hand, winTile } = mixedChows()
    const b1 = bonus(1) // east flower matches east seat
    const b5 = bonus(5) // value 5 → tileWindVal = 5-4 = 1 → also matches east
    const ctx = makeCtx({
      winTile, seatWind: 'east', bonusTiles: [b1, b5],
      ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, flowers: true },
    })
    const result = calculateScore(hand, noMelds, ctx)
    expect(result.fans.filter(f => f.id === 'flower_bonus')).toHaveLength(2)
  })

  test('flower_bonus — non-matching bonus tile gives no fan', () => {
    const { hand, winTile } = mixedChows()
    const ctx = makeCtx({
      winTile, seatWind: 'east', bonusTiles: [bonus(2)],
      ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, flowers: true },
    })
    const result = calculateScore(hand, noMelds, ctx)
    expect(fanIds(result)).not.toContain('flower_bonus')
  })

  test('no_bonus (1 fan) — winner has no bonus tiles and rule enabled', () => {
    const { hand, winTile } = mixedChows()
    const ctx = makeCtx({ winTile, bonusTiles: [], ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, noBonusFan: true } })
    const result = calculateScore(hand, noMelds, ctx)
    expect(fanIds(result)).toContain('no_bonus')
  })

  test('no_bonus not given when bonus tiles present', () => {
    const { hand, winTile } = mixedChows()
    const ctx = makeCtx({ winTile, bonusTiles: [bonus(1)], ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, noBonusFan: true } })
    const result = calculateScore(hand, noMelds, ctx)
    expect(fanIds(result)).not.toContain('no_bonus')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-FAN COMBOS
// ─────────────────────────────────────────────────────────────────────────────

describe('Multi-fan combinations', () => {
  // full_flush + all_pungs: use exposed pung to avoid four_concealed_pungs
  test('full_flush + all_pungs combo', () => {
    const melds = [pungMeld(man(1), false)]
    const hand = [man(2),man(2),man(2), man(3),man(3),man(3), man(4),man(4),man(4), man(9)]
    const winTile = man(9)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_pungs')
    expect(fanIds(result)).toContain('full_flush')
    expect(result.totalFan).toBeGreaterThanOrEqual(10)
  })

  test('full_flush + all_chows combo', () => {
    const { hand, winTile } = manChows999()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('full_flush')
    expect(fanIds(result)).toContain('all_chows')
  })

  test('all_chows + concealed_self_draw stacks', () => {
    const { hand, winTile } = mixedChows()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: true }))
    expect(fanIds(result)).toContain('all_chows')
    expect(fanIds(result)).toContain('concealed_self_draw')
  })

  test('small_three_dragons + mixed_flush combo', () => {
    const hand = [Chun(),Chun(),Chun(), Hatsu(),Hatsu(),Hatsu(), Haku(),Haku(), man(1),man(2),man(3), man(4),man(5)]
    const winTile = man(6)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('small_three_dragons')
    expect(fanIds(result)).toContain('mixed_flush')
  })

  test('dragon_pung + seat_wind_pung stacks', () => {
    // Exposed Chun pung (dragon) + exposed South pung (seat wind south) + chows + pair
    const melds = [pungMeld(Chun(), false), pungMeld(South(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), pin(2)]
    const winTile = pin(2)
    const result = calculateScore(hand, melds, makeCtx({ winTile, seatWind: 'south', prevailingWind: 'west' }))
    expect(fanIds(result)).toContain('dragon_pung')
    expect(fanIds(result)).toContain('seat_wind_pung')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DECOMPOSITION CORRECTNESS
// ─────────────────────────────────────────────────────────────────────────────

describe('Best decomposition selection', () => {
  // Use exposed pung to prevent four_concealed_pungs; all-pungs beats all-chows
  test('222333444 — all_pungs (3fan) beats all_chows (1fan)', () => {
    const melds = [pungMeld(pin(1), false)]
    const hand = [man(2),man(2),man(2), man(3),man(3),man(3), man(4),man(4),man(4), man(5)]
    const winTile = man(5)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_pungs')
    expect(fanIds(result)).not.toContain('all_chows')
  })

  test('exposed dragon pung is included in fan calculation', () => {
    const melds = [pungMeld(Chun(), false)]
    const hand = [man(1),man(2),man(3), man(4),man(5),man(6), man(7),man(8),man(9), pin(2)]
    const winTile = pin(2)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('dragon_pung')
  })

  test('exposed kong counts toward all_pungs', () => {
    // Exposed (non-concealed) kong → isFourConcealedPungs counts concealed.length=0 → 3+0=3<4 → false
    const melds = [kongMeld(man(9), false)]
    const hand = [man(1),man(1),man(1), man(2),man(2),man(2), man(3),man(3),man(3), pin(5)]
    const winTile = pin(5)
    const result = calculateScore(hand, melds, makeCtx({ winTile }))
    expect(fanIds(result)).toContain('all_pungs')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCORING OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

describe('Score calculation', () => {
  test('totalFan is sum of all fans for non-limit hand', () => {
    const { hand, winTile } = mixedChows()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    const manual = result.fans.reduce((s, f) => s + f.fan, 0)
    expect(result.totalFan).toBe(manual)
  })

  test('limit hand totalFan is always 13', () => {
    const hand = [man(1),man(9),pin(1),pin(9),sou(1),sou(9),East(),South(),West(),North(),Chun(),Hatsu(),Haku()]
    const winTile = man(1)
    const result = calculateScore(hand, noMelds, makeCtx({ winTile }))
    expect(result.totalFan).toBe(13)
    expect(result.fans.some(f => f.isLimit)).toBe(true)
  })

  test('basePoints = totalFan × pointsPerFan', () => {
    const { hand, winTile } = mixedChows()
    const ctx = makeCtx({ winTile, ruleSettings: { ...DEFAULT_RULES, minFanToWin: 0, pointsPerFan: 5 } })
    const result = calculateScore(hand, noMelds, ctx)
    expect(result.basePoints).toBe(result.totalFan * 5)
  })

  test('zimo payments deducted from all other players', () => {
    const { hand, winTile } = mixedChows()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: true, winnerIndex: 0, loserIndex: null }))
    expect(result.payments[0]).toBeGreaterThan(0)
    expect(result.payments[1]).toBeLessThan(0)
    expect(result.payments[2]).toBeLessThan(0)
    expect(result.payments[3]).toBeLessThan(0)
  })

  test('claim payments — only loser pays', () => {
    const { hand, winTile } = mixedChows()
    const result = calculateScore(hand, noMelds, makeCtx({ winTile, isZimo: false, winnerIndex: 0, loserIndex: 2 }))
    expect(result.payments[0]).toBeGreaterThan(0)
    expect(result.payments[2]).toBeLessThan(0)
    expect(result.payments[1]).toBe(0)
    expect(result.payments[3]).toBe(0)
  })
})
