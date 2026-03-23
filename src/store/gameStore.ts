import { create } from 'zustand'
import type { GameState, GameAction, RuleSettings } from '../types'
import { DEFAULT_RULES } from '../types'
import { gameReducer, createInitialState } from '../engine/stateMachine'

interface GameStore {
  state: GameState
  // Network multiplayer
  networkMode: boolean
  networkSeatIndex: number
  roomId: string | null
  token: string | null
  _networkSend: ((action: GameAction) => void) | null
  networkError: string | null

  dispatch: (action: GameAction) => void
  initGame: (names: string[], mode: 'full' | 'half', ruleSettings?: RuleSettings) => void
  setNetworkState: (state: GameState) => void
  setNetworkMode: (on: boolean, seatIndex?: number, roomId?: string, token?: string) => void
  setNetworkSend: (fn: ((action: GameAction) => void) | null) => void
  setNetworkError: (err: string | null) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState(['Player', 'Bot 1', 'Bot 2', 'Bot 3'], 'half'),
  networkMode: false,
  networkSeatIndex: 0,
  roomId: null,
  token: null,
  _networkSend: null,
  networkError: null,

  dispatch: (action: GameAction) => {
    if (get().networkMode) {
      get()._networkSend?.(action)
      return
    }
    set(store => ({ state: gameReducer(store.state, action) }))
  },

  initGame: (names: string[], mode: 'full' | 'half', ruleSettings?: RuleSettings) => {
    set({ state: createInitialState(names, mode, ruleSettings ?? DEFAULT_RULES) })
  },

  setNetworkState: (state: GameState) => set({ state }),

  setNetworkMode: (on: boolean, seatIndex = 0, roomId: string | null = null, token: string | null = null) => {
    if (on && roomId && token) {
      sessionStorage.setItem('hule_roomId', roomId)
      sessionStorage.setItem('hule_token', token)
    } else {
      sessionStorage.removeItem('hule_roomId')
      sessionStorage.removeItem('hule_token')
    }
    set({ networkMode: on, networkSeatIndex: seatIndex, roomId, token })
  },

  setNetworkSend: (fn) => set({ _networkSend: fn }),
  setNetworkError: (err) => set({ networkError: err }),
}))
