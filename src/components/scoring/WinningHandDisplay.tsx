import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { useUIStore } from '../../store/uiStore'
import { TileComponent } from '../tiles/TileComponent'
import { WIND_CHARS } from '../../constants/tiles'
import type { Player, FanBreakdown, Tile } from '../../types'

const DISPLAY_SECONDS = 30

export function WinningHandDisplay() {
  const { state } = useGameStore()
  const { setShowWinningHand, setShowScoreModal } = useUIStore()
  const [countdown, setCountdown] = useState(DISPLAY_SECONDS)

  const handleProceed = () => {
    setShowWinningHand(false)
    setShowScoreModal(true)
  }

  useEffect(() => {
    setCountdown(DISPLAY_SECONDS)
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          handleProceed()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const lastResult = state.roundHistory[state.roundHistory.length - 1]
  if (!lastResult) return null

  const winnerIdx = lastResult.isDraw ? null : (lastResult.winner ?? lastResult.multiWinners?.[0] ?? null)
  const { winTile, fanBreakdown } = lastResult

  return (
    <div className="fixed inset-0 z-[45] bg-black/85 flex flex-col items-center justify-start p-4 gap-3 overflow-y-auto">

      {/* Header */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="text-center flex-shrink-0 pt-2"
      >
        {lastResult.isDraw ? (
          <div className="text-4xl font-bold text-slate-300">流局 Draw</div>
        ) : winnerIdx != null ? (
          <>
            <div className="text-5xl font-bold text-yellow-300 drop-shadow-[0_0_20px_rgba(255,200,0,0.8)] mb-1">
              胡了!
            </div>
            <div className="text-xl text-white font-semibold">
              {WIND_CHARS[['east', 'south', 'west', 'north'].indexOf(state.players[winnerIdx].seatWind) + 1]}{' '}
              {state.players[winnerIdx].name}
              {state.players[winnerIdx].isDealer ? ' 莊' : ''}
            </div>
            {fanBreakdown && (
              <div className="text-yellow-400 font-bold text-lg mt-0.5">
                {fanBreakdown.totalFan} Fan
              </div>
            )}
          </>
        ) : null}
      </motion.div>

      {/* Winner's hand — prominent */}
      {winnerIdx != null && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="w-full max-w-3xl flex-shrink-0"
        >
          <WinnerHandPanel
            player={state.players[winnerIdx]}
            winTile={winTile}
            fanBreakdown={fanBreakdown}
          />
        </motion.div>
      )}

      {/* All other players' hands revealed */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="w-full max-w-3xl flex flex-col gap-2 flex-shrink-0"
      >
        {state.players.map((player, idx) => {
          if (idx === winnerIdx) return null
          return (
            <PlayerHandPanel key={idx} player={player} />
          )
        })}
      </motion.div>

      {/* Proceed button + countdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col items-center gap-1 flex-shrink-0 pb-4"
      >
        <button
          onClick={handleProceed}
          className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-bold rounded-xl text-base shadow-lg transition-colors"
        >
          View Scores →
        </button>
        <span className="text-white/30 text-xs">{countdown}s</span>
      </motion.div>
    </div>
  )
}

function WinnerHandPanel({
  player,
  winTile,
  fanBreakdown,
}: {
  player: Player
  winTile?: Tile | null
  fanBreakdown?: FanBreakdown | null
}) {
  const windChar = WIND_CHARS[['east', 'south', 'west', 'north'].indexOf(player.seatWind) + 1]

  return (
    <div className="bg-yellow-900/30 rounded-2xl p-4 border border-yellow-400/30">
      <div className="text-yellow-300 font-bold text-sm mb-2">
        {windChar} {player.name} — Winning Hand
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        {/* Exposed melds */}
        {player.melds.map((meld, mi) => (
          <div key={mi} className="flex gap-0.5 bg-slate-700/50 rounded-lg p-1">
            {meld.tiles.map((t, ti) => (
              <TileComponent
                key={t.id}
                tile={t}
                faceDown={meld.concealed && meld.type === 'kong' && ti === 0}
                medium
              />
            ))}
          </div>
        ))}

        {player.melds.length > 0 && <div className="w-px bg-white/20 self-stretch" />}

        {/* Concealed hand tiles */}
        <div className="flex gap-0.5 flex-wrap justify-center">
          {player.hand
            .filter(t => !winTile || t.id !== winTile.id)
            .map((t) => (
              <TileComponent key={t.id} tile={t} medium />
            ))}
          {winTile && (
            <>
              <div className="w-2 flex-shrink-0" />
              <TileComponent tile={winTile} medium highlight />
            </>
          )}
        </div>
      </div>

      {/* Bonus tiles */}
      {player.bonusTiles.length > 0 && (
        <div className="flex gap-1 justify-center mt-2 pt-2 border-t border-yellow-400/20">
          <span className="text-white/40 text-xs self-center mr-1">花</span>
          {player.bonusTiles.map((t) => (
            <TileComponent key={t.id} tile={t} medium />
          ))}
        </div>
      )}

      {/* Fan breakdown */}
      {fanBreakdown && fanBreakdown.fans.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-center mt-2 pt-2 border-t border-yellow-400/20">
          {fanBreakdown.fans.map((fan, i) => (
            <span key={i} className="text-sm text-white/70">
              {fan.nameEn}
              <span className={fan.isLimit ? 'text-yellow-400 ml-1' : 'text-green-400 ml-1'}>
                {fan.isLimit ? 'LIMIT' : `+${fan.fan}`}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function PlayerHandPanel({ player }: { player: Player }) {
  const windChar = WIND_CHARS[['east', 'south', 'west', 'north'].indexOf(player.seatWind) + 1]

  const hasCards = player.hand.length > 0 || player.melds.length > 0

  return (
    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-600/40">
      <div className="text-white/60 font-semibold text-xs mb-2">
        {windChar} {player.name}
        {player.isDealer ? <span className="text-red-400 ml-1">莊</span> : null}
      </div>
      <div className="flex flex-wrap gap-2 items-start">
        {/* Melds */}
        {player.melds.map((meld, mi) => (
          <div key={mi} className="flex gap-0.5 bg-slate-700/50 rounded p-0.5">
            {meld.tiles.map((t, ti) => (
              <TileComponent
                key={t.id}
                tile={t}
                faceDown={meld.concealed && meld.type === 'kong' && ti === 0}
                small
              />
            ))}
          </div>
        ))}

        {player.melds.length > 0 && player.hand.length > 0 && (
          <div className="w-px bg-white/15 self-stretch" />
        )}

        {/* Hand tiles — all revealed */}
        <div className="flex gap-0.5 flex-wrap">
          {player.hand.map((t) => (
            <TileComponent key={t.id} tile={t} small />
          ))}
        </div>

        {/* Bonus tiles */}
        {player.bonusTiles.length > 0 && (
          <>
            <div className="w-px bg-white/15 self-stretch" />
            <div className="flex gap-0.5 flex-wrap">
              {player.bonusTiles.map((t) => (
                <TileComponent key={t.id} tile={t} small />
              ))}
            </div>
          </>
        )}

        {!hasCards && player.bonusTiles.length === 0 && (
          <span className="text-white/20 text-xs italic">—</span>
        )}
      </div>
    </div>
  )
}
