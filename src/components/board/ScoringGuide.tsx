import React, { useState, useEffect } from 'react'
import { FAN_TABLE } from '../../rulesets/hongkong/scoring'
import type { Fan } from '../../types'
import { getTileImage } from '../../constants/tileImages'
import { cn } from '../../utils/cn'

// ─── Tile image examples ──────────────────────────────────────────────────────
// Each entry is an array of segments. A segment is either:
//   string[]  → tile keys to render as small images (one meld / group)
//   string    → a short text annotation (e.g. "or", "+ melds")

type Seg = string[] | string
const T = (...keys: string[]): string[] => keys  // shorthand

const FAN_TILE_EXAMPLES: Record<string, Seg[]> = {
  thirteen_orphans:     [T('man-1','man-9','pin-1','pin-9','sou-1','sou-9','honor-1','honor-2','honor-3','honor-4','honor-5','honor-6','honor-7')],
  nine_gates:           [T('man-1','man-1','man-1','man-2','man-3','man-4','man-5','man-6','man-7','man-8','man-9','man-9','man-9')],
  four_concealed_pungs: [T('man-1','man-1','man-1'), T('pin-1','pin-1','pin-1'), T('sou-1','sou-1','sou-1'), T('honor-1','honor-1','honor-1'), T('honor-2','honor-2')],
  all_honors:           [T('honor-1','honor-1','honor-1'), T('honor-2','honor-2','honor-2'), T('honor-5','honor-5','honor-5'), T('honor-6','honor-6','honor-6'), T('honor-7','honor-7')],
  all_terminals:        [T('man-1','man-1','man-1'), T('man-9','man-9','man-9'), T('pin-1','pin-1','pin-1'), T('pin-9','pin-9','pin-9'), T('sou-1','sou-1')],
  big_four_winds:       [T('honor-1','honor-1','honor-1'), T('honor-2','honor-2','honor-2'), T('honor-3','honor-3','honor-3'), T('honor-4','honor-4','honor-4'), T('honor-5','honor-5')],
  big_three_dragons:    [T('honor-5','honor-5','honor-5'), T('honor-6','honor-6','honor-6'), T('honor-7','honor-7','honor-7'), '+ melds'],
  four_kongs:           [T('man-1','man-1','man-1','man-1'), T('pin-1','pin-1','pin-1','pin-1'), T('sou-1','sou-1','sou-1','sou-1'), T('honor-1','honor-1','honor-1','honor-1'), '+ pair'],
  full_flush:           [T('man-1','man-2','man-3'), T('man-4','man-4','man-4'), T('man-5','man-6','man-7'), T('man-8','man-9','man-9','man-9')],
  seven_pairs:          [T('man-1','man-1'), T('pin-1','pin-1'), T('sou-1','sou-1'), T('honor-1','honor-1'), T('honor-5','honor-5'), T('honor-6','honor-6'), T('honor-7','honor-7')],
  all_pungs:            [T('man-2','man-2','man-2'), T('pin-5','pin-5','pin-5'), T('sou-7','sou-7','sou-7'), T('honor-1','honor-1','honor-1'), T('honor-2','honor-2')],
  mixed_flush:          [T('man-1','man-2','man-3'), T('man-4','man-4','man-4'), T('man-5','man-6','man-7'), T('honor-1','honor-1','honor-1'), T('honor-2','honor-2')],
  small_three_dragons:  [T('honor-5','honor-5','honor-5'), T('honor-6','honor-6','honor-6'), T('honor-7','honor-7'), '+ melds'],
  small_four_winds:     [T('honor-1','honor-1','honor-1'), T('honor-2','honor-2','honor-2'), T('honor-3','honor-3','honor-3'), T('honor-4','honor-4'), '+ meld'],
  mixed_terminals:      [T('man-1','man-1','man-1'), T('man-9','man-9','man-9'), T('honor-1','honor-1','honor-1'), T('honor-2','honor-2','honor-2'), T('sou-1','sou-1')],
  all_chows:            [T('man-1','man-2','man-3'), T('man-4','man-5','man-6'), T('pin-1','pin-2','pin-3'), T('pin-4','pin-5','pin-6'), T('sou-1','sou-1')],
  concealed_self_draw:  [T('man-1','man-2','man-3'), T('man-4','man-5','man-6'), T('pin-1','pin-1','pin-1'), T('honor-2','honor-2','honor-2'), T('sou-1','sou-1'), '+ self-draw'],
  dragon_pung:          [T('honor-5','honor-5','honor-5'), 'or', T('honor-6','honor-6','honor-6'), 'or', T('honor-7','honor-7','honor-7')],
  seat_wind_pung:       [T('honor-1','honor-1','honor-1'), 'or', T('honor-2','honor-2','honor-2'), 'or', T('honor-3','honor-3','honor-3'), 'or', T('honor-4','honor-4','honor-4')],
  prevailing_wind_pung: [T('honor-1','honor-1','honor-1'), 'or', T('honor-2','honor-2','honor-2'), 'or', T('honor-3','honor-3','honor-3'), 'or', T('honor-4','honor-4','honor-4')],
  flower_bonus:         [T('bonus-1','bonus-2','bonus-3','bonus-4'), T('bonus-5','bonus-6','bonus-7','bonus-8')],
}

const FAN_DESCRIPTIONS: Record<string, string> = {
  thirteen_orphans:     'One of each: 1m 9m 1p 9p 1s 9s East South West North 中 發 白, plus one duplicate.',
  nine_gates:           '1112345678999 all in one number suit, fully concealed.',
  four_concealed_pungs: 'Four concealed pungs (or concealed kongs) plus a pair.',
  all_honors:           'Entire hand of winds and dragons only.',
  all_terminals:        'Entire hand of 1s and 9s only (no honors).',
  big_four_winds:       'Pungs/kongs of all four wind tiles.',
  big_three_dragons:    'Pungs/kongs of all three dragon tiles.',
  four_kongs:           'Declare four kongs in one hand.',
  full_flush:           'All tiles from one number suit (man, pin, or sou). No honor tiles.',
  seven_pairs:          'Seven different pairs. Must be seven distinct tile types.',
  all_pungs:            'All four sets are pungs or kongs.',
  mixed_flush:          'All tiles from one number suit plus honor tiles.',
  small_three_dragons:  'Pungs of two dragons plus a pair of the third dragon.',
  small_four_winds:     'Pungs of three different winds plus a pair of the fourth.',
  mixed_terminals:      'Every meld (and pair) contains a terminal (1 or 9) or honor tile.',
  all_chows:            'All four sets are chows. Pair must not be a dragon or wind.',
  concealed_self_draw:  'Win by self-draw with a fully concealed hand (no exposed melds).',
  self_draw:            'Win by drawing the winning tile from the wall yourself.',
  all_concealed:        'Win on a discard with no exposed melds (concealed hand).',
  dragon_pung:          'A pung or kong of any dragon tile (中 發 白). One fan per pung.',
  seat_wind_pung:       'A pung or kong of the wind matching your current seat position.',
  prevailing_wind_pung: 'A pung or kong of the current round wind (shown in centre).',
  last_tile_draw:       'You self-draw when the wall has run out of tiles.',
  last_tile_claim:      'You win on the final discard after the wall is exhausted.',
  win_on_kong:          'Your winning tile comes from a kong replacement draw.',
  robbing_kong:         "You win by claiming a tile another player adds to their exposed pung.",
  flower_bonus:         '+1 fan per flower or season tile that matches your seat wind.',
  no_bonus:             '+1 fan bonus for winning with no flower or season tiles at all.',
}

// ─── Category groupings ───────────────────────────────────────────────────────

interface Category {
  label: string
  ids: string[]
  defaultOpen: boolean
}

const CATEGORIES: Category[] = [
  {
    label: 'Common Hands',
    ids: ['all_chows', 'self_draw', 'all_concealed', 'dragon_pung', 'seat_wind_pung', 'prevailing_wind_pung', 'concealed_self_draw'],
    defaultOpen: true,
  },
  {
    label: 'High-Value Hands',
    ids: ['full_flush', 'seven_pairs', 'all_pungs', 'mixed_flush', 'small_three_dragons', 'small_four_winds', 'mixed_terminals'],
    defaultOpen: false,
  },
  {
    label: 'Limit Hands (13 fan)',
    ids: ['thirteen_orphans', 'nine_gates', 'four_concealed_pungs', 'all_honors', 'all_terminals', 'big_four_winds', 'big_three_dragons', 'four_kongs'],
    defaultOpen: false,
  },
  {
    label: 'Special Conditions',
    ids: ['last_tile_draw', 'last_tile_claim', 'win_on_kong', 'robbing_kong'],
    defaultOpen: false,
  },
  {
    label: 'Bonus Tiles',
    ids: ['flower_bonus', 'no_bonus'],
    defaultOpen: false,
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface ScoringGuideProps {
  onClose: () => void
}

export function ScoringGuide({ onClose }: ScoringGuideProps) {
  const fanById = Object.fromEntries(FAN_TABLE.map(f => [f.id, f]))

  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const s = new Set<string>()
    CATEGORIES.forEach(c => { if (c.defaultOpen) s.add(c.label) })
    return s
  })

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (label: string) =>
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })

  return (
    <>
      {/* Backdrop — click to close, does not block game input (pointer-events only on backdrop) */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full z-50 w-[min(22rem,92vw)] bg-slate-900/98 border-l border-white/10 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div>
            <div className="text-yellow-400 font-bold text-base leading-tight">Scoring Guide</div>
            <div className="text-gray-500 text-xs">番數參考</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close scoring guide"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2">
          {CATEGORIES.map(cat => {
            const isOpen = openSections.has(cat.label)
            return (
              <div key={cat.label} className="rounded-xl overflow-hidden border border-white/10">
                <button
                  onClick={() => toggle(cat.label)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-200">{cat.label}</span>
                  <span className="text-gray-500 text-xs">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="divide-y divide-white/5">
                    {cat.ids.map(id => {
                      const fan: Fan | undefined = fanById[id]
                      if (!fan) return null
                      const segments = FAN_TILE_EXAMPLES[id]
                      const desc = FAN_DESCRIPTIONS[id]
                      return (
                        <div key={id} className="px-3 py-2.5 bg-slate-800">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <span className="text-white text-sm font-semibold">{fan.nameEn}</span>
                              <span className="text-gray-400 text-xs ml-1.5">{fan.nameZh}</span>
                            </div>
                            <span className={cn(
                              'flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full',
                              fan.isLimit
                                ? 'bg-red-900/60 text-red-300 border border-red-700/50'
                                : fan.fan >= 4
                                  ? 'bg-yellow-900/60 text-yellow-300 border border-yellow-700/50'
                                  : 'bg-slate-700 text-gray-300',
                            )}>
                              {fan.isLimit ? 'Limit' : `${fan.fan} fan`}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs leading-relaxed mb-1.5">{desc}</p>
                          {segments && (
                            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mt-1">
                              {segments.map((seg, si) =>
                                Array.isArray(seg) ? (
                                  <div key={si} className="flex gap-px">
                                    {seg.map((key, ti) => (
                                      <img
                                        key={ti}
                                        src={getTileImage(key)}
                                        className="h-7 w-auto rounded-[2px]"
                                        draggable={false}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <span key={si} className="text-gray-500 text-xs italic px-0.5">{seg}</span>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
