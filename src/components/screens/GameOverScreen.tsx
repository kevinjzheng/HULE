import React from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'

export function GameOverScreen() {
  const { state, dispatch, initGame } = useGameStore()
  const { players, mode } = state

  const sorted = [...players].sort((a, b) => b.score - a.score)
  const winner = sorted[0]

  const handleRestart = () => {
    initGame(players.map(p => p.name), mode)
  }

  return (
    <div className="min-h-screen bg-table-felt flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800/90 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-600"
      >
        <h2 className="text-3xl font-bold text-center text-yellow-400 mb-2">Game Over!</h2>
        <p className="text-center text-gray-400 mb-6">
          🏆 {winner.name} wins!
        </p>

        <div className="space-y-2 mb-6">
          {sorted.map((p, rank) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                rank === 0 ? 'bg-yellow-400/20 border border-yellow-400/50' : 'bg-slate-700/50'
              }`}
            >
              <span className="text-2xl">{['🥇', '🥈', '🥉', '4️⃣'][rank]}</span>
              <div className="flex-1">
                <div className="text-white font-semibold">{p.name}</div>
                <div className="text-gray-400 text-xs">{p.type}</div>
              </div>
              <div className={`text-xl font-bold ${rank === 0 ? 'text-yellow-400' : 'text-white'}`}>
                {p.score}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-gray-500 text-sm mb-6">
          {state.roundHistory.length} rounds played
        </div>

        <button
          onClick={handleRestart}
          className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-yellow-900 font-bold rounded-2xl text-xl transition-all active:scale-95"
        >
          Play Again
        </button>
      </motion.div>
    </div>
  )
}
