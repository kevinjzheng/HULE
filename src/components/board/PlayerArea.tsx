import React from 'react'
import type { Player } from '../../types'
import { TileComponent, TileBack } from '../tiles/TileComponent'
import { useGameStore } from '../../store/gameStore'
import { useUIStore } from '../../store/uiStore'
import { WIND_CHARS } from '../../constants/tiles'
import { cn } from '../../utils/cn'

type Position = 'top' | 'bottom' | 'left' | 'right'

interface PlayerAreaProps {
  player: Player
  playerIndex: number
  position: Position
}

// Sideways tile dimensions: landscape DOM so that after rotate-90 the layout
// height equals the visual tile height (no extra gap between tiles).
// portrait: w-[4.6rem] h-[6.2rem]  ← full-size reference
// sideways: width = portrait H, height = portrait W
//   → after rotate-90: visual 4.6rem wide × 6.2rem tall
//   → flex-col spacing per tile: 4.6rem (DOM height) + gap-1
// We use a slightly smaller value so 13 tiles fit on typical screens (≥900px viewport).
const SIDEWAYS_SIZE      = { width: '5rem',   height: '3.6rem' } as const
const SIDEWAYS_MELD_SIZE = { width: '6.2rem', height: '4.6rem' } as const

export function PlayerArea({ player, playerIndex, position }: PlayerAreaProps) {
  const { state } = useGameStore()
  const { selectedTileId, setSelectedTileId } = useUIStore()

  const isHuman = playerIndex === state.humanPlayerIndex
  const isTurn = state.round.turnIndex === playerIndex
  const isVertical = position === 'left' || position === 'right'
  const windChar = WIND_CHARS[['east', 'south', 'west', 'north'].indexOf(player.seatWind) + 1]

  const tileRotation =
    position === 'left' ? 'rotate-90' :
    position === 'right' ? '-rotate-90' :
    ''

  const badge = (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0',
        isTurn
          ? 'bg-yellow-400 text-yellow-900 shadow-lg'
          : 'bg-black/50 text-white/90 border border-white/10',
        isVertical && 'flex-col gap-0 px-1 py-1',
      )}
    >
      <span className="leading-none">{windChar}</span>
      <span className={cn('truncate', isVertical ? 'max-w-[3.5rem] text-[10px]' : 'max-w-[7rem]')}>
        {player.name}
      </span>
      {player.isDealer && (
        <span className={isTurn ? 'text-red-700' : 'text-red-400'}>莊</span>
      )}
    </div>
  )

  // ── Vertical (left / right) players ──────────────────────────────────────
  if (isVertical) {
    // Hand tiles: sideways landscape DOM + rotate so visual portrait fills correctly.
    // overflow-hidden keeps tiles within the viewport height without a scrollbar.
    const handColumn = (
      <div
        className="flex flex-col gap-1 overflow-hidden flex-shrink-0"
        style={{ maxHeight: 'calc(100vh - 14rem)' }}
      >
        {player.hand.map((tile) => (
          <TileBack
            key={tile.id}
            medium
            className={cn('flex-shrink-0', tileRotation)}
            style={SIDEWAYS_SIZE}
          />
        ))}
        {player.drawnTile && !player.hand.some(t => t.id === player.drawnTile?.id) && (
          <TileBack
            medium
            className={cn('flex-shrink-0 ring-1 ring-yellow-400/60', tileRotation)}
            style={SIDEWAYS_SIZE}
          />
        )}
      </div>
    )

    // Melds + bonus: also sideways, in a column — fixed width prevents layout shift
    // when the first meld/bonus tile appears (avoids center area reflow on flower draw).
    const meldColumn = (
      <div
        className="flex flex-col gap-2 items-center flex-shrink-0"
        style={{ width: SIDEWAYS_MELD_SIZE.height }}
      >
        {player.melds.map((meld, mi) => (
          <div key={mi} className="flex flex-col gap-1">
            {meld.tiles.map((t, ti) => (
              <TileComponent
                key={t.id}
                tile={t}
                faceDown={meld.concealed && meld.type === 'kong' && ti === 0}
                className={tileRotation}
                style={SIDEWAYS_MELD_SIZE}
              />
            ))}
          </div>
        ))}
        {player.bonusTiles.map((t) => (
          <TileComponent
            key={t.id}
            tile={t}
            className={tileRotation}
            style={SIDEWAYS_MELD_SIZE}
          />
        ))}
      </div>
    )

    // left player:  [hand outer] [meld inner→center] — flex-row [hand, meld]
    // right player: [meld inner←center] [hand outer] — flex-row-reverse [hand, meld]
    return (
      <div className="flex flex-col items-center gap-1.5">
        {badge}
        <div className={cn(
          'flex items-start gap-2',
          position === 'right' && 'flex-row-reverse',
        )}>
          {handColumn}
          {meldColumn}
        </div>
      </div>
    )
  }

  // ── Top / Bottom players ──────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'flex gap-1.5',
        position === 'bottom' && 'flex-col items-center',
        position === 'top' && 'flex-col-reverse items-center',
      )}
    >
      {badge}

      {/* ── Exposed melds ── */}
      {player.melds.length > 0 && (
        <div className="flex gap-0.5 flex-wrap justify-center px-2 py-1 rounded bg-black/20 border border-white/10">
          {player.melds.map((meld, mi) => (
            <div key={mi} className="flex gap-0.5">
              {meld.tiles.map((t, ti) => (
                <TileComponent
                  key={t.id}
                  tile={t}
                  faceDown={meld.concealed && meld.type === 'kong' && ti === 0}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Bonus tiles ── */}
      {player.bonusTiles.length > 0 && (
        <div className="flex gap-0.5 flex-wrap justify-center">
          {player.bonusTiles.map((t) => (
            <TileComponent key={t.id} tile={t} />
          ))}
        </div>
      )}

      {/* ── Hand tiles ── */}
      {!isHuman ? (
        <div className="flex gap-0.5 flex-wrap justify-center">
          {player.hand.map((tile) => (
            <TileBack key={tile.id} medium />
          ))}
        </div>
      ) : (
        <div className="flex gap-1 flex-wrap justify-center">
          {player.hand.map((tile) => (
            <TileComponent
              key={tile.id}
              tile={tile}
              selected={selectedTileId === tile.id}
              highlight={tile.id === player.drawnTile?.id}
              onClick={() => {
                if (state.phase !== 'awaiting_discard') return
                setSelectedTileId(selectedTileId === tile.id ? null : tile.id)
              }}
            />
          ))}
          {player.drawnTile &&
            !player.hand.some(t => t.id === player.drawnTile?.id) && (
              <>
                <div className="w-3 flex-shrink-0" />
                <TileComponent
                  tile={player.drawnTile}
                  highlight
                  selected={selectedTileId === player.drawnTile.id}
                  onClick={() => {
                    if (state.phase !== 'awaiting_discard') return
                    setSelectedTileId(
                      selectedTileId === player.drawnTile!.id ? null : player.drawnTile!.id
                    )
                  }}
                />
              </>
            )}
        </div>
      )}
    </div>
  )
}
