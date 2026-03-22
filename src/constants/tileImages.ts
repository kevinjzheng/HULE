// ─── Tile image URLs via Vite glob import ─────────────────────────────────────
// Images are in <project-root>/images/mahjong_tiles/ and imported as asset URLs

const rawImages = import.meta.glob('/images/mahjong_tiles/**/*.png', { eager: true }) as Record<string, { default: string }>

function img(relativePath: string): string {
  return rawImages[`/images/mahjong_tiles/${relativePath}`]?.default ?? ''
}

export const TILE_IMAGE_MAP: Record<string, string> = {
  // Characters (Man)
  'man-1': img('man/man1.png'), 'man-2': img('man/man2.png'), 'man-3': img('man/man3.png'),
  'man-4': img('man/man4.png'), 'man-5': img('man/man5.png'), 'man-6': img('man/man6.png'),
  'man-7': img('man/man7.png'), 'man-8': img('man/man8.png'), 'man-9': img('man/man9.png'),
  // Bamboo (Sou)
  'sou-1': img('bamboo/bamboo1.png'), 'sou-2': img('bamboo/bamboo2.png'), 'sou-3': img('bamboo/bamboo3.png'),
  'sou-4': img('bamboo/bamboo4.png'), 'sou-5': img('bamboo/bamboo5.png'), 'sou-6': img('bamboo/bamboo6.png'),
  'sou-7': img('bamboo/bamboo7.png'), 'sou-8': img('bamboo/bamboo8.png'), 'sou-9': img('bamboo/bamboo9.png'),
  // Circles (Pin)
  'pin-1': img('circle/circle1.png'), 'pin-2': img('circle/circle2.png'), 'pin-3': img('circle/circle3.png'),
  'pin-4': img('circle/circle4.png'), 'pin-5': img('circle/circle5.png'), 'pin-6': img('circle/circle6.png'),
  'pin-7': img('circle/circle7.png'), 'pin-8': img('circle/circle8.png'), 'pin-9': img('circle/circle9.png'),
  // Winds
  'honor-1': img('honor/wind_east.png'),
  'honor-2': img('honor/wind_south.png'),
  'honor-3': img('honor/wind_west.png'),
  'honor-4': img('honor/wind_north.png'),
  // Dragons
  'honor-5': img('honor/dragon_red.png'),
  'honor-6': img('honor/dragon_green.png'),
  'honor-7': img('honor/dragon_white.png'),  // white dragon from honor folder
  // Flowers
  'bonus-1': img('flower/flower1.png'), 'bonus-2': img('flower/flower2.png'),
  'bonus-3': img('flower/flower3.png'), 'bonus-4': img('flower/flower4.png'),
  // Seasons
  'bonus-5': img('season/season1.png'), 'bonus-6': img('season/season2.png'),
  'bonus-7': img('season/season3.png'), 'bonus-8': img('season/season4.png'),
}

export const TILE_BACK_IMAGE: string = rawImages['/images/mahjong_tiles/special/back.png']?.default ?? ''
export const TILE_BLANK_IMAGE: string = rawImages['/images/mahjong_tiles/special/blank.png']?.default ?? ''

export function getTileImage(tileKey: string): string {
  return TILE_IMAGE_MAP[tileKey] ?? ''
}
