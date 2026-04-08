import React, { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useUIStore } from '../../store/uiStore'
import { PlayerArea } from './PlayerArea'
import { CenterArea } from './CenterArea'
import { ScoreModal } from '../scoring/ScoreModal'
import { WinningHandDisplay } from '../scoring/WinningHandDisplay'
import { ActionBar } from '../actions/ActionBar'
import { WinAnimation } from '../animation/WinAnimation'
import { ScoringGuide } from './ScoringGuide'

export function GameBoard() {
  const { state, dispatch, networkMode } = useGameStore()
  const { showScoreModal, showWinAnimation, showWinningHand, showScoringGuide, setShowScoringGuide } = useUIStore()
  const { players, humanPlayerIndex } = state
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const isBeginner = state.ruleSettings.comfortLevel === 'beginner'

  const activePhases = ['playing', 'bot_turn', 'awaiting_action', 'awaiting_discard']
  const showEndGame = !networkMode && activePhases.includes(state.phase)

  // Seat layout from human's perspective:
  // bottom = self, right = next counter-clockwise, top = opposite, left = previous
  const bottomIdx = humanPlayerIndex
  const rightIdx  = (humanPlayerIndex + 1) % 4
  const topIdx    = (humanPlayerIndex + 2) % 4
  const leftIdx   = (humanPlayerIndex + 3) % 4

  return (
    <div className="relative w-full h-screen bg-table-felt flex flex-col select-none overflow-hidden px-2 sm:px-3">

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

      {/* Scoring Guide button — always visible during active play */}
      <button
        onClick={() => setShowScoringGuide(true)}
        className={`absolute top-2 left-3 transition-all z-10 ${
          isBeginner
            ? 'px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-400/50 rounded-lg text-yellow-300 text-sm font-semibold shadow-[0_0_8px_rgba(251,191,36,0.3)] animate-pulse'
            : 'w-7 h-7 flex items-center justify-center bg-black/30 hover:bg-black/50 border border-white/10 rounded text-white/40 hover:text-white/70 text-sm font-bold'
        }`}
        aria-label="Scoring guide"
      >
        {isBeginner ? '? Scoring Guide' : '?'}
      </button>

      {/* End Game Early button — single player only */}
      {showEndGame && (
        <button
          className="absolute top-2 right-3 text-xs text-white/40 hover:text-white/70 bg-black/30 hover:bg-black/50 border border-white/10 rounded px-2 py-1 transition-colors"
          onClick={() => setShowEndConfirm(true)}
        >
          End Game
        </button>
      )}

      {/* End Game confirmation overlay */}
      {showEndConfirm && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-xl px-6 py-5 flex flex-col items-center gap-4 shadow-2xl">
            <p className="text-white text-sm text-center">
              End game early?<br />
              <span className="text-white/50 text-xs">Your current score will be recorded.</span>
            </p>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-colors"
                onClick={() => { dispatch({ type: 'END_GAME' }); setShowEndConfirm(false) }}
              >
                End Game
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
                onClick={() => setShowEndConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlays */}
      {showWinningHand && <WinningHandDisplay />}
      {showScoreModal && <ScoreModal />}
      {showWinAnimation && <WinAnimation />}
      {showScoringGuide && <ScoringGuide onClose={() => setShowScoringGuide(false)} />}
    </div>
  )
}
