import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import type { Tile } from '../../types'
import { tileChinese, tileEnglish, tileKey } from '../../constants/tiles'
import { getTileImage, TILE_BACK_IMAGE } from '../../constants/tileImages'
import { cn } from '../../utils/cn'
import { useUIStore } from '../../store/uiStore'

interface TileComponentProps {
  tile: Tile
  faceDown?: boolean
  selected?: boolean
  highlight?: boolean
  eligible?: boolean
  small?: boolean
  medium?: boolean
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

export function TileComponent({
  tile,
  faceDown = false,
  selected = false,
  highlight = false,
  eligible = false,
  small = false,
  medium = false,
  onClick,
  className,
  style,
}: TileComponentProps) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const divRef = useRef<HTMLDivElement>(null)
  const { hoveredTileKey, setHoveredTileKey } = useUIStore()

  if (faceDown) return <TileBack small={small} medium={medium} className={className} style={style} />

  const english = tileEnglish(tile)
  const key = tileKey(tile)
  const imgSrc = getTileImage(key)
  const isCrossHighlighted = hoveredTileKey === key && !highlight && !selected

  const sizeClass = small
    ? 'w-10 h-14'
    : medium
      ? 'w-[3.2rem] h-[4.4rem]'
      : 'w-8 h-11 md:w-[3.2rem] md:h-[4.4rem] tablet-land:w-[3.8rem] tablet-land:h-[5.2rem] lg:w-[4.6rem] lg:h-[6.2rem]'

  const handleMouseEnter = () => {
    setHoveredTileKey(key)
    if (small || medium) return
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
        'relative inline-flex items-center justify-center rounded-md select-none',
        'transition-all duration-150 ease-out overflow-hidden',
        sizeClass,
        highlight
          ? 'ring-2 ring-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
          : selected
            ? 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
            : eligible
              ? 'ring-2 ring-amber-300 shadow-[0_0_12px_3px_rgba(251,191,36,0.7)] brightness-110 animate-eligible-pulse'
              : isCrossHighlighted
                ? 'ring-2 ring-sky-400 brightness-110'
                : '',
        onClick && 'cursor-pointer hover:-translate-y-2',
        selected && '-translate-y-5',
        className,
      )}
      style={style}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={english}
          draggable={false}
          className="w-full h-full object-contain"
        />
      ) : (
        /* Fallback: plain ivory tile with Chinese label */
        <div className="w-full h-full bg-amber-50 border border-amber-200 flex items-center justify-center rounded-md">
          <span className={cn('font-semibold text-center leading-tight px-0.5',
            small ? 'text-[9px]' : 'text-xs'
          )}>
            {tileChinese(tile)}
          </span>
        </div>
      )}

      {/* Portal tooltip */}
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
  medium = false,
  className,
  style,
}: {
  small?: boolean
  medium?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const sizeClass = small
    ? 'w-10 h-14'
    : medium
      ? 'w-[3.2rem] h-[4.4rem]'
      : 'w-8 h-11 md:w-[3.2rem] md:h-[4.4rem] tablet-land:w-[3.8rem] tablet-land:h-[5.2rem] lg:w-[4.6rem] lg:h-[6.2rem]'

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-md select-none overflow-hidden',
        sizeClass,
        className,
      )}
      style={style}
    >
      {TILE_BACK_IMAGE ? (
        <img
          src={TILE_BACK_IMAGE}
          alt="tile back"
          draggable={false}
          className="w-full h-full object-contain"
        />
      ) : (
        /* Fallback crosshatch pattern */
        <div className="w-full h-full bg-gradient-to-br from-slate-500 to-slate-700 border-2 border-slate-400 rounded-md flex items-center justify-center">
          <div className="border border-slate-300/25 rounded-sm grid grid-cols-2 gap-0.5 p-0.5 w-6 h-8">
            <div className="bg-slate-300/20 rounded-sm" />
            <div className="bg-slate-300/20 rounded-sm" />
            <div className="bg-slate-300/20 rounded-sm" />
            <div className="bg-slate-300/20 rounded-sm" />
          </div>
        </div>
      )}
    </div>
  )
}
