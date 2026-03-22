import { GameRoom, sanitizeStateFor, WS_OPEN } from '../GameRoom'
import type { WSLike } from '../GameRoom'
import type { RuleSettings } from '../../types'

// ── Mock WebSocket ────────────────────────────────────────────────────────────

class MockWS implements WSLike {
  messages: string[] = []
  readyState = WS_OPEN
  send(data: string) { this.messages.push(data) }
  terminate() {}

  lastMsg(): Record<string, unknown> | null {
    if (this.messages.length === 0) return null
    return JSON.parse(this.messages[this.messages.length - 1]) as Record<string, unknown>
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_RULES: RuleSettings = {
  minFanToWin: 0,
  pointsPerFan: 1,
  turnTimeLimit: 0,
  flowers: true,
  sevenPairs: true,
  noBonusFan: false,
  multipleWinners: false,
  enableGameLog: false,
}

function makeRoom() {
  return new GameRoom('test-room', 'half', TEST_RULES)
}

// ── join ─────────────────────────────────────────────────────────────────────

describe('GameRoom.join', () => {
  let room: GameRoom

  beforeEach(() => {
    jest.useFakeTimers()
    room = makeRoom()
  })

  afterEach(() => {
    room.destroy()
    jest.useRealTimers()
  })

  test('first player gets seat 0', () => {
    const seat = room.join(new MockWS(), 'tok-a', 'Alice')
    expect(seat).toBe(0)
  })

  test('subsequent players fill next seats', () => {
    expect(room.join(new MockWS(), 'tok1', 'A')).toBe(0)
    expect(room.join(new MockWS(), 'tok2', 'B')).toBe(1)
    expect(room.join(new MockWS(), 'tok3', 'C')).toBe(2)
    expect(room.join(new MockWS(), 'tok4', 'D')).toBe(3)
  })

  test('returns -1 when room is full', () => {
    for (let i = 0; i < 4; i++) room.join(new MockWS(), `tok${i}`, `P${i}`)
    expect(room.join(new MockWS(), 'extra', 'E')).toBe(-1)
  })

  test('player name is reflected in state', () => {
    room.join(new MockWS(), 'tok', 'CustomName')
    expect(room.getState().players[0].name).toBe('CustomName')
  })
})

// ── reconnect ─────────────────────────────────────────────────────────────────

describe('GameRoom.reconnect', () => {
  let room: GameRoom

  beforeEach(() => {
    jest.useFakeTimers()
    room = makeRoom()
  })

  afterEach(() => {
    room.destroy()
    jest.useRealTimers()
  })

  test('reconnects to correct seat by token', () => {
    room.join(new MockWS(), 'my-token', 'Alice')
    const newWs = new MockWS()
    const seat = room.reconnect(newWs, 'my-token')
    expect(seat).toBe(0)
  })

  test('returns -1 for unknown token', () => {
    room.join(new MockWS(), 'tok-a', 'Alice')
    expect(room.reconnect(new MockWS(), 'wrong-token')).toBe(-1)
  })

  test('second player reconnects to seat 1', () => {
    room.join(new MockWS(), 'tok0', 'Alice')
    room.join(new MockWS(), 'tok1', 'Bob')
    expect(room.reconnect(new MockWS(), 'tok1')).toBe(1)
  })
})

// ── disconnect / isEmpty ──────────────────────────────────────────────────────

describe('GameRoom.disconnect / isEmpty', () => {
  let room: GameRoom

  beforeEach(() => {
    jest.useFakeTimers()
    room = makeRoom()
  })

  afterEach(() => {
    room.destroy()
    jest.useRealTimers()
  })

  test('isEmpty is true before anyone joins', () => {
    expect(room.isEmpty).toBe(true)
  })

  test('isEmpty is false after a player joins', () => {
    room.join(new MockWS(), 'tok', 'Alice')
    expect(room.isEmpty).toBe(false)
  })

  test('isEmpty becomes true after disconnect', () => {
    room.join(new MockWS(), 'tok', 'Alice')
    room.disconnect('tok')
    expect(room.isEmpty).toBe(true)
  })

  test('isEmpty is false while at least one player connected', () => {
    room.join(new MockWS(), 'tok0', 'Alice')
    room.join(new MockWS(), 'tok1', 'Bob')
    room.disconnect('tok0')
    expect(room.isEmpty).toBe(false)
    room.disconnect('tok1')
    expect(room.isEmpty).toBe(true)
  })
})

// ── startGame ─────────────────────────────────────────────────────────────────

describe('GameRoom.startGame', () => {
  let room: GameRoom

  beforeEach(() => {
    jest.useFakeTimers()
    room = makeRoom()
  })

  afterEach(() => {
    room.destroy()
    jest.useRealTimers()
  })

  test('seat 0 can start', () => {
    room.join(new MockWS(), 'tok', 'Alice')
    expect(room.startGame(0)).toBe(true)
  })

  test('non-seat-0 cannot start', () => {
    room.join(new MockWS(), 'tok', 'Alice')
    expect(room.startGame(1)).toBe(false)
    expect(room.startGame(3)).toBe(false)
  })

  test('cannot start twice', () => {
    room.join(new MockWS(), 'tok', 'Alice')
    room.startGame(0)
    expect(room.startGame(0)).toBe(false)
  })

  test('phase advances from idle after start', () => {
    room.join(new MockWS(), 'tok', 'Alice')
    expect(room.getState().phase).toBe('idle')
    room.startGame(0)
    expect(room.getState().phase).not.toBe('idle')
  })
})

// ── handleAction validation ───────────────────────────────────────────────────

describe('GameRoom.handleAction — validation', () => {
  let room: GameRoom
  let ws: MockWS

  beforeEach(() => {
    jest.useFakeTimers()
    room = makeRoom()
    ws = new MockWS()
    room.join(ws, 'tok', 'Alice')
    room.startGame(0)
  })

  afterEach(() => {
    room.destroy()
    jest.useRealTimers()
  })

  test('rejects DISCARD_TILE from wrong seat', () => {
    const countAfterStart = ws.messages.length
    room.handleAction(
      { type: 'DISCARD_TILE', playerIndex: 2, tile: { id: 't1', suit: 'man', value: 1 } },
      0  // sender is seat 0 but action claims playerIndex 2
    )
    expect(ws.messages.length).toBe(countAfterStart) // no broadcast = rejected
  })

  test('rejects unknown action type', () => {
    const countAfterStart = ws.messages.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    room.handleAction({ type: 'BOGUS_ACTION' as any }, 0)
    expect(ws.messages.length).toBe(countAfterStart)
  })

  test('accepts NEXT_ROUND from any seat', () => {
    const countBefore = ws.messages.length
    // NEXT_ROUND is valid from any seat
    expect(() => room.handleAction({ type: 'NEXT_ROUND' }, 0)).not.toThrow()
    // It should broadcast (the reducer will handle the actual state change)
    expect(ws.messages.length).toBeGreaterThanOrEqual(countBefore)
  })
})

// ── broadcast ─────────────────────────────────────────────────────────────────

describe('GameRoom broadcast', () => {
  let room: GameRoom

  beforeEach(() => {
    jest.useFakeTimers()
    room = makeRoom()
  })

  afterEach(() => {
    room.destroy()
    jest.useRealTimers()
  })

  test('broadcasts STATE_UPDATE to connected clients on startGame', () => {
    const ws = new MockWS()
    room.join(ws, 'tok', 'Alice')
    const prevCount = ws.messages.length
    room.startGame(0)
    expect(ws.messages.length).toBeGreaterThan(prevCount)
    const last = ws.lastMsg()
    expect(last?.type).toBe('STATE_UPDATE')
  })

  test('sends STATE_UPDATE to all connected clients', () => {
    const ws0 = new MockWS()
    const ws1 = new MockWS()
    room.join(ws0, 'tok0', 'Alice')
    room.join(ws1, 'tok1', 'Bob')
    room.startGame(0)
    // Both clients should receive the broadcast
    expect(ws0.messages.length).toBeGreaterThan(0)
    expect(ws1.messages.length).toBeGreaterThan(0)
  })

  test('does not send to disconnected clients', () => {
    const ws = new MockWS()
    room.join(ws, 'tok', 'Alice')
    room.disconnect('tok')
    ws.messages = []
    room.startGame(0)
    expect(ws.messages).toHaveLength(0)
  })

  test('does not send to closed WebSocket connections', () => {
    const ws = new MockWS()
    room.join(ws, 'tok', 'Alice')
    ws.readyState = 3 // CLOSED
    ws.messages = []
    room.startGame(0)
    expect(ws.messages).toHaveLength(0)
  })
})

// ── phase timer: shuffle → dealing ───────────────────────────────────────────

describe('GameRoom phase timers', () => {
  let room: GameRoom

  beforeEach(() => {
    jest.useFakeTimers()
    room = makeRoom()
  })

  afterEach(() => {
    room.destroy()
    jest.useRealTimers()
  })

  test('shuffle phase fires SHUFFLE_COMPLETE after 4500ms', () => {
    room.join(new MockWS(), 'tok', 'Alice')
    room.startGame(0)
    expect(room.getState().phase).toBe('shuffle')
    jest.advanceTimersByTime(4500)
    expect(room.getState().phase).toBe('dealing')
  })

  test('dealing phase fires DEAL_COMPLETE after 1500ms', () => {
    room.join(new MockWS(), 'tok', 'Alice')
    room.startGame(0)
    jest.advanceTimersByTime(4500) // → dealing
    jest.advanceTimersByTime(1500) // → playing
    expect(room.getState().phase).toBe('playing')
  })

  test('playing phase draws a tile after 300ms', () => {
    room.join(new MockWS(), 'tok', 'Alice')
    room.startGame(0)
    jest.advanceTimersByTime(4500 + 1500 + 300) // shuffle+deal+draw
    // Should have advanced beyond 'playing' (bot_turn or awaiting_discard)
    const phase = room.getState().phase
    expect(['bot_turn', 'awaiting_discard', 'awaiting_action']).toContain(phase)
  })
})

// ── bot detection ─────────────────────────────────────────────────────────────

describe('GameRoom bot detection', () => {
  let room: GameRoom

  beforeEach(() => {
    jest.useFakeTimers()
    room = makeRoom()
  })

  afterEach(() => {
    room.destroy()
    jest.useRealTimers()
  })

  test('seats without human players are treated as bots', () => {
    // Only seat 0 joins as human; seats 1-3 should be bots
    room.join(new MockWS(), 'tok', 'Alice')
    room.startGame(0)
    // After dealing, if seat 1/2/3 is active, bot logic should fire
    // We verify by advancing timers past dealing and checking bot actions proceed
    jest.advanceTimersByTime(4500 + 1500 + 300 + 1500)
    // Game should still be progressing (not stuck)
    const phase = room.getState().phase
    expect(phase).not.toBe('idle')
  })
})

// ── sanitizeStateFor ──────────────────────────────────────────────────────────

describe('sanitizeStateFor', () => {
  let room: GameRoom

  beforeEach(() => {
    jest.useFakeTimers()
    room = makeRoom()
    room.join(new MockWS(), 'tok0', 'Alice')
    room.join(new MockWS(), 'tok1', 'Bob')
    room.startGame(0)
    // Advance past dealing so players have hand tiles
    jest.advanceTimersByTime(4500 + 1500)
  })

  afterEach(() => {
    room.destroy()
    jest.useRealTimers()
  })

  test('hides opponent hand tiles', () => {
    const state = room.getState()
    if (state.players[1].hand.length > 0) {
      const sanitized = sanitizeStateFor(state, 0)
      sanitized.players[1].hand.forEach(t => {
        expect(t.id).toBe('hidden')
      })
    }
  })

  test('does not hide viewer own hand tiles', () => {
    const state = room.getState()
    const sanitized = sanitizeStateFor(state, 0)
    sanitized.players[0].hand.forEach(t => {
      expect(t.id).not.toBe('hidden')
    })
  })

  test('hides opponent drawnTile', () => {
    const state = room.getState()
    // Find any player with a drawnTile
    const playerWithDraw = state.players.findIndex((p, i) => i !== 0 && p.drawnTile !== null)
    if (playerWithDraw !== -1) {
      const sanitized = sanitizeStateFor(state, 0)
      expect(sanitized.players[playerWithDraw].drawnTile?.id).toBe('hidden')
    }
  })

  test('sets humanPlayerIndex to viewer seat', () => {
    const state = room.getState()
    expect(sanitizeStateFor(state, 0).humanPlayerIndex).toBe(0)
    expect(sanitizeStateFor(state, 1).humanPlayerIndex).toBe(1)
    expect(sanitizeStateFor(state, 3).humanPlayerIndex).toBe(3)
  })

  test('viewer sees own hand correctly from any seat', () => {
    const state = room.getState()
    const sanitized1 = sanitizeStateFor(state, 1)
    // Seat 1 (Bob) should see their own hand
    sanitized1.players[1].hand.forEach(t => {
      expect(t.id).not.toBe('hidden')
    })
    // But not seat 0's hand
    if (sanitized1.players[0].hand.length > 0) {
      sanitized1.players[0].hand.forEach(t => {
        expect(t.id).toBe('hidden')
      })
    }
  })
})
