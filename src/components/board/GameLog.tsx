import React, { useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useUIStore } from '../../store/uiStore'
import { cn } from '../../utils/cn'

const PLAYER_COLORS = [
  'text-yellow-300',   // player 0 (human)
  'text-sky-300',      // bot 1
  'text-emerald-300',  // bot 2
  'text-rose-300',     // bot 3
]

/** Inline log panel — rendered inside CenterArea next to the scoreboard */
export function GameLog() {
  const { state } = useGameStore()
  const { logMinimized, setLogMinimized } = useUIStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!logMinimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [state.gameLog.length, logMinimized])

  return (
    <div className="w-full bg-black/50 rounded-lg border border-white/10 overflow-hidden">
      {/* Header / minimize toggle */}
      <button
        className="w-full flex items-center gap-1.5 px-2 py-1 bg-black/30 hover:bg-black/50 transition-colors text-left"
        onClick={() => setLogMinimized(!logMinimized)}
      >
        <span className="text-white/70 text-xs font-semibold tracking-wide">Log</span>
        <span className="text-white/30 text-[10px]">遊戲記錄</span>
        {!logMinimized && (
          <span className="text-white/25 text-[10px] ml-1">{state.gameLog.length}</span>
        )}
        <span className="text-white/40 text-[10px] ml-auto">{logMinimized ? '▼' : '▲'}</span>
      </button>

      {!logMinimized && (
        <div
          ref={scrollRef}
          className="h-28 overflow-y-auto px-2 py-1 space-y-0.5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.12) transparent' }}
        >
          {state.gameLog.length === 0 ? (
            <p className="text-white/20 text-[10px] italic text-center mt-3">No actions yet…</p>
          ) : (
            state.gameLog.map((entry) => (
              <div key={entry.id} className="flex items-start gap-1 text-[10px] leading-snug">
                <span className="text-white/20 flex-shrink-0 tabular-nums">{entry.timestamp}</span>
                <span className={cn('font-semibold flex-shrink-0', PLAYER_COLORS[entry.playerIndex] ?? 'text-white/60')}>
                  {entry.playerName}
                </span>
                <span className="text-white/55">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
