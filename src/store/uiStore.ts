import { create } from 'zustand'

export type ShufflePhase = 'inactive' | 'scattering' | 'collecting' | 'dealing' | 'complete'

interface UIStore {
  shufflePhase: ShufflePhase
  showScoreModal: boolean
  showWinAnimation: boolean
  winnerIndex: number | null
  selectedTileId: string | null
  cursorPos: { x: number; y: number }
  hoveredTileKey: string | null

  setShufflePhase: (p: ShufflePhase) => void
  setShowScoreModal: (v: boolean) => void
  setShowWinAnimation: (v: boolean) => void
  setWinnerIndex: (i: number | null) => void
  setSelectedTileId: (id: string | null) => void
  setCursorPos: (pos: { x: number; y: number }) => void
  setHoveredTileKey: (key: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  shufflePhase: 'inactive',
  showScoreModal: false,
  showWinAnimation: false,
  winnerIndex: null,
  selectedTileId: null,
  cursorPos: { x: 0, y: 0 },
  hoveredTileKey: null,

  setShufflePhase: (p) => set({ shufflePhase: p }),
  setShowScoreModal: (v) => set({ showScoreModal: v }),
  setShowWinAnimation: (v) => set({ showWinAnimation: v }),
  setWinnerIndex: (i) => set({ winnerIndex: i }),
  setSelectedTileId: (id) => set({ selectedTileId: id }),
  setCursorPos: (pos) => set({ cursorPos: pos }),
  setHoveredTileKey: (key) => set({ hoveredTileKey: key }),
}))
