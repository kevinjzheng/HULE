import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import { useUIStore } from '../store/uiStore'
import { botSelectDiscard, botDecideClaim, botDecideAfterDraw } from '../ai/botPlayer'
import { playDraw, playDiscard, playActionAvailable, playWin, playKong, sayWin, sayKong, sayPung, sayChow, sayFlower } from '../utils/sounds'

const BOT_THINK_MS = 900
const BOT_CLAIM_MS = 700

export function useGameEngine() {
  const { state, dispatch } = useGameStore()
  const { setShufflePhase, setShowScoreModal, setShowWinAnimation, setShowWinningHand, setWinnerIndex } = useUIStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const schedule = useCallback((fn: () => void, ms: number) => {
    clearTimer()
    timerRef.current = setTimeout(fn, ms)
  }, [])

  useEffect(() => {
    const { phase, round, players, humanPlayerIndex } = state

    switch (phase) {
      case 'shuffle': {
        setShufflePhase('scattering')
        schedule(() => {
          setShufflePhase('collecting')
          setTimeout(() => {
            setShufflePhase('dealing')
            dispatch({ type: 'SHUFFLE_COMPLETE' })
          }, 1800)
        }, 2500)
        break
      }

      case 'dealing': {
        schedule(() => {
          dispatch({ type: 'DEAL_COMPLETE' })
          setShufflePhase('complete')
        }, 1500)
        break
      }

      case 'playing': {
        schedule(() => {
          const latest = useGameStoreSnapshot()
          if (latest.phase !== 'playing') return
          if (latest.round.turnIndex === humanPlayerIndex) playDraw()
          dispatch({ type: 'DRAW_TILE' })
        }, 300)
        break
      }

      case 'bot_turn': {
        const ti = round.turnIndex
        if (players[ti]?.type !== 'bot') break

        // No draw sound for bot turns — human only hears their own draw
        schedule(() => {
          const actionAfterDraw = botDecideAfterDraw(ti, state)
          if (actionAfterDraw) {
            dispatch(actionAfterDraw)
            if (actionAfterDraw.type === 'DECLARE_WIN') {
              setWinnerIndex(ti)
              setShowWinAnimation(true)
              playWin()
              sayWin()
            } else if (actionAfterDraw.type === 'DECLARE_CLOSED_KONG' || actionAfterDraw.type === 'EXTEND_KONG') {
              playKong()
              sayKong()
            }
            return
          }
          const tileToDiscard = botSelectDiscard(players[ti], state)
          playDiscard()
          dispatch({ type: 'DISCARD_TILE', playerIndex: ti, tile: tileToDiscard })
        }, BOT_THINK_MS + Math.random() * 400)
        break
      }

      case 'awaiting_action': {
        // Play chime if human has a claim option
        if (round.pendingClaims[humanPlayerIndex] !== null) {
          playActionAvailable()
        }

        const pendingBotIndices = players
          .map((p, i) => ({ p, i }))
          .filter(({ p, i }) => p.type === 'bot' && round.pendingClaims[i] !== null)
          .map(({ i }) => i)

        if (pendingBotIndices.length === 0) break

        const humanHasClaim = round.pendingClaims[humanPlayerIndex] !== null
        const anyCanWin = players.some((_, i) => round.pendingClaims[i]?.canWin)
        // Give extra time when a win is on the table so human can react
        const delay = anyCanWin
          ? BOT_CLAIM_MS * 4
          : humanHasClaim
            ? BOT_CLAIM_MS * 2
            : BOT_CLAIM_MS

        schedule(() => {
          const latest = useGameStoreSnapshot()
          if (latest.phase !== 'awaiting_action') return

          const multipleWinnersAllowed = latest.ruleSettings.multipleWinners

          // Collect all bot winners first
          const botWinners: number[] = []
          for (const i of pendingBotIndices) {
            const claim = latest.round.pendingClaims[i]
            if (claim?.canWin) botWinners.push(i)
          }

          if (botWinners.length > 0) {
            if (multipleWinnersAllowed) {
              // Auto-include human if they also have canWin — don't let bots steal the win
              const humanClaim = latest.round.pendingClaims[latest.humanPlayerIndex]
              const winners = humanClaim?.canWin
                ? [latest.humanPlayerIndex, ...botWinners]
                : botWinners
              dispatch({ type: 'DECLARE_WIN', winners })
              setWinnerIndex(winners[0])
              setShowWinAnimation(true)
              playWin()
              sayWin()
              return
            } else {
              // Only first bot winner wins
              const i = botWinners[0]
              dispatch({ type: 'DECLARE_WIN', playerIndex: i })
              setWinnerIndex(i)
              setShowWinAnimation(true)
              playWin()
              sayWin()
              return
            }
          }

          // Non-win bot actions: only allowed when no player (including human) still has canWin
          const anyStillCanWin = latest.players.some((_, i) => latest.round.pendingClaims[i]?.canWin)
          if (anyStillCanWin) {
            // A player still has win opportunity — don't let bots pung/chow yet.
            // Skip all bot non-win claims; the human must act on the win or skip it.
            for (const i of pendingBotIndices) {
              if (latest.round.pendingClaims[i] !== null) {
                dispatch({ type: 'SKIP_CLAIM', playerIndex: i })
              }
            }
            return
          }

          // No wins remain — check other claims
          let claimed = false
          for (const i of pendingBotIndices) {
            const claim = latest.round.pendingClaims[i]
            if (!claim) continue
            const action = botDecideClaim(i, latest, latest.round.lastDiscard!, latest.round.lastDiscardBy!)
            if (action) {
              if (action.type === 'CLAIM_KONG') { playKong(); sayKong() }
              else if (action.type === 'CLAIM_PUNG') sayPung()
              else if (action.type === 'CLAIM_CHOW') sayChow()
              dispatch(action)
              claimed = true
              break
            }
          }

          if (!claimed) {
            for (const i of pendingBotIndices) {
              if (latest.round.pendingClaims[i] !== null) {
                dispatch({ type: 'SKIP_CLAIM', playerIndex: i })
              }
            }
          }
        }, delay)
        break
      }

      case 'round_end': {
        schedule(() => dispatch({ type: 'DECLARE_DRAW' }), 800)
        break
      }

      case 'scoring': {
        // Show winning hand for 5s, then reveal score modal
        setShowWinningHand(true)
        schedule(() => {
          setShowWinningHand(false)
          setShowScoreModal(true)
        }, 30000)
        break
      }
    }

    return clearTimer
  }, [
    state.phase,
    state.round.turnIndex,
    state.round.skipCount,
    state.round.roundNumber,
    state.roundHistory.length,
    state.round.kongPending,  // re-trigger when bonus tile drawn (phase stays 'playing')
    state.round.bonusDrawSeq,  // re-trigger on each bonus tile draw
  ])

  useEffect(() => () => clearTimer(), [])

  // Announce flower/season draws
  const bonusDrawSeq = state.round.bonusDrawSeq
  useEffect(() => {
    if (bonusDrawSeq > 0) sayFlower()
  }, [bonusDrawSeq])
}

function useGameStoreSnapshot() {
  return useGameStore.getState().state
}
