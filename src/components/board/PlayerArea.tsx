import { useMemo, useEffect, useState } from 'react'
import type { Player, PendingClaim, Tile } from '../../types'
import { TileComponent, TileBack } from '../tiles/TileComponent'
import { useGameStore } from '../../store/gameStore'
import { useUIStore } from '../../store/uiStore'
import { WIND_CHARS, tilesEqual } from '../../constants/tiles'
import { cn } from '../../utils/cn'

type Position = 'top' | 'bottom' | 'left' | 'right'

interface PlayerAreaProps {
  player: Player
  playerIndex: number
  position: Position
}

// Responsive sideways tile dimensions for left/right players.
// After rotate-90, DOM width becomes visual height and vice versa.
function useSidewaysSize() {
  const [dims, setDims] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const { w, h } = dims
  // Tablet landscape: lg-width device but limited vertical space (e.g. iPad landscape)
  const isTabletLand = w >= 1024 && w <= 1180 && h <= 900
  if (w < 768) return {
    tile: { width: '3.2rem', height: '2.4rem' } as const,
    meld: { width: '4.4rem', height: '3.2rem' } as const,
  }
  if (w < 1024 || isTabletLand) return {
    tile: { width: '4.2rem', height: '3rem' } as const,
    meld: { width: '5.2rem', height: '3.8rem' } as const,
  }
  return {
    tile: { width: '5rem',   height: '3.6rem' } as const,
    meld: { width: '6.2rem', height: '4.6rem' } as const,
  }
}

function computeClaimHighlights(
  hand: Tile[],
  pendingClaim: PendingClaim,
  lastDiscard: Tile | null,
): Set<string> {
  const result = new Set<string>()
  if (!lastDiscard) return result
  if (pendingClaim.canWin) {
    for (const t of hand) result.add(t.id)
    return result
  }
  if (pendingClaim.canKong) {
    for (const t of hand) {
      if (tilesEqual(t, lastDiscard)) result.add(t.id)
    }
  } else if (pendingClaim.canPung) {
    let found = 0
    for (const t of hand) {
      if (tilesEqual(t, lastDiscard) && found < 2) { result.add(t.id); found++ }
    }
  }
  for (const chowOpt of pendingClaim.canChow) {
    for (const t of chowOpt) result.add(t.id)
  }
  return result
}

export function PlayerArea({ player, playerIndex, position }: PlayerAreaProps) {
  const { state } = useGameStore()
  const { selectedTileId, setSelectedTileId } = useUIStore()
  const sideways = useSidewaysSize()

  const isHuman = playerIndex === state.humanPlayerIndex
  const isTurn = state.round.turnIndex === playerIndex
  const isVertical = position === 'left' || position === 'right'
  const windChar = WIND_CHARS[['east', 'south', 'west', 'north'].indexOf(player.seatWind) + 1]

  const isBeginner = state.ruleSettings.comfortLevel === 'beginner'
  const pendingClaim = state.round.pendingClaims[playerIndex]

  const eligibleTileIds = useMemo<Set<string>>(() => {
    if (!isBeginner || !isHuman) return new Set()
    if (state.phase === 'awaiting_action' && pendingClaim) {
      return computeClaimHighlights(player.hand, pendingClaim, state.round.lastDiscard)
    }
    return new Set()
  }, [
    isBeginner, isHuman, state.phase,
    player.hand, pendingClaim, state.round.lastDiscard,
  ])

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
            style={sideways.tile}
          />
        ))}
        {player.drawnTile && !player.hand.some(t => t.id === player.drawnTile?.id) && (
          <TileBack
            medium
            className={cn('flex-shrink-0 ring-1 ring-yellow-400/60', tileRotation)}
            style={sideways.tile}
          />
        )}
      </div>
    )

    // Melds + bonus: also sideways, in a column — fixed width prevents layout shift
    // when the first meld/bonus tile appears (avoids center area reflow on flower draw).
    const meldColumn = (
      <div
        className="flex flex-col gap-2 items-center flex-shrink-0"
        style={{ width: sideways.meld.height }}
      >
        {player.melds.map((meld, mi) => (
          <div key={mi} className="flex flex-col gap-1">
            {meld.tiles.map((t, ti) => (
              <TileComponent
                key={t.id}
                tile={t}
                faceDown={meld.concealed && meld.type === 'kong' && ti === 0}
                className={tileRotation}
                style={sideways.meld}
              />
            ))}
          </div>
        ))}
        {player.bonusTiles.map((t) => (
          <TileComponent
            key={t.id}
            tile={t}
            className={tileRotation}
            style={sideways.meld}
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
              eligible={!selectedTileId && eligibleTileIds.has(tile.id) && tile.id !== player.drawnTile?.id}
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
                  eligible={!selectedTileId && eligibleTileIds.has(player.drawnTile.id)}
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
