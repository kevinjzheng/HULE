import React from 'react'
import { useGameStore } from '../../store/gameStore'
import { useUIStore } from '../../store/uiStore'
import { WIND_CHARS, tileUnicode, tileKey } from '../../constants/tiles'
import { getTileImage } from '../../constants/tileImages'

import { GameLog } from './GameLog'
import { cn } from '../../utils/cn'
import type { Tile } from '../../types'

interface CenterAreaProps {
  topIdx: number
  bottomIdx: number
  leftIdx: number
  rightIdx: number
}

function DiscardTile({ tile, isLast }: { tile: Tile; isLast?: boolean }) {
  const { hoveredTileKey, setHoveredTileKey } = useUIStore()
  const key = tileKey(tile)
  const isHovered = hoveredTileKey === key
  const imgSrc = getTileImage(key)

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded overflow-hidden',
        'select-none flex-shrink-0',
        'w-[2.5rem] h-[3.4rem]',
        isLast && 'ring-2 ring-red-400',
        isHovered && 'ring-2 ring-sky-400 brightness-125',
      )}
      onMouseEnter={() => setHoveredTileKey(key)}
      onMouseLeave={() => setHoveredTileKey(null)}
    >
      {imgSrc ? (
        <img src={imgSrc} alt="" draggable={false} className="w-full h-full object-contain" />
      ) : (
        <span
          className="text-[2.6rem] leading-none"
          style={{ fontFamily: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif' }}
        >
          {tileUnicode(tile)}
        </span>
      )}
    </div>
  )
}

function DiscardZone({
  discards,
  lastDiscardId,
  label,
  className,
}: {
  discards: Tile[]
  lastDiscardId?: string
  label: string
  className?: string
}) {
  const visible = discards.slice(-10)
  const hiddenCount = discards.length - visible.length
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-white/40 text-[10px] text-center tracking-widest truncate">{label}</span>
      {hiddenCount > 0 && (
        <span className="text-white/30 text-[9px] text-center">+{hiddenCount} more</span>
      )}
      <div className="flex flex-wrap gap-0.5 justify-center">
        {visible.map((t, i) => (
          <DiscardTile
            key={t.id}
            tile={t}
            isLast={i === visible.length - 1 && t.id === lastDiscardId}
          />
        ))}
        {discards.length === 0 && (
          <span className="text-white/15 text-xs italic">—</span>
        )}
      </div>
    </div>
  )
}

export function CenterArea({ topIdx, bottomIdx, leftIdx, rightIdx }: CenterAreaProps) {
  const { state } = useGameStore()
  const { round, players } = state

  const windChar = WIND_CHARS[['east', 'south', 'west', 'north'].indexOf(round.prevailingWind) + 1]
  const lastDiscardId = round.lastDiscard?.id

  const ranked = players
    .map((p, i) => ({ ...p, idx: i }))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="flex flex-col h-full min-h-0 gap-1 py-1">

      {/* ── North discards (top zone) ── */}
      <div className="flex-shrink-0 flex justify-center">
        <div className="max-w-[55%] w-full">
          <DiscardZone
            discards={players[topIdx].discards}
            lastDiscardId={lastDiscardId}
            label={players[topIdx].name}
            className="items-center"
          />
        </div>
      </div>

      {/* ── Middle row: West | Info+Score | East ── */}
      <div className="flex flex-1 min-h-0 gap-1 items-center px-1">

        {/* West discards — flex-1, aligned to inner (right) edge so tiles crowd center */}
        <div className="flex-1 min-w-0 flex flex-col items-end pr-2">
          <DiscardZone
            discards={players[leftIdx].discards}
            lastDiscardId={lastDiscardId}
            label={players[leftIdx].name}
            className="items-end"
          />
        </div>

        {/* ── Center panel ── */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 py-1 w-[13rem] self-center">

          {/* Prevailing wind + round */}
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-400 drop-shadow-lg leading-none">
              {windChar}
            </div>
            <div className="text-white/60 text-xs mt-0.5">
              Rd {round.roundNumber + 1}
              {round.dealerConsecutiveWins > 0 && (
                <span className="text-red-300 ml-1">+{round.dealerConsecutiveWins}連</span>
              )}
            </div>
          </div>

          {/* Wall tiles remaining */}
          <div className="flex items-center gap-1.5 bg-black/40 rounded-lg px-3 py-1">
            <span className="text-white/50 text-xs">牌牆</span>
            <span className="text-white text-xl font-bold tabular-nums leading-none">
              {round.wall.length}
            </span>
          </div>

          {/* ── Score Leaderboard — compact ── */}
          <div className="w-full max-w-[12rem] bg-black/50 rounded-lg border border-white/10 overflow-hidden">
            {ranked.map((p, rank) => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-1 px-2 py-1',
                  rank === 0 && 'bg-yellow-400/10',
                  state.round.turnIndex === p.idx && 'bg-white/5',
                )}
              >
                <span className="text-xs leading-none text-white/40 w-3">
                  {rank + 1}.
                </span>
                <span
                  className={cn(
                    'text-xs font-semibold flex-1 truncate',
                    rank === 0 ? 'text-yellow-300' : 'text-white/70',
                  )}
                >
                  {p.name}
                  {p.isDealer && <span className="text-red-400 ml-0.5">莊</span>}
                </span>
                <span
                  className={cn(
                    'text-xs font-bold tabular-nums',
                    rank === 0 ? 'text-yellow-300' : 'text-white/80',
                  )}
                >
                  {p.score}
                </span>
              </div>
            ))}
          </div>

          {/* Inline game log — shown when enabled in house rules */}
          {state.ruleSettings.enableGameLog && (
            <div className="w-full max-w-[12rem]">
              <GameLog />
            </div>
          )}
        </div>

        {/* East discards — flex-1, aligned to inner (left) edge so tiles crowd center */}
        <div className="flex-1 min-w-0 flex flex-col items-start pl-2">
          <DiscardZone
            discards={players[rightIdx].discards}
            lastDiscardId={lastDiscardId}
            label={players[rightIdx].name}
            className="items-start"
          />
        </div>
      </div>

      {/* ── South discards (bottom zone) ── */}
      <div className="flex-shrink-0 flex justify-center">
        <div className="max-w-[55%] w-full">
          <DiscardZone
            discards={players[bottomIdx].discards}
            lastDiscardId={lastDiscardId}
            label={players[bottomIdx].name}
            className="items-center"
          />
        </div>
      </div>

    </div>
  )
}
