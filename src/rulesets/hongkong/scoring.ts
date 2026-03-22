import type { Tile, Meld, Fan, FanBreakdown, ScoringContext, Player, RuleSettings, SeatWind } from '../../types'
import { tilesEqual, isDragon, isWind, isTerminal, isHonor, seatToWindValue } from '../../constants/tiles'
import { isSevenPairs, isThirteenOrphans } from './winConditions'
import { groupTiles } from '../../engine/handAnalyzer'

// ─── Fan definitions ──────────────────────────────────────────────────────────

const LIMIT_FAN = 13

const FAN_TABLE: Fan[] = [
  // Limit hands
  { id: 'thirteen_orphans',     nameEn: 'Thirteen Orphans',      nameZh: '十三么',   fan: LIMIT_FAN, isLimit: true },
  { id: 'nine_gates',           nameEn: 'Nine Gates',            nameZh: '九蓮寶燈', fan: LIMIT_FAN, isLimit: true },
  { id: 'four_concealed_pungs', nameEn: 'Four Concealed Pungs',  nameZh: '四暗刻',   fan: LIMIT_FAN, isLimit: true },
  { id: 'all_honors',           nameEn: 'All Honors',            nameZh: '字一色',   fan: LIMIT_FAN, isLimit: true },
  { id: 'all_terminals',        nameEn: 'All Terminals',         nameZh: '清么九',   fan: LIMIT_FAN, isLimit: true },
  { id: 'big_four_winds',       nameEn: 'Big Four Winds',        nameZh: '大四喜',   fan: LIMIT_FAN, isLimit: true },
  { id: 'big_three_dragons',    nameEn: 'Big Three Dragons',     nameZh: '大三元',   fan: LIMIT_FAN, isLimit: true },
  { id: 'four_kongs',           nameEn: 'Four Kongs',            nameZh: '四槓',     fan: LIMIT_FAN, isLimit: true },
  // High value
  { id: 'full_flush',           nameEn: 'Full Flush',            nameZh: '清一色',   fan: 7 },
  { id: 'seven_pairs',          nameEn: 'Seven Pairs',           nameZh: '七對子',   fan: 4 },
  { id: 'all_pungs',            nameEn: 'All Pungs',             nameZh: '對對胡',   fan: 3 },
  { id: 'mixed_flush',          nameEn: 'Half Flush',            nameZh: '混一色',   fan: 3 },
  { id: 'small_three_dragons',  nameEn: 'Small Three Dragons',   nameZh: '小三元',   fan: 3 },
  { id: 'small_four_winds',     nameEn: 'Small Four Winds',      nameZh: '小四喜',   fan: 3 },
  // Medium
  { id: 'mixed_terminals',      nameEn: 'Mixed Terminals',       nameZh: '混么九',   fan: 2 },
  { id: 'all_chows',            nameEn: 'All Chows',             nameZh: '平胡',     fan: 1 },
  { id: 'concealed_self_draw',  nameEn: 'Concealed Self Draw',   nameZh: '門前清自摸', fan: 1 },
  { id: 'self_draw',            nameEn: 'Self Draw',             nameZh: '自摸',     fan: 1 },
  { id: 'all_concealed',        nameEn: 'All Concealed',         nameZh: '門前清',   fan: 1 },
  { id: 'dragon_pung',          nameEn: 'Dragon Pung/Kong',      nameZh: '箭刻',     fan: 1 },
  { id: 'seat_wind_pung',       nameEn: 'Seat Wind Pung',        nameZh: '門風',     fan: 1 },
  { id: 'prevailing_wind_pung', nameEn: 'Prevailing Wind Pung',  nameZh: '圈風',     fan: 1 },
  { id: 'last_tile_draw',       nameEn: 'Last Tile Draw',        nameZh: '海底摸月', fan: 1 },
  { id: 'last_tile_claim',      nameEn: 'Last Tile Claim',       nameZh: '河底撈魚', fan: 1 },
  { id: 'win_on_kong',          nameEn: 'Win on Kong',           nameZh: '嶺上開花', fan: 1 },
  { id: 'robbing_kong',         nameEn: 'Robbing Kong',          nameZh: '搶槓',     fan: 1 },
  { id: 'flower_bonus',         nameEn: 'Flower/Season',         nameZh: '花牌',     fan: 1 },
  { id: 'no_bonus',             nameEn: 'No Flowers/Seasons',    nameZh: '無花',     fan: 1 },
]

function getFan(id: string): Fan {
  return FAN_TABLE.find(f => f.id === id)!
}

// ─── Main scoring function ────────────────────────────────────────────────────

export function calculateScore(
  hand: Tile[],
  melds: Meld[],
  ctx: ScoringContext
): FanBreakdown {
  const allConcealed = [...hand, ctx.winTile]
  const isConcealed = melds.every(m => m.concealed)

  // ── Limit hands (structure-independent) ──
  if (isThirteenOrphans(allConcealed, melds)) {
    return finalize([getFan('thirteen_orphans')], ctx)
  }
  if (isNineGates(allConcealed, melds)) {
    return finalize([getFan('nine_gates')], ctx)
  }
  if (isFourConcealedPungs(allConcealed, melds)) {
    return finalize([getFan('four_concealed_pungs')], ctx)
  }
  if (isAllHonors(allConcealed, melds)) {
    return finalize([getFan('all_honors')], ctx)
  }
  if (isAllTerminalsHand(allConcealed, melds)) {
    return finalize([getFan('all_terminals')], ctx)
  }
  if (isBigFourWinds(allConcealed, melds)) {
    return finalize([getFan('big_four_winds')], ctx)
  }
  if (isBigThreeDragons(allConcealed, melds)) {
    return finalize([getFan('big_three_dragons')], ctx)
  }
  if (isFourKongs(melds)) {
    return finalize([getFan('four_kongs')], ctx)
  }

  // ── Seven pairs ──
  if (isSevenPairs(allConcealed, melds) && ctx.ruleSettings.sevenPairs) {
    const fans: Fan[] = [getFan('seven_pairs')]
    if (isConcealed && !ctx.isZimo) fans.push(getFan('all_concealed'))
    if (ctx.isZimo && !isConcealed) fans.push(getFan('self_draw'))
    if (ctx.isZimo && isConcealed) fans.push(getFan('concealed_self_draw'))
    addContextFans(fans, ctx)
    return finalize(fans, ctx)
  }

  // ── Standard hand: try ALL valid decompositions, keep best ──
  const allDecompositions = resolveAllHandMelds(allConcealed, melds)

  let bestFans: Fan[] = []
  let bestTotal = -1

  for (const decomp of allDecompositions) {
    const fans = scoreMelds(decomp, isConcealed, ctx)
    const total = fans.reduce((s, f) => s + f.fan, 0)
    if (total > bestTotal) {
      bestTotal = total
      bestFans = fans
    }
  }

  if (bestFans.length === 0) {
    // Fallback if no valid decomposition found
    bestFans = []
  }

  addContextFans(bestFans, ctx)
  return finalize(bestFans, ctx)
}

// Score a specific decomposition (without context fans)
function scoreMelds(allMelds: Meld[], isConcealed: boolean, ctx: ScoringContext): Fan[] {
  const fans: Fan[] = []

  // Flush / terminals
  if (isFullFlush(allMelds)) {
    fans.push(getFan('full_flush'))
  } else if (isMixedFlush(allMelds)) {
    fans.push(getFan('mixed_flush'))
  } else if (isMixedTerminalsHand(allMelds)) {
    fans.push(getFan('mixed_terminals'))
  }

  // All pungs / all chows
  if (isAllPungs(allMelds)) {
    fans.push(getFan('all_pungs'))
  } else if (isAllChows(allMelds)) {
    fans.push(getFan('all_chows'))
  }

  // Dragon fans
  const dragonPungs = allMelds.filter(
    m => (m.type === 'pung' || m.type === 'kong') && isDragon(m.tiles[0])
  )
  const dragonPairs = allMelds.filter(m => m.type === 'pair' && isDragon(m.tiles[0]))

  if (dragonPungs.length === 2 && dragonPairs.length === 1) {
    fans.push(getFan('small_three_dragons'))
  } else {
    for (const _ of dragonPungs) fans.push(getFan('dragon_pung'))
  }

  // Wind fans
  const windPungs = allMelds.filter(
    m => (m.type === 'pung' || m.type === 'kong') && isWind(m.tiles[0])
  )
  const windPairs = allMelds.filter(m => m.type === 'pair' && isWind(m.tiles[0]))
  const allFourWindsPung = [1, 2, 3, 4].every(v =>
    windPungs.some(m => m.tiles[0].value === v)
  )
  const threeDiffWindPungs = windPungs.length >= 3
  const fourthWindPair = windPungs.length === 3 && windPairs.some(
    m => ![...windPungs.map(p => p.tiles[0].value)].includes(m.tiles[0].value)
  )

  if (!allFourWindsPung) {
    // Small four winds already counted as limit above — check per-wind fans
    for (const m of windPungs) {
      if (m.tiles[0].value === seatToWindValue(ctx.seatWind)) fans.push(getFan('seat_wind_pung'))
      if (m.tiles[0].value === seatToWindValue(ctx.prevailingWind)) fans.push(getFan('prevailing_wind_pung'))
    }
  }

  // Small four winds: 3 wind pungs + pair of 4th wind
  if (threeDiffWindPungs && fourthWindPair) {
    fans.push(getFan('small_four_winds'))
  }

  // Self-draw / concealed
  if (ctx.isZimo) {
    fans.push(isConcealed ? getFan('concealed_self_draw') : getFan('self_draw'))
  } else if (isConcealed) {
    fans.push(getFan('all_concealed'))
  }

  return fans
}

function addContextFans(fans: Fan[], ctx: ScoringContext) {
  if (ctx.isLastTile && ctx.isZimo) fans.push(getFan('last_tile_draw'))
  if (ctx.isLastTile && !ctx.isZimo) fans.push(getFan('last_tile_claim'))
  if (ctx.isKongWin) fans.push(getFan('win_on_kong'))
  if (ctx.isRobbedKong) fans.push(getFan('robbing_kong'))

  if (ctx.ruleSettings.flowers) {
    const seatVal = seatToWindValue(ctx.seatWind)
    for (const t of ctx.bonusTiles) {
      const tileWindVal = t.value <= 4 ? t.value : t.value - 4
      if (tileWindVal === seatVal) fans.push(getFan('flower_bonus'))
    }
  }

  if (ctx.ruleSettings.noBonusFan && ctx.bonusTiles.length === 0) {
    fans.push(getFan('no_bonus'))
  }
}

function finalize(fans: Fan[], ctx: ScoringContext): FanBreakdown {
  const isLimit = fans.some(f => f.isLimit)
  const totalFan = isLimit ? LIMIT_FAN : fans.reduce((s, f) => s + f.fan, 0)
  const basePoints = totalFan * (ctx.ruleSettings.pointsPerFan ?? 1)
  return { fans, totalFan, basePoints, payments: computePayments(basePoints, ctx) }
}

function computePayments(basePoints: number, ctx: ScoringContext): number[] {
  const payments = [0, 0, 0, 0]
  const { winnerIndex, loserIndex, isZimo } = ctx
  if (isZimo) {
    for (let i = 0; i < 4; i++) {
      if (i === winnerIndex) continue
      payments[i] -= basePoints
      payments[winnerIndex] += basePoints
    }
  } else {
    if (loserIndex === null) return payments
    payments[loserIndex] -= basePoints
    payments[winnerIndex] += basePoints
  }
  return payments
}

// ─── Meld decomposition ───────────────────────────────────────────────────────

/** Return ALL valid meld decompositions combining exposed melds + inferred concealed melds */
function resolveAllHandMelds(concealed: Tile[], exposedMelds: Meld[]): Meld[][] {
  const slotsNeeded = 4 - exposedMelds.length
  const allDecomps = inferAllMelds(concealed, slotsNeeded)
  if (allDecomps.length === 0) return [[...exposedMelds]]
  return allDecomps.map(inferred => [...exposedMelds, ...inferred])
}

function inferAllMelds(tiles: Tile[], count: number): Meld[][] {
  // Enumerate every valid pair choice first, then form `count` melds from the rest.
  // This avoids the bug where the old recursive approach failed when pair tiles
  // sorted before later meld tiles (e.g. man pair + sou chows).
  if (tiles.length < 2) return []

  const sorted = tileSort([...tiles])
  const results: Meld[][] = []
  const triedPairs = new Set<string>()

  for (let i = 0; i < sorted.length - 1; i++) {
    const pairKey = `${sorted[i].suit}-${sorted[i].value}`
    if (triedPairs.has(pairKey)) continue

    const j = sorted.findIndex((t, idx) => idx > i && tilesEqual(t, sorted[i]))
    if (j === -1) continue
    triedPairs.add(pairKey)

    const remaining = sorted.filter((_, idx) => idx !== i && idx !== j)
    const meldDecomps = inferMeldsOnly(remaining, count)
    for (const melds of meldDecomps) {
      results.push([{ type: 'pair' as const, tiles: [sorted[i], sorted[j]], concealed: true }, ...melds])
    }
  }

  return results
}

/** Form exactly `count` melds from `tiles` — no pair handling. */
function inferMeldsOnly(tiles: Tile[], count: number): Meld[][] {
  if (count === 0) return tiles.length === 0 ? [[]] : []
  if (tiles.length < 3) return []

  const sorted = tileSort([...tiles])
  const results: Meld[][] = []
  const first = sorted[0]
  const rest = sorted.slice(1)

  // Try pung
  const p1 = rest.findIndex(t => tilesEqual(t, first))
  if (p1 !== -1) {
    const after1 = removeIdx(rest, p1)
    const p2 = after1.findIndex(t => tilesEqual(t, first))
    if (p2 !== -1) {
      const after2 = removeIdx(after1, p2)
      for (const sub of inferMeldsOnly(after2, count - 1)) {
        results.push([{ type: 'pung', tiles: [first, rest[p1], after1[p2]], concealed: true }, ...sub])
      }
    }
  }

  // Try chow
  if (first.suit !== 'honor' && first.suit !== 'bonus') {
    const midIdx = rest.findIndex(t => t.suit === first.suit && t.value === first.value + 1)
    if (midIdx !== -1) {
      const after1 = removeIdx(rest, midIdx)
      const hiIdx = after1.findIndex(t => t.suit === first.suit && t.value === first.value + 2)
      if (hiIdx !== -1) {
        const after2 = removeIdx(after1, hiIdx)
        for (const sub of inferMeldsOnly(after2, count - 1)) {
          results.push([{ type: 'chow', tiles: [first, rest[midIdx], after1[hiIdx]], concealed: true }, ...sub])
        }
      }
    }
  }

  return results
}

function tileSort(tiles: Tile[]): Tile[] {
  const so: Record<string, number> = { man: 0, pin: 1, sou: 2, honor: 3, bonus: 4 }
  return tiles.sort((a, b) => ((so[a.suit] ?? 5) - (so[b.suit] ?? 5)) || (a.value - b.value))
}

function removeIdx<T>(arr: T[], idx: number): T[] {
  return [...arr.slice(0, idx), ...arr.slice(idx + 1)]
}

// ─── Pattern detectors ────────────────────────────────────────────────────────

function isFullFlush(melds: Meld[]): boolean {
  const tiles = melds.flatMap(m => m.tiles)
  const suits = new Set(tiles.filter(t => !isHonor(t)).map(t => t.suit))
  return suits.size === 1 && !tiles.some(isHonor)
}

function isMixedFlush(melds: Meld[]): boolean {
  const tiles = melds.flatMap(m => m.tiles)
  const suits = new Set(tiles.filter(t => !isHonor(t)).map(t => t.suit))
  return suits.size === 1
}

function isAllPungs(melds: Meld[]): boolean {
  return melds.filter(m => m.type !== 'pair').every(m => m.type === 'pung' || m.type === 'kong')
}

function isAllChows(melds: Meld[]): boolean {
  return melds.filter(m => m.type !== 'pair').every(m => m.type === 'chow')
}

function isMixedTerminalsHand(melds: Meld[]): boolean {
  return melds.flatMap(m => m.tiles).every(t => isTerminal(t) || isHonor(t))
}

function isNineGates(concealed: Tile[], melds: Meld[]): boolean {
  if (melds.length > 0) return false
  if (concealed.length !== 14) return false
  const suits = new Set(concealed.map(t => t.suit))
  if (suits.size !== 1 || suits.has('honor') || suits.has('bonus')) return false
  const counts: Record<number, number> = {}
  for (const t of concealed) counts[t.value] = (counts[t.value] ?? 0) + 1
  if ((counts[1] ?? 0) < 3 || (counts[9] ?? 0) < 3) return false
  for (let v = 2; v <= 8; v++) {
    if ((counts[v] ?? 0) < 1) return false
  }
  return true
}

function isFourConcealedPungs(concealed: Tile[], melds: Meld[]): boolean {
  const exposedNonKong = melds.filter(m => !m.concealed && m.type !== 'kong')
  if (exposedNonKong.length > 0) return false
  const groups = groupTiles(concealed)
  let pungCount = 0
  for (const g of groups.values()) {
    if (g.length >= 3) pungCount++
  }
  return pungCount + melds.filter(m => m.concealed).length >= 4
}

function isAllHonors(concealed: Tile[], melds: Meld[]): boolean {
  return [...concealed, ...melds.flatMap(m => m.tiles)].every(isHonor)
}

function isAllTerminalsHand(concealed: Tile[], melds: Meld[]): boolean {
  return [...concealed, ...melds.flatMap(m => m.tiles)].every(isTerminal)
}

function isBigFourWinds(concealed: Tile[], melds: Meld[]): boolean {
  const all = [...concealed, ...melds.flatMap(m => m.tiles)]
  // All 4 winds must appear as pungs/kongs — need 4×3 = 12 wind tiles + 2 pair = 14
  // Check via decompositions: all 4 wind values must have pung/kong somewhere
  // Simple heuristic: count wind tiles
  const windCounts: Record<number, number> = {}
  for (const t of all) {
    if (isWind(t)) windCounts[t.value] = (windCounts[t.value] ?? 0) + 1
  }
  return [1, 2, 3, 4].every(v => (windCounts[v] ?? 0) >= 3)
}

function isBigThreeDragons(concealed: Tile[], melds: Meld[]): boolean {
  const all = [...concealed, ...melds.flatMap(m => m.tiles)]
  const dragonCounts: Record<number, number> = {}
  for (const t of all) {
    if (isDragon(t)) dragonCounts[t.value] = (dragonCounts[t.value] ?? 0) + 1
  }
  return [5, 6, 7].every(v => (dragonCounts[v] ?? 0) >= 3)
}

function isFourKongs(melds: Meld[]): boolean {
  return melds.filter(m => m.type === 'kong').length >= 4
}

// ─── Fan threshold check (for win-offer gating) ───────────────────────────────

/**
 * Returns true if the hand would score >= minFanToWin fans.
 * hand should NOT include winTile (calculateScore adds it internally).
 */
export function checkWinMeetsFan(
  hand: Tile[],
  melds: Meld[],
  winTile: Tile,
  isZimo: boolean,
  player: Player,
  prevailingWind: SeatWind,
  wallEmpty: boolean,
  winnerIndex: number,
  loserIndex: number | null,
  allPlayers: Player[],
  ruleSettings: RuleSettings,
): boolean {
  if (ruleSettings.minFanToWin === 0) return true
  const ctx: ScoringContext = {
    isZimo,
    isDealer: player.isDealer,
    prevailingWind,
    seatWind: player.seatWind,
    winTile,
    isLastTile: wallEmpty,
    isKongWin: false,
    isRobbedKong: false,
    bonusTiles: player.bonusTiles,
    winnerIndex,
    loserIndex,
    players: allPlayers,
    ruleSettings,
  }
  return calculateScore(hand, melds, ctx).totalFan >= ruleSettings.minFanToWin
}
