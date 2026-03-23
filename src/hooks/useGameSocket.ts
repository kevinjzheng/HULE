import { useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import type { ClientMessage, ServerMessage } from '../types/network'
import type { GameState } from '../types'
import { sayPung, sayChow, sayKong, sayFlower, sayWin, sayZimo, playDraw, playDiscard } from '../utils/sounds'

function triggerNetworkSounds(prev: GameState, next: GameState) {
  for (let i = 0; i < next.players.length; i++) {
    const prevMelds = prev.players[i]?.melds.length ?? 0
    const nextMelds = next.players[i]?.melds.length ?? 0
    if (nextMelds > prevMelds) {
      const newMeld = next.players[i].melds[nextMelds - 1]
      if (newMeld.type === 'pung') sayPung()
      else if (newMeld.type === 'chow') sayChow()
      else if (newMeld.type === 'kong') { sayKong() }
    }
    const prevBonus = prev.players[i]?.bonusTiles.length ?? 0
    const nextBonus = next.players[i]?.bonusTiles.length ?? 0
    if (nextBonus > prevBonus) sayFlower()
  }
  if (next.phase === 'scoring' && prev.phase !== 'scoring') {
    const result = next.roundHistory[next.roundHistory.length - 1]
    if (result?.loser === null && result?.winner !== null) sayZimo()
    else sayWin()
  }
  if (next.phase === 'awaiting_discard' && prev.phase !== 'awaiting_discard') {
    playDraw()
  }
  if (next.round.lastDiscard && !prev.round.lastDiscard) {
    playDiscard()
  }
}

const WS_URL = (() => {
  // VITE_WS_URL is set in Vercel env vars to point to the Render.com backend
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL as string
  if (typeof window !== 'undefined')
    return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
  return 'ws://localhost:8080/ws'
})()

// Module-level singleton — persists across component mounts/unmounts.
// This prevents the WebSocket from being closed when LandingScreen unmounts
// and LobbyScreen mounts (which would delete the room on the server).
let _ws: WebSocket | null = null

export function useGameSocket() {
  const { setNetworkState, setNetworkMode, setNetworkSend, setNetworkError } = useGameStore()

  const send = useCallback((msg: ClientMessage) => {
    if (_ws && _ws.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify(msg))
    }
  }, [])

  const connect = useCallback((url: string = WS_URL) => {
    _ws?.close()
    setNetworkError(null)

    const ws = new WebSocket(url)
    _ws = ws

    ws.onmessage = (ev: MessageEvent) => {
      const msg = JSON.parse(ev.data as string) as ServerMessage

      switch (msg.type) {
        case 'JOINED':
          setNetworkMode(true, msg.seatIndex, msg.roomId, msg.token)
          setNetworkState(msg.state)
          break

        case 'STATE_UPDATE': {
          const prevState = useGameStore.getState().state
          setNetworkState(msg.state)
          triggerNetworkSounds(prevState, msg.state)
          break
        }

        case 'ERROR':
          setNetworkError(msg.message)
          break

        case 'ROOM_CLOSED':
          setNetworkMode(false)
          _ws = null
          break
      }
    }

    ws.onclose = () => {
      // Keep networkMode true on unintentional disconnect (allow reconnect)
    }

    ws.onerror = () => {
      setNetworkError('Could not connect to server')
    }

    // Wire dispatch → socket send
    setNetworkSend((action) => {
      send({ type: 'ACTION', action })
    })
  }, [send, setNetworkMode, setNetworkState, setNetworkSend, setNetworkError])

  const disconnect = useCallback(() => {
    _ws?.close()
    _ws = null
    setNetworkMode(false)
    setNetworkSend(null)
  }, [setNetworkMode, setNetworkSend])

  const createRoom = useCallback((name: string, mode: 'full' | 'half', ruleSettings: import('../types').RuleSettings) => {
    connect()
    const ws = _ws!
    const doSend = () => send({ type: 'CREATE', name, mode, ruleSettings })
    if (ws.readyState === WebSocket.OPEN) doSend()
    else ws.addEventListener('open', doSend, { once: true })
  }, [connect, send])

  const joinRoom = useCallback((name: string, roomId: string) => {
    connect()
    const ws = _ws!
    const doSend = () => send({ type: 'JOIN', name, roomId })
    if (ws.readyState === WebSocket.OPEN) doSend()
    else ws.addEventListener('open', doSend, { once: true })
  }, [connect, send])

  const reconnectRoom = useCallback((roomId: string, token: string) => {
    connect()
    const ws = _ws!
    const doSend = () => send({ type: 'RECONNECT', roomId, token })
    if (ws.readyState === WebSocket.OPEN) doSend()
    else ws.addEventListener('open', doSend, { once: true })
  }, [connect, send])

  const startGame = useCallback(() => {
    send({ type: 'START' })
  }, [send])

  // No cleanup on unmount — the singleton _ws must persist when LandingScreen
  // transitions to LobbyScreen. disconnect() handles explicit teardown.

  return { createRoom, joinRoom, reconnectRoom, startGame, disconnect, send }
}
