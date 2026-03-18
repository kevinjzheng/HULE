import React from 'react'
import { useGameStore } from '../../store/gameStore'
import { useUIStore } from '../../store/uiStore'
import { PlayerArea } from './PlayerArea'
import { CenterArea } from './CenterArea'
import { ScoreModal } from '../scoring/ScoreModal'
import { WinningHandDisplay } from '../scoring/WinningHandDisplay'
import { ActionBar } from '../actions/ActionBar'
import { WinAnimation } from '../animation/WinAnimation'

export function GameBoard() {
  const { state } = useGameStore()
  const { showScoreModal, showWinAnimation, showWinningHand } = useUIStore()
  const { players, humanPlayerIndex } = state

  // Seat layout from human's perspective:
  // bottom = self, right = next counter-clockwise, top = opposite, left = previous
  const bottomIdx = humanPlayerIndex
  const rightIdx  = (humanPlayerIndex + 1) % 4
  const topIdx    = (humanPlayerIndex + 2) % 4
  const leftIdx   = (humanPlayerIndex + 3) % 4

  return (
    <div className="w-full h-screen bg-table-felt flex flex-col select-none overflow-hidden px-2 sm:px-3">

      {/* ── Top player ──────────────────────────────────────────────────── */}
      <div className="flex justify-center pt-2 flex-shrink-0">
        <PlayerArea player={players[topIdx]} playerIndex={topIdx} position="top" />
      </div>

      {/* ── Middle row ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 items-stretch px-2 gap-5">

        {/* Left player */}
        <div className="flex items-center flex-shrink-0">
          <PlayerArea player={players[leftIdx]} playerIndex={leftIdx} position="left" />
        </div>

        {/* Center — discard pools + score + wind info */}
        <div className="flex-1 min-w-0">
          <CenterArea
            topIdx={topIdx}
            bottomIdx={bottomIdx}
            leftIdx={leftIdx}
            rightIdx={rightIdx}
          />
        </div>

        {/* Right player */}
        <div className="flex items-center flex-shrink-0">
          <PlayerArea player={players[rightIdx]} playerIndex={rightIdx} position="right" />
        </div>
      </div>

      {/* ── Bottom: human player + action bar ───────────────────────────── */}
      <div className="flex-shrink-0 flex flex-col items-center pb-3 gap-2 px-2">
        <PlayerArea player={players[bottomIdx]} playerIndex={bottomIdx} position="bottom" />
        <ActionBar />
      </div>

      {/* Overlays */}
      {showWinningHand && <WinningHandDisplay />}
      {showScoreModal && <ScoreModal />}
      {showWinAnimation && <WinAnimation />}
    </div>
  )
}
