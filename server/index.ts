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
import { GameRoom } from '../src/server/GameRoom.js'
import type { WSLike } from '../src/server/GameRoom.js'
import type { ClientMessage } from '../src/types/network.js'

// ── Config ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '8080', 10)
const ROOM_TTL_MS = 30 * 60 * 1000   // 30 min idle room cleanup

// ── State ─────────────────────────────────────────────────────────────────────

const rooms = new Map<string, GameRoom>()

function makeRoomId(): string {
  let id: string
  do {
    id = crypto.randomBytes(3).toString('hex').toUpperCase()
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

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end(`HULE server · ${rooms.size} room(s) active\n`)
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null
  let currentToken: string | null = null

  // Adapt ws to our WSLike interface
  const wsLike: WSLike = {
    send: (data: string) => ws.send(data),
    terminate: () => ws.terminate(),
    get readyState() { return ws.readyState },
  }

  ws.on('message', (raw: Buffer | string) => {
    let msg: ClientMessage
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage
    } catch {
      sendError(ws, 'PARSE_ERROR', 'Invalid JSON')
      return
    }

    switch (msg.type) {
      case 'CREATE': {
        const roomId = makeRoomId()
        const token = makeToken()
        const room = new GameRoom(roomId, msg.mode, msg.ruleSettings)
        rooms.set(roomId, room)

        const seatIndex = room.join(wsLike, token, msg.name)
        if (seatIndex === -1) {
          sendError(ws, 'JOIN_FAILED', 'Could not create room')
          return
        }

        currentRoomId = roomId
        currentToken = token

        send(ws, { type: 'JOINED', seatIndex, token, roomId, state: room.getState() })
        console.log(`[server] Room ${roomId} created by "${msg.name}" (seat ${seatIndex})`)
        break
      }

      case 'JOIN': {
        const room = rooms.get(msg.roomId)
        if (!room) {
          sendError(ws, 'ROOM_NOT_FOUND', `Room ${msg.roomId} not found`)
          return
        }

        if (room.hasName(msg.name)) {
          sendError(ws, 'NAME_TAKEN', `Name "${msg.name}" is already taken in this room`)
          return
        }

        const token = makeToken()
        const seatIndex = room.join(wsLike, token, msg.name)
        if (seatIndex === -1) {
          sendError(ws, 'ROOM_FULL', 'Room is full')
          return
        }

        currentRoomId = msg.roomId
        currentToken = token

        send(ws, { type: 'JOINED', seatIndex, token, roomId: msg.roomId, state: room.getState() })
        console.log(`[server] "${msg.name}" joined room ${msg.roomId} (seat ${seatIndex})`)
        break
      }

      case 'RECONNECT': {
        const room = rooms.get(msg.roomId)
        if (!room) {
          sendError(ws, 'ROOM_NOT_FOUND', `Room ${msg.roomId} not found`)
          return
        }

        const seatIndex = room.reconnect(wsLike, msg.token)
        if (seatIndex === -1) {
          sendError(ws, 'RECONNECT_FAILED', 'Token not recognised')
          return
        }

        currentRoomId = msg.roomId
        currentToken = msg.token

        send(ws, { type: 'JOINED', seatIndex, token: msg.token, roomId: msg.roomId, state: room.getState() })
        console.log(`[server] Player reconnected to room ${msg.roomId} (seat ${seatIndex})`)
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
        const room = rooms.get(currentRoomId)
        if (!room) return
        room.handleAction(msg.action, room.getSeatByToken(currentToken))
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
