import React, { useEffect, useState } from 'react'
import { useGameStore } from './store/gameStore'
import { useUIStore } from './store/uiStore'
import { useGameEngine } from './hooks/useGameEngine'
import { useGameSocket } from './hooks/useGameSocket'
import { LandingScreen } from './components/screens/LandingScreen'
import { LobbyScreen } from './components/screens/LobbyScreen'
import { GameBoard } from './components/board/GameBoard'
import { GameOverScreen } from './components/screens/GameOverScreen'
import { ShuffleAnimation } from './components/animation/ShuffleAnimation'

export default function App() {
  const { state, networkMode, networkError, setNetworkMode } = useGameStore()
  const { shufflePhase } = useUIStore()
  const { reconnectRoom } = useGameSocket()
  const [reconnecting, setReconnecting] = useState(false)

  // On page load, attempt to restore a previous multiplayer session
  useEffect(() => {
    const roomId = sessionStorage.getItem('hule_roomId')
    const token = sessionStorage.getItem('hule_token')
    if (roomId && token) {
      setReconnecting(true)
      reconnectRoom(roomId, token)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Once we get a response (networkMode set, or an error), stop showing reconnecting
  useEffect(() => {
    if (networkMode || networkError) setReconnecting(false)
  }, [networkMode, networkError])

  // If reconnect fails, clear stale credentials so the landing screen shows normally
  useEffect(() => {
    if (networkError && reconnecting === false) {
      sessionStorage.removeItem('hule_roomId')
      sessionStorage.removeItem('hule_token')
    }
  }, [networkError, reconnecting])

  // Run the game engine loop (no-ops in network mode — server drives transitions)
  useGameEngine()

  const { phase } = state

  // Show shuffle animation during shuffle/dealing phases
  const showShuffle = phase === 'shuffle' || phase === 'dealing' || shufflePhase === 'scattering' || shufflePhase === 'collecting'

  if (reconnecting) return (
    <div className="min-h-screen bg-table-felt flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">胡了</div>
        <p className="text-yellow-200 text-lg">Reconnecting...</p>
      </div>
    </div>
  )

  if (phase === 'idle' && !networkMode) return <LandingScreen />
  if (phase === 'idle' && networkMode) return <LobbyScreen />
  if (phase === 'game_over') return <GameOverScreen />

  return (
    <div className="w-full h-screen overflow-hidden">
      {showShuffle && <ShuffleAnimation onComplete={() => {}} />}
      {(phase !== 'shuffle' && phase !== 'dealing' && shufflePhase !== 'scattering' && shufflePhase !== 'collecting') && (
        <GameBoard />
      )}
    </div>
  )
}
