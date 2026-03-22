import React from 'react'
import { useGameStore } from './store/gameStore'
import { useUIStore } from './store/uiStore'
import { useGameEngine } from './hooks/useGameEngine'
import { LandingScreen } from './components/screens/LandingScreen'
import { LobbyScreen } from './components/screens/LobbyScreen'
import { GameBoard } from './components/board/GameBoard'
import { GameOverScreen } from './components/screens/GameOverScreen'
import { ShuffleAnimation } from './components/animation/ShuffleAnimation'

export default function App() {
  const { state, networkMode } = useGameStore()
  const { shufflePhase } = useUIStore()

  // Run the game engine loop (no-ops in network mode — server drives transitions)
  useGameEngine()

  const { phase } = state

  // Show shuffle animation during shuffle/dealing phases
  const showShuffle = phase === 'shuffle' || phase === 'dealing' || shufflePhase === 'scattering' || shufflePhase === 'collecting'

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
