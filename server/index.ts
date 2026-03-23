/**
 * HULE WebSocket game server
 *
 * Usage (from the server/ directory):
 *   npm install
 *   npm run dev          # development via ts-node-esm
 *   npm run build        # compile to ../dist/server/
 *   npm start            # run compiled output
 *
 * Protocol: see src/types/network.ts
 *   Client → Server: CREATE | JOIN | RECONNECT | START | ACTION | NEXT_ROUND_ACK
 *   Server → Client: JOINED | STATE_UPDATE | ERROR | ROOM_CLOSED
 */

import http from 'http'
import crypto from 'crypto'
import { WebSocketServer } from 'ws'
import type { WebSocket } from 'ws'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { GameRoom } from '../src/server/GameRoom.js'
import type { WSLike } from '../src/server/GameRoom.js'
import type { ClientMessage } from '../src/types/network.js'

// ── Config ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '8080', 10)
const ROOM_TTL_MS = 30 * 60 * 1000   // 30 min idle room cleanup

// ── Input validation ─────────────────────────────────────────────────────────

const MAX_NAME_LENGTH = 20
const VALID_GAME_MODES = new Set(['full', 'half'])
const VALID_ACTION_TYPES = new Set([
  'START_GAME','SHUFFLE_COMPLETE','DEAL_COMPLETE','DRAW_TILE','DISCARD_TILE',
  'CLAIM_CHOW','CLAIM_PUNG','CLAIM_KONG','DECLARE_CLOSED_KONG','EXTEND_KONG',
  'DECLARE_WIN','DECLARE_DRAW','SKIP_CLAIM','NEXT_ROUND','END_GAME',
])
const VALID_SUITS = new Set(['man', 'pin', 'sou', 'honor', 'bonus'])

function validateName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) return null
  return trimmed
}

function validateRoomId(roomId: unknown): string | null {
  if (typeof roomId !== 'string') return null
  if (!/^[0-9A-F]{8}$/.test(roomId)) return null
  return roomId
}

function validateToken(token: unknown): string | null {
  if (typeof token !== 'string') return null
  if (!/^[0-9a-f]{32}$/.test(token)) return null
  return token
}

function validateRuleSettings(r: unknown): import('../src/types/index.js').RuleSettings | null {
  if (typeof r !== 'object' || r === null) return null
  const s = r as Record<string, unknown>
  if (typeof s.minFanToWin !== 'number' || s.minFanToWin < 0 || s.minFanToWin > 13) return null
  if (typeof s.sevenPairs !== 'boolean') return null
  if (typeof s.flowers !== 'boolean') return null
  if (typeof s.noBonusFan !== 'boolean') return null
  if (typeof s.multipleWinners !== 'boolean') return null
  if (typeof s.turnTimeLimit !== 'number' || s.turnTimeLimit < 0 || s.turnTimeLimit > 300) return null
  if (typeof s.pointsPerFan !== 'number' || s.pointsPerFan < 1 || s.pointsPerFan > 1000) return null
  if (typeof s.enableGameLog !== 'boolean') return null
  return {
    minFanToWin: Math.floor(s.minFanToWin),
    sevenPairs: s.sevenPairs,
    flowers: s.flowers,
    noBonusFan: s.noBonusFan,
    multipleWinners: s.multipleWinners,
    turnTimeLimit: Math.floor(s.turnTimeLimit),
    pointsPerFan: Math.floor(s.pointsPerFan),
    enableGameLog: s.enableGameLog,
  }
}

function validateTile(t: unknown): import('../src/types/index.js').Tile | null {
  if (typeof t !== 'object' || t === null) return null
  const tile = t as Record<string, unknown>
  if (typeof tile.id !== 'string' || tile.id.length > 20) return null
  if (!VALID_SUITS.has(tile.suit as string)) return null
  if (typeof tile.value !== 'number' || tile.value < 0 || tile.value > 9 || !Number.isInteger(tile.value)) return null
  return { id: tile.id, suit: tile.suit as import('../src/types/index.js').Suit, value: tile.value }
}

function validateAction(a: unknown): import('../src/types/index.js').GameAction | null {
  if (typeof a !== 'object' || a === null) return null
  const action = a as Record<string, unknown>
  if (!VALID_ACTION_TYPES.has(action.type as string)) return null
  if (action.playerIndex !== undefined) {
    if (typeof action.playerIndex !== 'number' || action.playerIndex < 0 || action.playerIndex > 3 || !Number.isInteger(action.playerIndex)) return null
  }
  if (action.tile !== undefined) {
    if (!validateTile(action.tile)) return null
  }
  if (action.chowTiles !== undefined) {
    if (!Array.isArray(action.chowTiles) || action.chowTiles.length !== 2) return null
    if (!validateTile(action.chowTiles[0]) || !validateTile(action.chowTiles[1])) return null
  }
  if (action.winners !== undefined) {
    if (!Array.isArray(action.winners) || action.winners.length > 4) return null
    if (!action.winners.every((w: unknown) => typeof w === 'number' && w >= 0 && w <= 3 && Number.isInteger(w))) return null
  }
  return action as unknown as import('../src/types/index.js').GameAction
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 1000
const RATE_LIMIT_MAX_MESSAGES = 10

function makeRateLimiter() {
  let count = 0
  let windowStart = Date.now()
  return function isAllowed(): boolean {
    const now = Date.now()
    if (now - windowStart >= RATE_LIMIT_WINDOW_MS) {
      count = 0
      windowStart = now
    }
    count++
    return count <= RATE_LIMIT_MAX_MESSAGES
  }
}

// ── Microsoft Edge TTS ────────────────────────────────────────────────────────

const TTS_VOICE = 'zh-HK-WanLungNeural'  // male Cantonese neural voice
const TTS_TERMS = ['上', '碰', '槓', '花牌', '食糊', '自摸']
const ttsCache = new Map<string, Buffer>()

async function synthesizeSpeech(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS()
  await tts.setMetadata(TTS_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)
  const { audioStream } = tts.toStream(text)
  const chunks: Buffer[] = []
  for await (const chunk of audioStream) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}

async function warmTtsCache() {
  let cached = 0
  for (const text of TTS_TERMS) {
    try {
      ttsCache.set(text, await synthesizeSpeech(text))
      cached++
    } catch (err) {
      console.warn(`[tts] Failed to pre-cache "${text}":`, (err as Error).message)
    }
  }
  console.log(`[tts] Pre-cached ${cached}/${TTS_TERMS.length} terms (${TTS_VOICE})`)
}

// ── State ─────────────────────────────────────────────────────────────────────

const rooms = new Map<string, GameRoom>()

function makeRoomId(): string {
  let id: string
  do {
    id = crypto.randomBytes(4).toString('hex').toUpperCase()
  } while (rooms.has(id))
  return id
}

function makeToken(): string {
  return crypto.randomBytes(16).toString('hex')
}

// Remove empty rooms periodically
setInterval(() => {
  for (const [id, room] of rooms) {
    if (room.isEmpty) {
      room.destroy()
      rooms.delete(id)
      console.log(`[server] Cleaned up idle room ${id}`)
    }
  }
}, ROOM_TTL_MS)

// ── HTTP + WS server ──────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  // CORS — restrict to same origin; TTS is only needed by our own frontend
  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? ''
  const origin = req.headers['origin'] ?? ''
  if (allowedOrigin && origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  } else if (!allowedOrigin) {
    // Dev fallback: allow all (set ALLOWED_ORIGIN in production)
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  // ── GET /tts?text=<whitelisted term> ─────────────────────────────────────
  if (url.pathname === '/tts' && req.method === 'GET') {
    const text = url.searchParams.get('text') ?? ''
    if (!TTS_TERMS.includes(text)) {
      res.writeHead(400); res.end('Invalid text'); return
    }

    try {
      let audio = ttsCache.get(text)
      if (!audio) {
        audio = await synthesizeSpeech(text)
        ttsCache.set(text, audio)
      }
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': audio.length,
      })
      res.end(audio)
    } catch (err) {
      console.error('[tts] Synthesis error:', (err as Error).message)
      res.writeHead(500); res.end('TTS synthesis failed')
    }
    return
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end(`HULE server · ${rooms.size} room(s) active\n`)
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null
  let currentToken: string | null = null
  const isAllowed = makeRateLimiter()

  // Adapt ws to our WSLike interface
  const wsLike: WSLike = {
    send: (data: string) => ws.send(data),
    terminate: () => ws.terminate(),
    get readyState() { return ws.readyState },
  }

  ws.on('message', (raw: Buffer | string) => {
    if (!isAllowed()) {
      sendError(ws, 'RATE_LIMITED', 'Too many messages')
      return
    }

    if (raw.toString().length > 4096) {
      sendError(ws, 'PAYLOAD_TOO_LARGE', 'Message too large')
      return
    }

    let msg: ClientMessage
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage
    } catch {
      sendError(ws, 'PARSE_ERROR', 'Invalid JSON')
      return
    }

    switch (msg.type) {
      case 'CREATE': {
        const name = validateName(msg.name)
        if (!name) { sendError(ws, 'INVALID_NAME', 'Name must be 1-20 characters'); return }
        if (!VALID_GAME_MODES.has(msg.mode)) { sendError(ws, 'INVALID_MODE', 'Invalid game mode'); return }
        const ruleSettings = validateRuleSettings(msg.ruleSettings)
        if (!ruleSettings) { sendError(ws, 'INVALID_RULES', 'Invalid rule settings'); return }

        const roomId = makeRoomId()
        const token = makeToken()
        const room = new GameRoom(roomId, msg.mode, ruleSettings)
        rooms.set(roomId, room)

        const seatIndex = room.join(wsLike, token, name)
        if (seatIndex === -1) {
          sendError(ws, 'JOIN_FAILED', 'Could not create room')
          return
        }

        currentRoomId = roomId
        currentToken = token

        send(ws, { type: 'JOINED', seatIndex, token, roomId, state: room.getState() })
        console.log(`[server] Room ${roomId} created by "${name}" (seat ${seatIndex})`)
        break
      }

      case 'JOIN': {
        const name = validateName(msg.name)
        if (!name) { sendError(ws, 'INVALID_NAME', 'Name must be 1-20 characters'); return }
        const roomId = validateRoomId(msg.roomId)
        if (!roomId) { sendError(ws, 'INVALID_ROOM', 'Invalid room ID'); return }

        const room = rooms.get(roomId)
        if (!room) {
          sendError(ws, 'ROOM_NOT_FOUND', 'Room not found')
          return
        }

        if (room.hasName(name)) {
          sendError(ws, 'NAME_TAKEN', 'Name is already taken in this room')
          return
        }

        const token = makeToken()
        const seatIndex = room.join(wsLike, token, name)
        if (seatIndex === -1) {
          sendError(ws, 'ROOM_FULL', 'Room is full')
          return
        }

        currentRoomId = roomId
        currentToken = token

        send(ws, { type: 'JOINED', seatIndex, token, roomId, state: room.getState() })
        console.log(`[server] "${name}" joined room ${roomId} (seat ${seatIndex})`)
        break
      }

      case 'RECONNECT': {
        const roomId = validateRoomId(msg.roomId)
        if (!roomId) { sendError(ws, 'INVALID_ROOM', 'Invalid room ID'); return }
        const token = validateToken(msg.token)
        if (!token) { sendError(ws, 'INVALID_TOKEN', 'Invalid token'); return }

        const room = rooms.get(roomId)
        if (!room) {
          sendError(ws, 'ROOM_NOT_FOUND', 'Room not found')
          return
        }

        const seatIndex = room.reconnect(wsLike, token)
        if (seatIndex === -1) {
          sendError(ws, 'RECONNECT_FAILED', 'Token not recognised')
          return
        }

        currentRoomId = roomId
        currentToken = token

        send(ws, { type: 'JOINED', seatIndex, token, roomId, state: room.getState() })
        console.log(`[server] Player reconnected to room ${roomId} (seat ${seatIndex})`)
        break
      }

      case 'START': {
        if (!currentRoomId || !currentToken) {
          sendError(ws, 'NOT_IN_ROOM', 'Join a room first')
          return
        }
        const room = rooms.get(currentRoomId)
        if (!room) return
        if (!room.startGame(room.getSeatByToken(currentToken))) {
          sendError(ws, 'CANNOT_START', 'Only the host (seat 0) can start')
        }
        break
      }

      case 'ACTION': {
        if (!currentRoomId || !currentToken) {
          sendError(ws, 'NOT_IN_ROOM', 'Join a room first')
          return
        }
        const action = validateAction(msg.action)
        if (!action) { sendError(ws, 'INVALID_ACTION', 'Invalid action'); return }
        const room = rooms.get(currentRoomId)
        if (!room) return
        room.handleAction(action, room.getSeatByToken(currentToken))
        break
      }

      case 'NEXT_ROUND_ACK':
        // No-op: server auto-advances after win_declared timeout
        break
    }
  })

  ws.on('close', () => {
    if (currentRoomId && currentToken) {
      const room = rooms.get(currentRoomId)
      if (room) {
        room.disconnect(currentToken)
        if (room.isEmpty) {
          room.destroy()
          rooms.delete(currentRoomId)
          console.log(`[server] Room ${currentRoomId} closed (all players left)`)
        }
      }
    }
  })

  ws.on('error', (err: Error) => {
    console.error('[server] WS error:', err.message)
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] HULE WebSocket server listening on ws://0.0.0.0:${PORT}`)
  warmTtsCache()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function send(ws: WebSocket, payload: object) {
  if (ws.readyState === 1 /* OPEN */) {
    ws.send(JSON.stringify(payload))
  }
}

function sendError(ws: WebSocket, code: string, message: string) {
  send(ws, { type: 'ERROR', code, message })
}
