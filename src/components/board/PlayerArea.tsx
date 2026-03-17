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

export function PlayerArea({ player, playerIndex, position }: PlayerAreaProps) {
  const { state, dispatch } = useGameStore()
  const { selectedTileId, setSelectedTileId } = useUIStore()

  const isHuman = playerIndex === state.humanPlayerIndex
  const isTurn = state.round.turnIndex === playerIndex
  const isVertical = position === 'left' || position === 'right'
  const windChar = WIND_CHARS[['east', 'south', 'west', 'north'].indexOf(player.seatWind) + 1]

  const tileRotation =
    position === 'left' ? 'rotate-90' :
    position === 'right' ? '-rotate-90' :
    ''

  return (
    <div
      className={cn(
        'flex gap-1.5',
        position === 'bottom' && 'flex-col items-center',
        position === 'top' && 'flex-col-reverse items-center',
        isVertical && 'flex-col items-center',
      )}
    >
      {/* ── Player badge ── */}
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

      {/* ── Exposed melds ── */}
      {player.melds.length > 0 && (
        <div className={cn(
          'flex gap-0.5 flex-wrap',
          isVertical ? 'flex-col items-center' : 'justify-center'
        )}>
          {player.melds.map((meld, mi) => (
            <div key={mi} className={cn('flex gap-0.5', isVertical && 'flex-col')}>
              {meld.tiles.map((t, ti) => (
                <TileComponent
                  key={t.id}
                  tile={t}
                  faceDown={meld.concealed && meld.type === 'kong' && ti === 0}
                  small={position !== 'bottom'}
                  className={isVertical ? tileRotation : ''}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Bonus tiles ── */}
      {player.bonusTiles.length > 0 && (
        <div className={cn(
          'flex gap-0.5 flex-wrap',
          isVertical ? 'flex-col items-center' : 'justify-center'
        )}>
          {player.bonusTiles.map((t) => (
            <TileComponent
              key={t.id}
              tile={t}
              small={position !== 'bottom'}
              className={isVertical ? tileRotation : ''}
            />
          ))}
        </div>
      )}

      {/* ── Hand tiles ── */}
      {isVertical ? (
        /* Side players: compact overlapping stack */
        <div className="relative flex flex-col -space-y-9 overflow-hidden" style={{ maxHeight: '16rem' }}>
          {player.hand.map((tile) => (
            <TileBack key={tile.id} small className={cn('flex-shrink-0', tileRotation)} />
          ))}
          {player.drawnTile && !player.hand.some(t => t.id === player.drawnTile?.id) && (
            <TileBack small className={cn('flex-shrink-0 mt-2 ring-1 ring-yellow-400/60', tileRotation)} />
          )}
        </div>
      ) : isHuman ? (
        /* Human: face-up, clickable */
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
      ) : (
        /* Top bot: face-down row */
        <div className="flex gap-0.5">
          {player.hand.map((tile) => (
            <TileBack key={tile.id} small />
          ))}
        </div>
      )}
    </div>
  )
}
