import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import type { Tile } from '../../types'
import { tileUnicode, tileChinese, tileEnglish, SUIT_COLORS, tileKey } from '../../constants/tiles'
import { cn } from '../../utils/cn'
import { useUIStore } from '../../store/uiStore'

interface TileComponentProps {
  tile: Tile
  faceDown?: boolean
  selected?: boolean
  highlight?: boolean
  /** small = melds/discard pools; default = hand tiles */
  small?: boolean
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

export function TileComponent({
  tile,
  faceDown = false,
  selected = false,
  highlight = false,
  small = false,
  onClick,
  className,
  style,
}: TileComponentProps) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const divRef = useRef<HTMLDivElement>(null)
  const { hoveredTileKey, setHoveredTileKey } = useUIStore()

  if (faceDown) return <TileBack small={small} className={className} style={style} />

  const color = SUIT_COLORS[tile.suit] ?? '#333'
  const unicode = tileUnicode(tile)
  const chinese = tileChinese(tile)
  const english = tileEnglish(tile)
  const isBonus = tile.suit === 'bonus'
  const key = tileKey(tile)
  const isCrossHighlighted = hoveredTileKey === key && !highlight && !selected

  const handleMouseEnter = () => {
    setHoveredTileKey(key)
    if (small) return
    const rect = divRef.current?.getBoundingClientRect()
    if (rect) {
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 6 })
    }
  }

  const handleMouseLeave = () => {
    setHoveredTileKey(null)
    setTooltipPos(null)
  }

  return (
    <div
      ref={divRef}
      className={cn(
        'relative inline-flex flex-col items-center justify-center rounded-md',
        'border-2 shadow-tile select-none font-mahjong',
        'transition-all duration-150 ease-out',
        small
          ? 'w-10 h-14 border'
          : 'w-[4.6rem] h-[6.2rem]',
        highlight
          ? 'border-emerald-400'
          : selected
            ? 'border-yellow-400'
            : isCrossHighlighted
              ? 'border-sky-400'
              : 'border-tile-border',
        isBonus ? 'bg-amber-50' : 'bg-tile-bg',
        onClick && 'cursor-pointer hover:-translate-y-2 hover:shadow-tile-hover',
        selected && '-translate-y-5 shadow-tile-hover ring-2 ring-yellow-300',
        highlight && 'ring-1 ring-emerald-300',
        isCrossHighlighted && 'ring-2 ring-sky-400 brightness-110',
        className,
      )}
      style={style}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className={cn('leading-none', small ? 'text-[1.9rem]' : 'text-[3.6rem]')}
        style={{ fontFamily: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif' }}
      >
        {unicode}
      </span>

      {!small && (
        <span
          className="text-[11px] leading-none mt-0.5 font-semibold"
          style={{ color, opacity: 0.65 }}
        >
          {chinese}
        </span>
      )}

      {/* Portal tooltip — uses fixed position to escape overflow-hidden ancestors */}
      {tooltipPos && ReactDOM.createPortal(
        <div
          className="fixed z-[9999] px-2.5 py-1 rounded-lg bg-slate-900/95 text-white text-xs whitespace-nowrap pointer-events-none shadow-xl border border-slate-600 -translate-x-1/2 -translate-y-full"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          {english}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>,
        document.body
      )}
    </div>
  )
}

export function TileBack({
  small = false,
  className,
  style,
}: {
  small?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-md',
        'bg-gradient-to-br from-slate-500 to-slate-700',
        'border-2 border-slate-400 shadow-tile select-none',
        small ? 'w-10 h-14 border' : 'w-[4.6rem] h-[6.2rem]',
        className,
      )}
      style={style}
    >
      {/* Classic cross-hatch tile back pattern */}
      <div className={cn(
        'border-2 border-slate-300/25 rounded-sm grid grid-cols-2 gap-0.5 p-0.5',
        small ? 'w-6 h-8' : 'w-9 h-12',
      )}>
        <div className="bg-slate-300/20 rounded-sm" />
        <div className="bg-slate-300/20 rounded-sm" />
        <div className="bg-slate-300/20 rounded-sm" />
        <div className="bg-slate-300/20 rounded-sm" />
      </div>
    </div>
  )
}
