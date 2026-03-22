import React, { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useUIStore } from '../../store/uiStore'
import { isValidWin, checkWinMeetsFan } from '../../rulesets/hongkong'
import { getClosedKongOptions, getExtendKongOptions } from '../../rulesets/hongkong/winConditions'
import { cn } from '../../utils/cn'
import { TileComponent } from '../tiles/TileComponent'
import type { Tile } from '../../types'
import { playDiscard, playWin, playKong, sayChow, sayPung, sayKong, sayWin, sayZimo } from '../../utils/sounds'
import { TurnTimer } from '../board/TurnTimer'
import { ClaimTimer } from '../board/ClaimTimer'

export function ActionBar() {
  const { state, dispatch } = useGameStore()
  const { selectedTileId, setSelectedTileId, setShowWinAnimation, setWinnerIndex } = useUIStore()
  const [showChowOptions, setShowChowOptions] = useState(false)

  const { phase, players, round, humanPlayerIndex, ruleSettings } = state
  const human = players[humanPlayerIndex]
  const pendingClaim = round.pendingClaims[humanPlayerIndex]

  const selectedTile = human.hand.find(t => t.id === selectedTileId)
    ?? (human.drawnTile?.id === selectedTileId ? human.drawnTile : null)

  // ── DISCARD phase: show discard button when a tile is selected ──
  if (phase === 'awaiting_discard') {
    const closedKongOpts = getClosedKongOptions(human.hand)
    const extendOpts = human.drawnTile
      ? getExtendKongOptions(human.hand, human.melds, human.drawnTile)
      : []

    const canWin = (() => {
      if (!human.drawnTile) return false
      const handWithoutDraw = human.hand.filter(t => t.id !== human.drawnTile!.id)
      if (!isValidWin(handWithoutDraw, human.melds, human.drawnTile)) return false
      return checkWinMeetsFan(
        handWithoutDraw, human.melds, human.drawnTile, true, human,
        round.prevailingWind, round.wall.length === 0,
        humanPlayerIndex, null, players, ruleSettings
      )
    })()

    return (
      <>
        <TurnTimer
          onExpire={() => {
            const tileToDiscard = selectedTile ?? human.drawnTile ?? human.hand[0]
            if (!tileToDiscard) return
            playDiscard()
            dispatch({ type: 'DISCARD_TILE', playerIndex: humanPlayerIndex, tile: tileToDiscard })
            setSelectedTileId(null)
          }}
        />
        <div className="flex flex-wrap gap-2 justify-center">
          {canWin && (
            <ActionButton
              label="自摸 WIN"
              color="bg-yellow-500 hover:bg-yellow-400 animate-pulse"
              onClick={() => {
                playWin()
                sayZimo()
                setWinnerIndex(humanPlayerIndex)
                setShowWinAnimation(true)
                dispatch({ type: 'DECLARE_WIN', playerIndex: humanPlayerIndex })
              }}
            />
          )}
          {closedKongOpts.map((tiles, i) => (
            <ActionButton
              key={i}
              label={`Kong 暗槓`}
              color="bg-purple-600 hover:bg-purple-500"
              onClick={() => {
                playKong()
                dispatch({ type: 'DECLARE_CLOSED_KONG', playerIndex: humanPlayerIndex, tile: tiles[0] })
                setSelectedTileId(null)
              }}
            />
          ))}
          {extendOpts.map((meld, i) => (
            <ActionButton
              key={i}
              label={`Extend Kong 加槓`}
              color="bg-purple-600 hover:bg-purple-500"
              onClick={() => {
                playKong()
                dispatch({ type: 'EXTEND_KONG', playerIndex: humanPlayerIndex, tile: human.drawnTile! })
                setSelectedTileId(null)
              }}
            />
          ))}
          {selectedTile ? (
            <ActionButton
              label={`Discard 出牌`}
              color="bg-red-600 hover:bg-red-500"
              onClick={() => {
                playDiscard()
                dispatch({ type: 'DISCARD_TILE', playerIndex: humanPlayerIndex, tile: selectedTile })
                setSelectedTileId(null)
              }}
            />
          ) : (
            <div className="text-white/60 text-sm italic py-2">Click a tile to discard</div>
          )}
        </div>
      </>
    )
  }

  // ── CLAIM phase: show claim options ──
  if (phase === 'awaiting_action' && pendingClaim) {
    const { lastDiscard, lastDiscardBy } = round
    if (!lastDiscard) return null

    const chowOpts = pendingClaim.canChow

    const handleWin = () => {
      playWin()
      sayWin()
      setWinnerIndex(humanPlayerIndex)
      setShowWinAnimation(true)

      if (ruleSettings.multipleWinners) {
        // Include all other players who also have canWin
        const otherWinners = players
          .map((_, i) => i)
          .filter(i => i !== humanPlayerIndex && round.pendingClaims[i]?.canWin)
        const winners = [humanPlayerIndex, ...otherWinners]
        dispatch({ type: 'DECLARE_WIN', winners })
      } else {
        dispatch({ type: 'DECLARE_WIN', playerIndex: humanPlayerIndex })
      }
    }

    return (
      <div className="flex flex-wrap gap-2 justify-center items-center">
        <ClaimTimer
          onExpire={() => {
            dispatch({ type: 'SKIP_CLAIM', playerIndex: humanPlayerIndex })
            setShowChowOptions(false)
          }}
        />
        {pendingClaim.canWin && (
          <ActionButton
            label="胡 WIN"
            color="bg-yellow-500 hover:bg-yellow-400 animate-pulse"
            onClick={handleWin}
          />
        )}
        {pendingClaim.canKong && (
          <ActionButton
            label="Kong 槓"
            color="bg-purple-600 hover:bg-purple-500"
            onClick={() => {
              playKong()
              sayKong()
              dispatch({ type: 'CLAIM_KONG', playerIndex: humanPlayerIndex })
            }}
          />
        )}
        {pendingClaim.canPung && (
          <ActionButton
            label="Pung 碰"
            color="bg-blue-600 hover:bg-blue-500"
            onClick={() => {
              sayPung()
              dispatch({ type: 'CLAIM_PUNG', playerIndex: humanPlayerIndex })
            }}
          />
        )}
        {chowOpts.length > 0 && !showChowOptions && (
          <ActionButton
            label="Chow 吃"
            color="bg-green-600 hover:bg-green-500"
            onClick={() => setShowChowOptions(true)}
          />
        )}
        {showChowOptions && chowOpts.map((opt, i) => (
          <button
            key={i}
            className="flex gap-0.5 items-center bg-green-700 hover:bg-green-600 rounded px-2 py-1"
            onClick={() => {
              sayChow()
              dispatch({
                type: 'CLAIM_CHOW',
                playerIndex: humanPlayerIndex,
                chowTiles: opt as [Tile, Tile],
              })
              setShowChowOptions(false)
            }}
          >
            {opt.map(t => (
              <TileComponent key={t.id} tile={t} small />
            ))}
            <span className="text-white text-xs ml-1">+ discard</span>
          </button>
        ))}
        <ActionButton
          label="Skip ⏭"
          color="bg-gray-600 hover:bg-gray-500"
          onClick={() => {
            dispatch({ type: 'SKIP_CLAIM', playerIndex: humanPlayerIndex })
            setShowChowOptions(false)
          }}
        />
      </div>
    )
  }

  return null
}

function ActionButton({
  label,
  color,
  onClick,
}: {
  label: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-lg text-white font-bold text-sm shadow-lg',
        'transition-all duration-150 active:scale-95',
        color
      )}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
