import React from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'
import { useGameStore } from '../../store/gameStore'

export function WinAnimation() {
  const { winnerIndex } = useUIStore()
  const { state } = useGameStore()

  if (winnerIndex === null) return null
  const winner = state.players[winnerIndex]

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
      {/* Radial burst */}
      <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 4, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute w-32 h-32 rounded-full bg-yellow-400"
      />
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="relative z-50 text-center"
      >
        <div className="text-6xl font-bold text-yellow-300 drop-shadow-[0_0_20px_rgba(255,200,0,0.8)]">
          胡了!
        </div>
        <div className="text-2xl text-white mt-2 font-semibold drop-shadow">{winner.name}</div>
      </motion.div>
    </div>
  )
}
