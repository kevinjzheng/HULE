import {
  isValidWin,
  isThirteenOrphans,
  isSevenPairs,
  canFormStandardHand,
  getChowOptions,
  getPungTiles,
  getKongTiles,
  getClosedKongOptions,
  getExtendKongOptions,
} from '../winConditions'
import type { Meld } from '../../../types'
import {
  man, pin, sou, honor,
  East, South, West, North, Chun, Hatsu, Haku,
  pungMeld,
} from './testHelpers'

const noMelds: Meld[] = []

// ─────────────────────────────────────────────────────────────────────────────
// isValidWin
// ─────────────────────────────────────────────────────────────────────────────

describe('isValidWin', () => {
  test('valid standard hand — 4 melds + pair', () => {
    const hand = [man(1), man(2), man(3), man(4), man(5), man(6), man(7), man(8), man(9), pin(1), pin(2), pin(3), pin(5)]
    expect(isValidWin(hand, noMelds, pin(5))).toBe(true)
  })

  test('valid — with one exposed meld', () => {
    const exposed = pungMeld(man(9), false)
    const hand = [man(1), man(2), man(3), man(4), man(5), man(6), pin(1), pin(2), pin(3), pin(5)]
    expect(isValidWin(hand, [exposed], pin(5))).toBe(true)
  })

  test('invalid — wrong tile count', () => {
    const hand = [man(1), man(2), man(3)] // not enough tiles
    expect(isValidWin(hand, noMelds, man(4))).toBe(false)
  })

  test('invalid — tiles cannot form valid groups', () => {
    // 13 random tiles with no valid decomposition
    const hand = [man(1), man(3), pin(2), pin(5), sou(7), sou(9), East(), South(), West(), North(), Chun(), Hatsu(), Haku()]
    expect(isValidWin(hand, noMelds, man(1))).toBe(false)
  })

  test('seven_pairs is valid', () => {
    const hand = [man(1), man(1), man(2), man(2), man(3), man(3), man(4), man(4), man(5), man(5), man(6), man(6), pin(7)]
    expect(isValidWin(hand, noMelds, pin(7))).toBe(true)
  })

  test('thirteen_orphans is valid', () => {
    const hand = [man(1), man(9), pin(1), pin(9), sou(1), sou(9), East(), South(), West(), North(), Chun(), Hatsu(), Haku()]
    expect(isValidWin(hand, noMelds, man(1))).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// isThirteenOrphans
// ─────────────────────────────────────────────────────────────────────────────

describe('isThirteenOrphans', () => {
  test('valid — all 13 types present plus one duplicate', () => {
    const tiles = [man(1), man(9), pin(1), pin(9), sou(1), sou(9), East(), South(), West(), North(), Chun(), Hatsu(), Haku(), man(1)]
    expect(isThirteenOrphans(tiles, noMelds)).toBe(true)
  })

  test('invalid — missing one orphan type', () => {
    // Missing man(9), have two man(1)s instead
    const tiles = [man(1), man(1), pin(1), pin(9), sou(1), sou(9), East(), South(), West(), North(), Chun(), Hatsu(), Haku(), man(1)]
    expect(isThirteenOrphans(tiles, noMelds)).toBe(false)
  })

  test('invalid — has exposed melds', () => {
    const tiles = [man(1), man(9), pin(1), pin(9), sou(1), sou(9), East(), South(), West(), North(), Chun(), Hatsu(), Haku(), man(1)]
    expect(isThirteenOrphans(tiles, [pungMeld(man(2), false)])).toBe(false)
  })

  test('invalid — wrong tile count', () => {
    const tiles = [man(1), man(9), pin(1), pin(9), sou(1), sou(9), East(), South(), West(), North(), Chun(), Hatsu(), Haku()]
    expect(isThirteenOrphans(tiles, noMelds)).toBe(false) // 13 tiles, needs 14
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// isSevenPairs
// ─────────────────────────────────────────────────────────────────────────────

describe('isSevenPairs', () => {
  test('valid — 7 distinct pairs', () => {
    const tiles = [man(1), man(1), man(2), man(2), man(3), man(3), pin(4), pin(4), pin(5), pin(5), sou(6), sou(6), East(), East()]
    expect(isSevenPairs(tiles, noMelds)).toBe(true)
  })

  test('invalid — 4 of same tile (not two pairs)', () => {
    const tiles = [man(1), man(1), man(1), man(1), man(2), man(2), man(3), man(3), pin(4), pin(4), sou(5), sou(5), East(), East()]
    expect(isSevenPairs(tiles, noMelds)).toBe(false)
  })

  test('invalid — has exposed melds', () => {
    const tiles = [man(1), man(1), man(2), man(2), man(3), man(3), pin(4), pin(4), pin(5), pin(5), sou(6), sou(6), East(), East()]
    expect(isSevenPairs(tiles, [pungMeld(man(7), false)])).toBe(false)
  })

  test('invalid — wrong tile count', () => {
    const tiles = [man(1), man(1), man(2), man(2), man(3), man(3), pin(4), pin(4), pin(5), pin(5), sou(6), sou(6), East()]
    expect(isSevenPairs(tiles, noMelds)).toBe(false) // 13 tiles
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// canFormStandardHand
// ─────────────────────────────────────────────────────────────────────────────

describe('canFormStandardHand', () => {
  test('4 melds + pair — all chows', () => {
    const tiles = [man(1), man(2), man(3), man(4), man(5), man(6), man(7), man(8), man(9), pin(1), pin(2), pin(3), pin(5), pin(5)]
    expect(canFormStandardHand(tiles, 4)).toBe(true)
  })

  test('4 melds + pair — all pungs', () => {
    const tiles = [man(1), man(1), man(1), man(2), man(2), man(2), man(3), man(3), man(3), man(4), man(4), man(4), pin(5), pin(5)]
    expect(canFormStandardHand(tiles, 4)).toBe(true)
  })

  test('with 1 exposed meld — 3 concealed melds + pair', () => {
    // Only 11 tiles needed (3*3 + 2)
    const tiles = [man(1), man(2), man(3), man(4), man(5), man(6), man(7), man(8), man(9), pin(5), pin(5)]
    expect(canFormStandardHand(tiles, 3)).toBe(true)
  })

  test('invalid — extra tile', () => {
    const tiles = [man(1), man(2), man(3), man(4), man(5), man(6), man(7), man(8), man(9), pin(1), pin(2), pin(3), pin(5), pin(5), pin(6)]
    expect(canFormStandardHand(tiles, 4)).toBe(false)
  })

  test('invalid — no valid grouping', () => {
    const tiles = [man(1), man(3), pin(2), pin(6), sou(4), sou(8), East(), South(), West(), North(), Chun(), Hatsu(), Haku(), man(5)]
    expect(canFormStandardHand(tiles, 4)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getChowOptions
// ─────────────────────────────────────────────────────────────────────────────

describe('getChowOptions', () => {
  test('discard as LOW tile — hand has +1 and +2', () => {
    const discard = man(3)
    const hand = [man(4), man(5), man(7), man(8)]
    const opts = getChowOptions(hand, discard)
    expect(opts.some(o => o.some(t => t.value === 4) && o.some(t => t.value === 5))).toBe(true)
  })

  test('discard as MID tile — hand has -1 and +1', () => {
    const discard = man(5)
    const hand = [man(4), man(6), man(7), man(8)]
    const opts = getChowOptions(hand, discard)
    expect(opts.some(o => o.some(t => t.value === 4) && o.some(t => t.value === 6))).toBe(true)
  })

  test('discard as HIGH tile — hand has -2 and -1', () => {
    const discard = man(7)
    const hand = [man(5), man(6), man(8), man(9)]
    const opts = getChowOptions(hand, discard)
    expect(opts.some(o => o.some(t => t.value === 5) && o.some(t => t.value === 6))).toBe(true)
  })

  test('all three patterns available', () => {
    const discard = man(5)
    const hand = [man(3), man(4), man(6), man(7)] // (3,4 | 4,6 | 6,7)
    const opts = getChowOptions(hand, discard)
    expect(opts.length).toBe(3)
  })

  test('honor tile — no chow options', () => {
    const discard = East()
    const hand = [East(), East(), South(), Chun()]
    const opts = getChowOptions(hand, discard)
    expect(opts).toHaveLength(0)
  })

  test('no matching tiles — empty options', () => {
    const discard = man(5)
    const hand = [pin(4), pin(6), sou(3), sou(7)]
    const opts = getChowOptions(hand, discard)
    expect(opts).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getPungTiles / getKongTiles
// ─────────────────────────────────────────────────────────────────────────────

describe('getPungTiles', () => {
  test('returns two matching tiles when available', () => {
    const discard = man(5)
    const hand = [man(5), man(5), man(3), man(7)]
    const result = getPungTiles(hand, discard)
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
  })

  test('returns null when only one match', () => {
    const discard = man(5)
    const hand = [man(5), man(3), man(7)]
    expect(getPungTiles(hand, discard)).toBeNull()
  })

  test('returns null when no match', () => {
    const discard = man(5)
    const hand = [man(3), man(7), pin(1)]
    expect(getPungTiles(hand, discard)).toBeNull()
  })
})

describe('getKongTiles', () => {
  test('returns three matching tiles when available', () => {
    const discard = man(5)
    const hand = [man(5), man(5), man(5), man(3)]
    const result = getKongTiles(hand, discard)
    expect(result).not.toBeNull()
    expect(result).toHaveLength(3)
  })

  test('returns null when only two matches (need 3)', () => {
    const discard = man(5)
    const hand = [man(5), man(5), man(3)]
    expect(getKongTiles(hand, discard)).toBeNull()
  })

  test('returns null when no match', () => {
    const discard = man(5)
    const hand = [man(3), man(7)]
    expect(getKongTiles(hand, discard)).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getClosedKongOptions
// ─────────────────────────────────────────────────────────────────────────────

describe('getClosedKongOptions', () => {
  test('finds a set of 4 matching tiles', () => {
    const hand = [man(5), man(5), man(5), man(5), man(3), man(4)]
    const result = getClosedKongOptions(hand)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(4)
  })

  test('finds multiple sets of 4', () => {
    const hand = [man(5), man(5), man(5), man(5), man(3), man(3), man(3), man(3)]
    const result = getClosedKongOptions(hand)
    expect(result).toHaveLength(2)
  })

  test('returns empty when no group of 4', () => {
    const hand = [man(5), man(5), man(5), man(3), man(3)]
    expect(getClosedKongOptions(hand)).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getExtendKongOptions
// ─────────────────────────────────────────────────────────────────────────────

describe('getExtendKongOptions', () => {
  test('returns pung meld when drawn tile matches pung', () => {
    const pung = pungMeld(man(5), false)
    const drawn = man(5)
    const result = getExtendKongOptions([drawn, man(3)], [pung], drawn)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(pung)
  })

  test('returns empty when drawn tile does not match any pung', () => {
    const pung = pungMeld(man(5), false)
    const drawn = man(3)
    const result = getExtendKongOptions([drawn, man(1)], [pung], drawn)
    expect(result).toHaveLength(0)
  })

  test('returns empty when there are no melds', () => {
    const drawn = man(5)
    const result = getExtendKongOptions([drawn], noMelds, drawn)
    expect(result).toHaveLength(0)
  })
})
