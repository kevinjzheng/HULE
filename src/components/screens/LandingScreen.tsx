import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import type { GameMode, RuleSettings } from '../../types'
import { DEFAULT_RULES } from '../../types'
import { initAudio, warmTTS, prefetchTTS } from '../../utils/sounds'
import { useGameSocket } from '../../hooks/useGameSocket'

type Tab = 'solo' | 'multi'

export function LandingScreen() {
  const { initGame, dispatch, networkError, setNetworkError } = useGameStore()
  const { createRoom, joinRoom } = useGameSocket()

  const [tab, setTab] = useState<Tab>('solo')

  useEffect(() => { prefetchTTS() }, [])

  // Solo state
  const [playerName, setPlayerName] = useState('Player')
  const [mode, setMode] = useState<GameMode>('half')
  const [rules, setRules] = useState<RuleSettings>(DEFAULT_RULES)
  const [showRules, setShowRules] = useState(false)

  // Multiplayer state
  const [mpName, setMpName] = useState('Player')
  const [mpMode, setMpMode] = useState<GameMode>('half')
  const [mpRules, setMpRules] = useState<RuleSettings>(DEFAULT_RULES)
  const [showMpRules, setShowMpRules] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [mpError, setMpError] = useState('')

  const handleStart = () => {
    initAudio()
    warmTTS()
    initGame([playerName || 'Player', 'Bot 1', 'Bot 2', 'Bot 3'], mode, rules)
    dispatch({ type: 'START_GAME' })
  }

  const setRule = <K extends keyof RuleSettings>(key: K, value: RuleSettings[K]) => {
    setRules(r => ({ ...r, [key]: value }))
  }

  const setMpRule = <K extends keyof RuleSettings>(key: K, value: RuleSettings[K]) => {
    setMpRules(r => ({ ...r, [key]: value }))
  }

  const handleCreate = () => {
    if (!mpName.trim()) { setMpError('Enter your name'); return }
    setMpError('')
    setNetworkError(null)
    initAudio()
    warmTTS()
    createRoom(mpName.trim() || 'Player', mpMode, mpRules)
  }

  const handleJoin = () => {
    if (!mpName.trim()) { setMpError('Enter your name'); return }
    if (!joinCode.trim()) { setMpError('Enter a room code'); return }
    setMpError('')
    setNetworkError(null)
    initAudio()
    warmTTS()
    joinRoom(mpName.trim() || 'Player', joinCode.trim().toUpperCase())
  }

  return (
    <div className="min-h-screen bg-table-felt flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/90 backdrop-blur rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-600"
      >
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-yellow-400 mb-1">胡了</h1>
          <p className="text-xl text-yellow-200 font-semibold">HULE</p>
          <p className="text-gray-400 text-sm mt-1">Hong Kong Mahjong</p>
        </div>

        {/* Tab bar */}
        <div className="flex rounded-xl overflow-hidden border border-slate-600 mb-6">
          {(['solo', 'multi'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
                tab === t
                  ? 'bg-yellow-500 text-yellow-900'
                  : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
              }`}
            >
              {t === 'solo' ? 'Solo 單機' : 'Multiplayer 多人'}
            </button>
          ))}
        </div>

        {/* ── Solo tab ── */}
        {tab === 'solo' && (
          <>
            {/* Player name */}
            <div className="mb-5">
              <label className="block text-gray-300 text-sm font-semibold mb-2">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={20}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-500 focus:border-yellow-400 focus:outline-none text-lg"
                placeholder="Enter your name..."
              />
            </div>

            {/* Game mode */}
            <div className="mb-5">
              <label className="block text-gray-300 text-sm font-semibold mb-2">Game Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <ModeButton active={mode === 'half'} onClick={() => setMode('half')}
                  title="Half Game" subtitle="8 rounds (East + South)" icon="🀄" />
                <ModeButton active={mode === 'full'} onClick={() => setMode('full')}
                  title="Full Game" subtitle="16 rounds (All 4 winds)" icon="🎋" />
              </div>
            </div>

            {/* House Rules */}
            <HouseRules rules={rules} setRule={setRule} show={showRules} toggle={() => setShowRules(v => !v)} />

            {/* Start */}
            <button
              onClick={handleStart}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-yellow-900 font-bold rounded-2xl text-xl shadow-lg transition-all duration-200 active:scale-95"
            >
              開始遊戲 Start Game
            </button>

            <p className="text-center text-gray-500 text-xs mt-4">
              1 player + 3 bots · Local play · Hong Kong (廣東麻雀)
            </p>
          </>
        )}

        {/* ── Multiplayer tab ── */}
        {tab === 'multi' && (
          <>
            {/* Player name */}
            <div className="mb-5">
              <label className="block text-gray-300 text-sm font-semibold mb-2">Your Name</label>
              <input
                type="text"
                value={mpName}
                onChange={e => setMpName(e.target.value)}
                maxLength={20}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-500 focus:border-yellow-400 focus:outline-none text-lg"
                placeholder="Enter your name..."
              />
            </div>

            {/* Create room */}
            <div className="mb-4">
              <div className="text-gray-300 text-sm font-semibold mb-3">Create Room 建立房間</div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <ModeButton active={mpMode === 'half'} onClick={() => setMpMode('half')}
                  title="Half Game" subtitle="8 rounds" icon="🀄" />
                <ModeButton active={mpMode === 'full'} onClick={() => setMpMode('full')}
                  title="Full Game" subtitle="16 rounds" icon="🎋" />
              </div>
              <HouseRules rules={mpRules} setRule={setMpRule} show={showMpRules} toggle={() => setShowMpRules(v => !v)} />
              <button
                onClick={handleCreate}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-yellow-900 font-bold rounded-2xl text-base shadow-lg transition-all duration-200 active:scale-95"
              >
                Create Room 建立房間
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-600" />
              <span className="text-gray-500 text-xs">or</span>
              <div className="flex-1 h-px bg-slate-600" />
            </div>

            {/* Join room */}
            <div className="mb-4">
              <div className="text-gray-300 text-sm font-semibold mb-2">Join Room 加入房間</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-500 focus:border-yellow-400 focus:outline-none text-lg font-mono tracking-widest uppercase"
                  placeholder="CODE"
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
                <button
                  onClick={handleJoin}
                  className="px-5 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl transition-colors"
                >
                  Join
                </button>
              </div>
            </div>

            {/* Error */}
            {(mpError || networkError) && (
              <p className="text-red-400 text-sm text-center mb-3">{mpError || networkError}</p>
            )}

            <p className="text-center text-gray-500 text-xs mt-2">
              Up to 4 players · WebSocket multiplayer
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HouseRules({
  rules, setRule, show, toggle,
}: {
  rules: RuleSettings
  setRule: <K extends keyof RuleSettings>(key: K, value: RuleSettings[K]) => void
  show: boolean
  toggle: () => void
}) {
  return (
    <div className="mb-5">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between bg-slate-700/50 hover:bg-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors"
      >
        <span>⚙ House Rules 規則設定</span>
        <span className="text-gray-500">{show ? '▲' : '▼'}</span>
      </button>

      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-slate-700/30 rounded-xl mt-1 p-4 space-y-3"
        >
          {/* Minimum fan */}
          <div>
            <div className="text-gray-300 text-xs font-semibold mb-1.5">Minimum Fan to Win 最低番數</div>
            <div className="flex gap-2">
              {[0, 1, 3].map(n => (
                <button key={n} onClick={() => setRule('minFanToWin', n)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    rules.minFanToWin === n ? 'bg-yellow-500 text-yellow-900' : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
                  }`}>
                  {n === 0 ? 'None' : `${n} Fan`}
                </button>
              ))}
            </div>
          </div>

          {/* Turn time limit */}
          <div>
            <div className="text-gray-300 text-xs font-semibold mb-1.5">Turn Time Limit 出牌時限</div>
            <div className="flex gap-1.5 flex-wrap">
              {([0, 15, 30, 45, 60] as const).map(n => (
                <button key={n} onClick={() => setRule('turnTimeLimit', n)}
                  className={`flex-1 min-w-[2.5rem] py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    rules.turnTimeLimit === n ? 'bg-yellow-500 text-yellow-900' : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
                  }`}>
                  {n === 0 ? 'Off' : `${n}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Action timer */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-gray-300 text-xs font-semibold">Action Timer 搶牌時限</div>
              <span className={`text-xs font-bold ${rules.actionTimeLimit === 0 ? 'text-gray-500' : 'text-yellow-400'}`}>
                {rules.actionTimeLimit === 0 ? 'Off' : `${rules.actionTimeLimit}s`}
              </span>
            </div>
            <input
              type="range" min={0} max={30} step={1} value={rules.actionTimeLimit}
              onChange={e => setRule('actionTimeLimit', parseInt(e.target.value))}
              className="w-full accent-yellow-400"
            />
            <p className="text-gray-500 text-[10px] mt-1">Time to claim Pung, Chow, Kong, or declare a win. 0 = no limit.</p>
          </div>

          {/* Points per fan */}
          <div>
            <div className="text-gray-300 text-xs font-semibold mb-1.5">Points Per Fan 每番點數</div>
            <div className="flex gap-1.5 flex-wrap items-center">
              {[0.5, 1, 2].map(n => (
                <button key={n} onClick={() => setRule('pointsPerFan', n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    rules.pointsPerFan === n ? 'bg-yellow-500 text-yellow-900' : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
                  }`}>
                  {n}
                </button>
              ))}
              <input
                type="number" min="0.1" step="0.5" value={rules.pointsPerFan}
                onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) setRule('pointsPerFan', v) }}
                className={`w-20 py-1.5 rounded-lg text-sm font-bold text-center transition-colors ${
                  ![0.5, 1, 2].includes(rules.pointsPerFan) ? 'bg-yellow-500 text-yellow-900' : 'bg-slate-600 text-gray-300'
                } focus:outline-none focus:ring-1 focus:ring-yellow-400`}
                placeholder="Custom"
              />
            </div>
          </div>

          {/* Toggle rules */}
          {([
            { key: 'sevenPairs' as const, label: 'Seven Pairs', zh: '七對子' },
            { key: 'flowers' as const, label: 'Flowers & Seasons', zh: '花牌' },
            { key: 'noBonusFan' as const, label: 'No Flowers = +1 Fan', zh: '無花加番' },
            { key: 'multipleWinners' as const, label: 'Multiple Winners', zh: '多家胡' },
            { key: 'enableGameLog' as const, label: 'Game Log', zh: '遊戲記錄' },
          ] as const).map(({ key, label, zh }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">{label} <span className="text-gray-500 text-xs">{zh}</span></span>
              <button onClick={() => setRule(key, !rules[key])}
                className={`relative w-11 h-6 rounded-full transition-colors ${rules[key] ? 'bg-yellow-500' : 'bg-slate-600'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${rules[key] ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}

          {/* Comfort level */}
          <div>
            <div className="text-gray-300 text-xs font-semibold mb-1.5">Comfort Level 經驗水平</div>
            <div className="flex gap-2">
              {(['beginner', 'experienced'] as const).map(level => (
                <button key={level} onClick={() => setRule('comfortLevel', level)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    rules.comfortLevel === level ? 'bg-yellow-500 text-yellow-900' : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
                  }`}>
                  {level === 'beginner' ? 'Beginner 初學' : 'Experienced 老手'}
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-[10px] mt-1">Beginner highlights useful tiles and shows the scoring guide button prominently.</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function ModeButton({ active, onClick, title, subtitle, icon }: {
  active: boolean; onClick: () => void; title: string; subtitle: string; icon: string
}) {
  return (
    <button onClick={onClick}
      className={`p-3 rounded-xl text-left transition-all border-2 ${
        active ? 'border-yellow-400 bg-yellow-400/10 text-white' : 'border-slate-600 bg-slate-700/50 text-gray-400 hover:border-slate-400'
      }`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-bold text-sm">{title}</div>
      <div className="text-xs opacity-70 mt-0.5">{subtitle}</div>
    </button>
  )
}
