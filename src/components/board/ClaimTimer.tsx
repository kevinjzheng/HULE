import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { playTick } from '../../utils/sounds'
import { cn } from '../../utils/cn'

const CLAIM_SECONDS = 10

interface ClaimTimerProps {
  onExpire: () => void
}

export function ClaimTimer({ onExpire }: ClaimTimerProps) {
  const { state } = useGameStore()
  const { phase, round } = state
  const [secondsLeft, setSecondsLeft] = useState(CLAIM_SECONDS)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  // Reset whenever we enter awaiting_action or pending claims change
  useEffect(() => {
    if (phase === 'awaiting_action') {
      setSecondsLeft(CLAIM_SECONDS)
    }
  }, [phase, round.skipCount])

  // Countdown
  useEffect(() => {
    if (phase !== 'awaiting_action') return

    const id = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(id)
          setTimeout(() => onExpireRef.current(), 0)
          return 0
        }
        if (next <= 5) playTick()
        return next
      })
    }, 1000)

    return () => clearInterval(id)
  }, [phase, round.skipCount])

  if (phase !== 'awaiting_action') return null

  const isUrgent = secondsLeft <= 5

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
