import React, { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { playTick } from '../../utils/sounds'
import { cn } from '../../utils/cn'

interface TurnTimerProps {
  onExpire: () => void
}

export function TurnTimer({ onExpire }: TurnTimerProps) {
  const { state } = useGameStore()
  const { phase, ruleSettings } = state
  const limitSeconds = ruleSettings.turnTimeLimit

  const [secondsLeft, setSecondsLeft] = useState(limitSeconds)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  // Reset timer whenever we enter awaiting_discard
  useEffect(() => {
    if (phase === 'awaiting_discard') {
      setSecondsLeft(limitSeconds)
    }
  }, [phase, limitSeconds])

  // Countdown tick
  useEffect(() => {
    if (phase !== 'awaiting_discard' || limitSeconds === 0) return

    const id = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(id)
          setTimeout(() => onExpireRef.current(), 0)
          return 0
        }
        if (next <= 10) playTick()
        return next
      })
    }, 1000)

    return () => clearInterval(id)
  }, [phase, limitSeconds])

  if (phase !== 'awaiting_discard' || limitSeconds === 0) return null

  const isUrgent = secondsLeft <= 10

  return (
    <div
      className={cn(
        'font-bold tabular-nums transition-colors',
        isUrgent
          ? 'text-red-400 text-2xl animate-pulse'
          : 'text-white/40 text-sm'
      )}
    >
      {isUrgent ? secondsLeft : `${secondsLeft}s`}
    </div>
  )
}
