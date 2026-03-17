import { create } from 'zustand'
import type { GameState, GameAction, RuleSettings } from '../types'
import { DEFAULT_RULES } from '../types'
import { gameReducer, createInitialState } from '../engine/stateMachine'

interface GameStore {
  state: GameState
  dispatch: (action: GameAction) => void
  initGame: (names: string[], mode: 'full' | 'half', ruleSettings?: RuleSettings) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState(['Player', 'Bot 1', 'Bot 2', 'Bot 3'], 'half'),

  dispatch: (action: GameAction) => {
    set(store => ({ state: gameReducer(store.state, action) }))
  },

  initGame: (names: string[], mode: 'full' | 'half', ruleSettings?: RuleSettings) => {
    set({ state: createInitialState(names, mode, ruleSettings ?? DEFAULT_RULES) })
  },
}))
