import type { Tile, Suit, SeatWind } from '../types'

// ─── Unicode Mahjong Tile Block (U+1F000–U+1F02B) ────────────────────────────
// These are the exact tile glyphs shown on the Wikipedia HK scoring page.
// They render as full graphical tiles in Segoe UI Emoji / Apple Color Emoji.

export const TILE_UNICODE: Record<string, string> = {
  // Man (Characters 萬) — U+1F007 to U+1F00F
  'man-1': '\u{1F007}', 'man-2': '\u{1F008}', 'man-3': '\u{1F009}',
  'man-4': '\u{1F00A}', 'man-5': '\u{1F00B}', 'man-6': '\u{1F00C}',
  'man-7': '\u{1F00D}', 'man-8': '\u{1F00E}', 'man-9': '\u{1F00F}',
  // Sou (Bamboo 索) — U+1F010 to U+1F018
  'sou-1': '\u{1F010}', 'sou-2': '\u{1F011}', 'sou-3': '\u{1F012}',
  'sou-4': '\u{1F013}', 'sou-5': '\u{1F014}', 'sou-6': '\u{1F015}',
  'sou-7': '\u{1F016}', 'sou-8': '\u{1F017}', 'sou-9': '\u{1F018}',
  // Pin (Circles 餅) — U+1F019 to U+1F021
  'pin-1': '\u{1F019}', 'pin-2': '\u{1F01A}', 'pin-3': '\u{1F01B}',
  'pin-4': '\u{1F01C}', 'pin-5': '\u{1F01D}', 'pin-6': '\u{1F01E}',
  'pin-7': '\u{1F01F}', 'pin-8': '\u{1F020}', 'pin-9': '\u{1F021}',
  // Honors: Winds — U+1F000 to U+1F003
  'honor-1': '\u{1F000}', 'honor-2': '\u{1F001}', 'honor-3': '\u{1F002}', 'honor-4': '\u{1F003}',
  // Honors: Dragons — U+1F004 to U+1F006
  'honor-5': '\u{1F004}', 'honor-6': '\u{1F005}', 'honor-7': '\u{1F006}',
  // Bonus: Flowers — U+1F022 to U+1F025
  'bonus-1': '\u{1F022}', 'bonus-2': '\u{1F023}', 'bonus-3': '\u{1F024}', 'bonus-4': '\u{1F025}',
  // Bonus: Seasons — U+1F026 to U+1F029
  'bonus-5': '\u{1F026}', 'bonus-6': '\u{1F027}', 'bonus-7': '\u{1F028}', 'bonus-8': '\u{1F029}',
}

// Chinese display characters (used inside the styled tile UI)
export const TILE_CHINESE: Record<string, string> = {
  'man-1': '一萬', 'man-2': '二萬', 'man-3': '三萬', 'man-4': '四萬', 'man-5': '五萬',
  'man-6': '六萬', 'man-7': '七萬', 'man-8': '八萬', 'man-9': '九萬',
  'pin-1': '一餅', 'pin-2': '二餅', 'pin-3': '三餅', 'pin-4': '四餅', 'pin-5': '五餅',
  'pin-6': '六餅', 'pin-7': '七餅', 'pin-8': '八餅', 'pin-9': '九餅',
  'sou-1': '一索', 'sou-2': '二索', 'sou-3': '三索', 'sou-4': '四索', 'sou-5': '五索',
  'sou-6': '六索', 'sou-7': '七索', 'sou-8': '八索', 'sou-9': '九索',
  'honor-1': '東', 'honor-2': '南', 'honor-3': '西', 'honor-4': '北',
  'honor-5': '中', 'honor-6': '發', 'honor-7': '白',
  'bonus-1': '梅①東', 'bonus-2': '蘭②南', 'bonus-3': '菊③西', 'bonus-4': '竹④北',
  'bonus-5': '春①東', 'bonus-6': '夏②南', 'bonus-7': '秋③西', 'bonus-8': '冬④北',
}

// English names shown in tooltips
export const TILE_ENGLISH: Record<string, string> = {
  'man-1': '1 of Characters', 'man-2': '2 of Characters', 'man-3': '3 of Characters',
  'man-4': '4 of Characters', 'man-5': '5 of Characters', 'man-6': '6 of Characters',
  'man-7': '7 of Characters', 'man-8': '8 of Characters', 'man-9': '9 of Characters',
  'pin-1': '1 of Circles', 'pin-2': '2 of Circles', 'pin-3': '3 of Circles',
  'pin-4': '4 of Circles', 'pin-5': '5 of Circles', 'pin-6': '6 of Circles',
  'pin-7': '7 of Circles', 'pin-8': '8 of Circles', 'pin-9': '9 of Circles',
  'sou-1': '1 of Bamboo', 'sou-2': '2 of Bamboo', 'sou-3': '3 of Bamboo',
  'sou-4': '4 of Bamboo', 'sou-5': '5 of Bamboo', 'sou-6': '6 of Bamboo',
  'sou-7': '7 of Bamboo', 'sou-8': '8 of Bamboo', 'sou-9': '9 of Bamboo',
  'honor-1': 'East Wind (東風)', 'honor-2': 'South Wind (南風)',
  'honor-3': 'West Wind (西風)', 'honor-4': 'North Wind (北風)',
  'honor-5': 'Red Dragon (中)', 'honor-6': 'Green Dragon (發)',
  'honor-7': 'White Dragon (白)',
  'bonus-1': 'Plum (Flower 1 · East)', 'bonus-2': 'Orchid (Flower 2 · South)',
  'bonus-3': 'Chrysanthemum (Flower 3 · West)', 'bonus-4': 'Bamboo (Flower 4 · North)',
  'bonus-5': 'Spring (Season 1 · East)', 'bonus-6': 'Summer (Season 2 · South)',
  'bonus-7': 'Autumn (Season 3 · West)', 'bonus-8': 'Winter (Season 4 · North)',
}

// Suit accent colors
export const SUIT_COLORS: Record<Suit, string> = {
  man: '#c0392b',
  pin: '#2980b9',
  sou: '#27ae60',
  honor: '#7d3c98',
  bonus: '#d35400',
}

export const SUIT_LABELS: Record<Suit, string> = {
  man: '萬', pin: '餅', sou: '索', honor: '字', bonus: '花',
}

export const WIND_NAMES: Record<number, string> = {
  1: 'East', 2: 'South', 3: 'West', 4: 'North',
}

export const WIND_CHARS: Record<number, string> = {
  1: '東', 2: '南', 3: '西', 4: '北',
}

export const SEAT_WIND_ORDER: SeatWind[] = ['east', 'south', 'west', 'north']

// ─── Utility helpers ──────────────────────────────────────────────────────────

export function tileKey(tile: Tile): string {
  return `${tile.suit}-${tile.value}`
}

export function tilesEqual(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value
}

export function tileUnicode(tile: Tile): string {
  return TILE_UNICODE[tileKey(tile)] ?? '🀫'
}

export function tileChinese(tile: Tile): string {
  return TILE_CHINESE[tileKey(tile)] ?? '?'
}

export function tileEnglish(tile: Tile): string {
  return TILE_ENGLISH[tileKey(tile)] ?? '?'
}

// Legacy alias used in some components
export function tileDisplay(tile: Tile): string {
  return tileChinese(tile)
}

export function tileLabel(tile: Tile): string {
  return tileEnglish(tile)
}

export function isHonor(tile: Tile): boolean {
  return tile.suit === 'honor'
}

export function isBonus(tile: Tile): boolean {
  return tile.suit === 'bonus'
}

export function isTerminal(tile: Tile): boolean {
  return (tile.suit === 'man' || tile.suit === 'pin' || tile.suit === 'sou') &&
    (tile.value === 1 || tile.value === 9)
}

export function isSimple(tile: Tile): boolean {
  return (tile.suit === 'man' || tile.suit === 'pin' || tile.suit === 'sou') &&
    tile.value >= 2 && tile.value <= 8
}

export function isDragon(tile: Tile): boolean {
  return tile.suit === 'honor' && tile.value >= 5
}

export function isWind(tile: Tile): boolean {
  return tile.suit === 'honor' && tile.value <= 4
}

export function windValueToSeat(value: number): SeatWind {
  return (['east', 'south', 'west', 'north'] as const)[value - 1]
}

export function seatToWindValue(seat: SeatWind): number {
  return (['east', 'south', 'west', 'north'] as const).indexOf(seat) + 1
}
