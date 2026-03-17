import React from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { useUIStore } from '../../store/uiStore'
import { cn } from '../../utils/cn'

export function ScoreModal() {
  const { state, dispatch } = useGameStore()
  const { setShowScoreModal, setShowWinAnimation } = useUIStore()

  const lastResult = state.roundHistory[state.roundHistory.length - 1]
  if (!lastResult) return null

  const { fanBreakdown, winner, loser, isDraw } = lastResult
  const winnerPlayer = winner !== null ? state.players[winner] : null

  const handleNext = () => {
    setShowScoreModal(false)
    setShowWinAnimation(false)
    dispatch({ type: 'NEXT_ROUND' })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-600"
      >
        {isDraw ? (
          <h2 className="text-2xl font-bold text-center text-gray-300 mb-4">Draw 荒牌</h2>
        ) : (
          <h2 className="text-2xl font-bold text-center text-yellow-400 mb-1">
            胡了! {
              lastResult.multiWinners && lastResult.multiWinners.length > 1
                ? lastResult.multiWinners.map(i => state.players[i].name).join(' & ')
                : winnerPlayer?.name
            } Win{lastResult.multiWinners && lastResult.multiWinners.length > 1 ? 's' : ''}!
          </h2>
        )}

        {fanBreakdown && !isDraw && (
          <>
            <div className="text-center text-sm text-gray-400 mb-4">
              {loser !== null ? `${state.players[loser].name} pays` : 'Self-draw (自摸)'}
            </div>

            <div className="space-y-1 mb-4">
              {fanBreakdown.fans.map((fan, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-white">{fan.nameEn} <span className="text-gray-400">({fan.nameZh})</span></span>
                  <span className={cn('font-bold', fan.isLimit ? 'text-yellow-400' : 'text-green-400')}>
                    {fan.isLimit ? 'LIMIT' : `+${fan.fan} fan`}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-600 pt-3 mb-4">
              <div className="flex justify-between font-bold">
                <span className="text-white">Total Fan</span>
                <span className="text-green-400">{fanBreakdown.totalFan} fan</span>
              </div>
              <div className="flex justify-between font-bold text-lg mt-1">
                <span className="text-white">Base Points</span>
                <span className="text-yellow-400">{fanBreakdown.basePoints} pts</span>
              </div>
            </div>

            {/* Score changes */}
            <div className="space-y-1 mb-4">
              {state.players.map((p, i) => {
                const delta = fanBreakdown.payments[i]
                return (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-300">{p.name}</span>
                    <span className={cn('font-bold', delta >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {delta >= 0 ? '+' : ''}{delta}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Running scores */}
        <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
          <div className="text-xs text-gray-400 mb-2 font-semibold">SCORES</div>
          {state.players.map((p) => (
            <div key={p.id} className="flex justify-between text-sm">
              <span className="text-white">{p.name}</span>
              <span className="text-yellow-300 font-bold">{p.score}</span>
            </div>
          ))}
        </div>

        <button
          className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-bold rounded-xl text-lg transition-colors"
          onClick={handleNext}
        >
          Next Round →
        </button>
      </motion.div>
    </div>
  )
}
