import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { useGameSocket } from '../../hooks/useGameSocket'

const SEAT_LABELS = ['East 東', 'South 南', 'West 西', 'North 北']

export function LobbyScreen() {
  const { state, networkSeatIndex, roomId } = useGameStore()
  const { startGame, disconnect } = useGameSocket()
  const [copied, setCopied] = useState(false)

  const isHost = networkSeatIndex === 0

  const copyCode = () => {
    if (!roomId) return
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-table-felt flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/90 backdrop-blur rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-600"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-400">Waiting Room 等待室</h2>
          <p className="text-gray-400 text-sm mt-1">Share the room code with friends</p>
        </div>

        {/* Room code */}
        <div className="mb-6">
          <div className="text-gray-300 text-xs font-semibold mb-2 uppercase tracking-wide">Room Code 房間代碼</div>
          <button
            onClick={copyCode}
            className="w-full flex items-center justify-between bg-slate-700 hover:bg-slate-600 rounded-xl px-4 py-3 border border-slate-500 transition-colors"
          >
            <span className="text-2xl font-mono font-bold tracking-widest text-yellow-300">
              {roomId ?? '------'}
            </span>
            <span className="text-gray-400 text-sm">
              {copied ? '✓ Copied!' : 'Copy'}
            </span>
          </button>
        </div>

        {/* Player slots */}
        <div className="mb-6 space-y-2">
          <div className="text-gray-300 text-xs font-semibold mb-2 uppercase tracking-wide">Players 玩家</div>
          {state.players.map((player, i) => {
            const isMe = i === networkSeatIndex
            const isConnected = player.type === 'human'
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                  isMe
                    ? 'border-yellow-400/50 bg-yellow-400/10'
                    : isConnected
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-slate-600 bg-slate-700/30'
                }`}
              >
                {/* Seat indicator */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isConnected ? 'bg-emerald-400' : 'bg-slate-500'
                }`} />

                <div className="flex-1">
                  <div className={`font-semibold text-sm ${isConnected ? 'text-white' : 'text-gray-500'}`}>
                    {isConnected ? player.name : 'Waiting…'}
                  </div>
                  <div className="text-xs text-gray-500">{SEAT_LABELS[i]}</div>
                </div>

                <div className="text-right">
                  {isMe && (
                    <span className="text-xs text-yellow-400 font-bold">You</span>
                  )}
                  {!isMe && isConnected && (
                    <span className="text-xs text-emerald-400">Connected</span>
                  )}
                  {!isConnected && (
                    <span className="text-xs text-gray-600">Bot</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        {isHost ? (
          <button
            onClick={startGame}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-yellow-900 font-bold rounded-2xl text-xl shadow-lg transition-all duration-200 active:scale-95"
          >
            Start Game 開始遊戲
          </button>
        ) : (
          <div className="w-full py-4 bg-slate-700/50 text-gray-400 font-semibold rounded-2xl text-center text-lg">
            Waiting for host to start…
          </div>
        )}

        <button
          onClick={disconnect}
          className="w-full mt-3 py-2.5 text-gray-500 hover:text-gray-300 text-sm font-semibold rounded-xl transition-colors"
        >
          Leave Room
        </button>
      </motion.div>
    </div>
  )
}
