import type { Tile, Meld, Fan, FanBreakdown, ScoringContext, Player } from '../../types'
import { tilesEqual, isDragon, isWind, isTerminal, isHonor, seatToWindValue } from '../../constants/tiles'
import { canFormStandardHand, isSevenPairs, isThirteenOrphans } from './winConditions'
import { groupTiles } from '../../engine/handAnalyzer'

// ─── Fan definitions ──────────────────────────────────────────────────────────

const LIMIT_FAN = 10

const FAN_TABLE: Fan[] = [
  // Limit hands
  { id: 'thirteen_orphans', nameEn: 'Thirteen Orphans', nameZh: '十三么', fan: LIMIT_FAN, isLimit: true },
  { id: 'nine_gates', nameEn: 'Nine Gates', nameZh: '九蓮寶燈', fan: LIMIT_FAN, isLimit: true },
  { id: 'four_concealed_pungs', nameEn: 'Four Concealed Pungs', nameZh: '四暗刻', fan: LIMIT_FAN, isLimit: true },
  { id: 'all_honors', nameEn: 'All Honors', nameZh: '字一色', fan: LIMIT_FAN, isLimit: true },
  { id: 'all_terminals', nameEn: 'All Terminals', nameZh: '么九刻', fan: LIMIT_FAN, isLimit: true },
  // High value
  { id: 'full_flush', nameEn: 'Full Flush', nameZh: '清一色', fan: 7 },
  { id: 'seven_pairs', nameEn: 'Seven Pairs', nameZh: '七對子', fan: 4 },
  { id: 'all_pungs', nameEn: 'All Pungs', nameZh: '對對胡', fan: 3 },
  { id: 'mixed_flush', nameEn: 'Half Flush', nameZh: '混一色', fan: 3 },
  // Medium
  { id: 'all_chows', nameEn: 'All Chows', nameZh: '平胡', fan: 1 },
  { id: 'concealed_self_draw', nameEn: 'Concealed Self Draw', nameZh: '門前清自摸', fan: 1 },
  { id: 'self_draw', nameEn: 'Self Draw', nameZh: '自摸', fan: 1 },
  { id: 'all_concealed', nameEn: 'All Concealed', nameZh: '門前清', fan: 1 },
  { id: 'dragon_pung', nameEn: 'Dragon Pung/Kong', nameZh: '箭刻', fan: 1 },  // per dragon
  { id: 'seat_wind_pung', nameEn: 'Seat Wind Pung', nameZh: '門風', fan: 1 },
  { id: 'prevailing_wind_pung', nameEn: 'Prevailing Wind Pung', nameZh: '圈風', fan: 1 },
  { id: 'last_tile_draw', nameEn: 'Last Tile Draw', nameZh: '海底摸月', fan: 1 },
  { id: 'last_tile_claim', nameEn: 'Last Tile Claim', nameZh: '河底撈魚', fan: 1 },
  { id: 'win_on_kong', nameEn: 'Win on Kong', nameZh: '嶺上開花', fan: 1 },
  { id: 'robbing_kong', nameEn: 'Robbing Kong', nameZh: '搶槓', fan: 1 },
  { id: 'mixed_terminals', nameEn: 'Mixed Terminals', nameZh: '混么九', fan: 2 },
  { id: 'flower_bonus', nameEn: 'Flower/Season', nameZh: '花牌', fan: 1 },  // per tile
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
  const fans: Fan[] = []

  const isConcealed = melds.every(m => m.concealed)

  // ── Limit hands first ──
  if (isThirteenOrphans(allConcealed, melds)) {
    fans.push(getFan('thirteen_orphans'))
    return finalize(fans, ctx)
  }
  if (isNineGates(allConcealed, melds)) {
    fans.push(getFan('nine_gates'))
    return finalize(fans, ctx)
  }
  if (isFourConcealedPungs(allConcealed, melds)) {
    fans.push(getFan('four_concealed_pungs'))
    return finalize(fans, ctx)
  }
  if (isAllHonors(allConcealed, melds)) {
    fans.push(getFan('all_honors'))
    return finalize(fans, ctx)
  }
  if (isAllTerminalsHand(allConcealed, melds)) {
    fans.push(getFan('all_terminals'))
    return finalize(fans, ctx)
  }

  // ── Seven pairs ──
  if (isSevenPairs(allConcealed, melds) && ctx.ruleSettings.sevenPairs) {
    fans.push(getFan('seven_pairs'))
    if (isConcealed && !ctx.isZimo) fans.push(getFan('all_concealed'))
    if (ctx.isZimo && !isConcealed) fans.push(getFan('self_draw'))
    if (ctx.isZimo && isConcealed) fans.push(getFan('concealed_self_draw'))
    addContextFans(fans, ctx)
    return finalize(fans, ctx)
  }

  // ── Standard hand analysis ──
  const allMelds = resolveHandMelds(allConcealed, melds)

  // Flush
  if (isFullFlush(allMelds, allConcealed)) {
    fans.push(getFan('full_flush'))
  } else if (isMixedFlush(allMelds, allConcealed)) {
    fans.push(getFan('mixed_flush'))
  } else if (isMixedTerminals(allMelds, allConcealed)) {
    fans.push(getFan('mixed_terminals'))
  }

  if (isAllPungs(allMelds)) fans.push(getFan('all_pungs'))
  else if (isAllChows(allMelds, isConcealed)) fans.push(getFan('all_chows'))

  // Honor pungs
  for (const meld of allMelds) {
    if (meld.type !== 'pung' && meld.type !== 'kong') continue
    const t = meld.tiles[0]
    if (isDragon(t)) fans.push(getFan('dragon_pung'))
    if (isWind(t) && t.value === seatToWindValue(ctx.seatWind)) fans.push(getFan('seat_wind_pung'))
    if (isWind(t) && t.value === seatToWindValue(ctx.prevailingWind)) fans.push(getFan('prevailing_wind_pung'))
  }

  // Self-draw
  if (ctx.isZimo) {
    if (isConcealed) fans.push(getFan('concealed_self_draw'))
    else fans.push(getFan('self_draw'))
  } else if (isConcealed) {
    fans.push(getFan('all_concealed'))
  }

  addContextFans(fans, ctx)

  return finalize(fans, ctx)
}

function addContextFans(fans: Fan[], ctx: ScoringContext) {
  if (ctx.isLastTile && ctx.isZimo) fans.push(getFan('last_tile_draw'))
  if (ctx.isLastTile && !ctx.isZimo) fans.push(getFan('last_tile_claim'))
  if (ctx.isKongWin) fans.push(getFan('win_on_kong'))
  if (ctx.isRobbedKong) fans.push(getFan('robbing_kong'))

  // Bonus tiles: only award a fan when the tile's number matches the player's seat wind
  // Flowers 1-4 and Seasons 5-8 both map: value mod 4 → seat wind index (east=1…north=4)
  if (ctx.ruleSettings.flowers) {
    const seatVal = seatToWindValue(ctx.seatWind)
    for (const t of ctx.bonusTiles) {
      const tileWindVal = t.value <= 4 ? t.value : t.value - 4
      if (tileWindVal === seatVal) fans.push(getFan('flower_bonus'))
    }
  }
}

function finalize(fans: Fan[], ctx: ScoringContext): FanBreakdown {
  const isLimit = fans.some(f => f.isLimit)
  const totalFan = isLimit ? LIMIT_FAN : fans.reduce((s, f) => s + f.fan, 0)
  const basePoints = totalFan * (ctx.ruleSettings.pointsPerFan ?? 10)

  const payments = computePayments(basePoints, ctx)

  return { fans, totalFan, basePoints, payments }
}

function computePayments(basePoints: number, ctx: ScoringContext): number[] {
  const payments = [0, 0, 0, 0]
  const { winnerIndex, loserIndex, isZimo, isDealer } = ctx

  if (isZimo) {
    // Self-draw: all three other players pay the same amount
    const payPerPlayer = isDealer ? basePoints * 2 : basePoints
    for (let i = 0; i < 4; i++) {
      if (i === winnerIndex) continue
      payments[i] -= payPerPlayer
      payments[winnerIndex] += payPerPlayer
    }
  } else {
    // Discard win: responsible player pays all
    if (loserIndex === null) return payments
    let payment = basePoints * 3  // covers all 3 other players
    if (isDealer) payment *= 2    // winner is dealer: double
    // Check if loser is dealer (loser pays double in some variants)
    // Standard HK: winner is dealer → double; loser is dealer → no extra
    payments[loserIndex] -= payment
    payments[winnerIndex] += payment
  }

  return payments
}

// ─── Hand pattern detectors ───────────────────────────────────────────────────

/** Resolve the full set of melds from concealed + exposed */
function resolveHandMelds(concealed: Tile[], exposedMelds: Meld[]): Meld[] {
  const meldCount = exposedMelds.filter(m => m.type !== 'kong').length +
    exposedMelds.filter(m => m.type === 'kong').length
  const slotsNeeded = 4 - meldCount

  // Find best meld decomposition of concealed tiles
  const inferred = inferMelds(concealed, slotsNeeded)
  return [...exposedMelds, ...inferred]
}

function inferMelds(tiles: Tile[], count: number): Meld[] {
  if (tiles.length === 0 || count === 0) return []
  const result = inferMeldsRecursive([...tiles], count)
  return result ?? []
}

function inferMeldsRecursive(tiles: Tile[], count: number): Meld[] | null {
  if (tiles.length === 2 && count === 0) {
    // This is the pair - handled outside
    return []
  }
  if (tiles.length === 0 && count === 0) return []

  const sorted = [...tiles].sort((a, b) => {
    const so: Record<string, number> = { man: 0, pin: 1, sou: 2, honor: 3, bonus: 4 }
    return ((so[a.suit] ?? 5) - (so[b.suit] ?? 5)) || (a.value - b.value)
  })

  const first = sorted[0]
  const rest = sorted.slice(1)

  // Try pung
  const p1 = rest.findIndex(t => tilesEqual(t, first))
  if (p1 !== -1) {
    const after1 = removeIdx(rest, p1)
    const p2 = after1.findIndex(t => tilesEqual(t, first))
    if (p2 !== -1) {
      const after2 = removeIdx(after1, p2)
      const sub = inferMeldsRecursive(after2, count - 1)
      if (sub !== null) {
        return [{ type: 'pung', tiles: [first, rest[p1], after1[p2]], concealed: true }, ...sub]
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
        const sub = inferMeldsRecursive(after2, count - 1)
        if (sub !== null) {
          return [{ type: 'chow', tiles: [first, rest[midIdx], after1[hiIdx]], concealed: true }, ...sub]
        }
      }
    }
  }

  return null
}

function removeIdx<T>(arr: T[], idx: number): T[] {
  return [...arr.slice(0, idx), ...arr.slice(idx + 1)]
}

function isFullFlush(melds: Meld[], concealed: Tile[]): boolean {
  const allTiles = melds.flatMap(m => m.tiles)
  const suits = new Set(allTiles.filter(t => !isHonor(t)).map(t => t.suit))
  const hasHonor = allTiles.some(isHonor)
  return suits.size === 1 && !hasHonor
}

function isMixedFlush(melds: Meld[], concealed: Tile[]): boolean {
  const allTiles = melds.flatMap(m => m.tiles)
  const suits = new Set(allTiles.filter(t => !isHonor(t)).map(t => t.suit))
  return suits.size === 1
}

function isAllPungs(melds: Meld[]): boolean {
  return melds.filter(m => m.type !== 'pair').every(m => m.type === 'pung' || m.type === 'kong')
}

function isAllChows(melds: Meld[], isConcealed: boolean): boolean {
  return melds.filter(m => m.type !== 'pair').every(m => m.type === 'chow')
}

function isMixedTerminals(melds: Meld[], concealed: Tile[]): boolean {
  const allTiles = melds.flatMap(m => m.tiles)
  return allTiles.every(t => isTerminal(t) || isHonor(t))
}

function isNineGates(concealed: Tile[], melds: Meld[]): boolean {
  if (melds.length > 0) return false
  if (concealed.length !== 14) return false
  const suits = new Set(concealed.map(t => t.suit))
  if (suits.size !== 1 || suits.has('honor') || suits.has('bonus')) return false
  const suit = concealed[0].suit
  const counts: Record<number, number> = {}
  for (const t of concealed) counts[t.value] = (counts[t.value] ?? 0) + 1
  // Pattern: 1112345678999 + any one tile
  if ((counts[1] ?? 0) < 3 || (counts[9] ?? 0) < 3) return false
  for (let v = 2; v <= 8; v++) {
    if ((counts[v] ?? 0) < 1) return false
  }
  return true
}

function isFourConcealedPungs(concealed: Tile[], melds: Meld[]): boolean {
  const allMelds = [...melds]
  const groups = groupTiles(concealed)
  let pungCount = 0
  for (const g of groups.values()) {
    if (g.length >= 3) pungCount++
  }
  const exposedNonKong = melds.filter(m => !m.concealed && m.type !== 'kong')
  return exposedNonKong.length === 0 && pungCount + melds.filter(m => m.concealed).length >= 4
}

function isAllHonors(concealed: Tile[], melds: Meld[]): boolean {
  const all = [...concealed, ...melds.flatMap(m => m.tiles)]
  return all.every(isHonor)
}

function isAllTerminalsHand(concealed: Tile[], melds: Meld[]): boolean {
  const all = [...concealed, ...melds.flatMap(m => m.tiles)]
  return all.every(isTerminal)
}
