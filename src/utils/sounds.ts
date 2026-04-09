/**
 * Web Audio API sound effects — no external files required.
 */

let _ctx: AudioContext | null = null

function ctx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

/**
 * Call once from a user-gesture handler (e.g. Start Game button) to unlock AudioContext.
 */
export function initAudio() {
  try {
    const ac = ctx()
    // Play a silent beep to truly warm up the audio pipeline
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    gain.gain.setValueAtTime(0.0001, ac.currentTime)
    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + 0.01)
  } catch { /* ignore */ }
}

function beep(opts: {
  freq: number
  freq2?: number
  freq2At?: number
  type?: OscillatorType
  volume?: number
  decay?: number
  delay?: number
}) {
  try {
    const ac = ctx()
    const t = ac.currentTime + (opts.delay ?? 0)

    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)

    osc.type = opts.type ?? 'sine'
    osc.frequency.setValueAtTime(opts.freq, t)
    if (opts.freq2 != null && opts.freq2At != null) {
      osc.frequency.setValueAtTime(opts.freq2, t + opts.freq2At)
    }

    const vol = opts.volume ?? 0.144
    const decay = opts.decay ?? 0.18
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(vol, t + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay)

    osc.start(t)
    osc.stop(t + decay + 0.05)
  } catch { /* ignore */ }
}

function noiseBlast(opts: {
  volume: number
  decay: number
  delay?: number
  hpFreq?: number
  lpFreq?: number
}) {
  try {
    const ac = ctx()
    const t = ac.currentTime + (opts.delay ?? 0)
    const sr = ac.sampleRate
    const length = Math.ceil(sr * (opts.decay + 0.05))
    const buf = ac.createBuffer(1, length, sr)
    const data = buf.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1

    const src = ac.createBufferSource()
    src.buffer = buf

    const gain = ac.createGain()
    gain.gain.setValueAtTime(opts.volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + opts.decay)

    let node: AudioNode = src
    if (opts.hpFreq) {
      const hp = ac.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = opts.hpFreq
      node.connect(hp)
      node = hp
    }
    if (opts.lpFreq) {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = opts.lpFreq
      node.connect(lp)
      node = lp
    }
    node.connect(gain)
    gain.connect(ac.destination)
    src.start(t)
    src.stop(t + opts.decay + 0.05)
  } catch { /* ignore */ }
}

/** Ivory tile clack — tile added to hand */
export function playDraw() {
  // Two quick clack hits like ivory tiles clicking together (~1100 Hz range)
  beep({ freq: 1150, type: 'triangle', volume: 0.24, decay: 0.045 })
  beep({ freq: 1300, type: 'triangle', volume: 0.176, decay: 0.038, delay: 0.028 })
  // Subtle texture burst
  noiseBlast({ volume: 0.12, decay: 0.04, hpFreq: 900, lpFreq: 5000 })
}

/** Light thump — tile placed on table */
export function playDiscard() {
  // Mid-range body thump (lighter, not as boomy)
  beep({ freq: 280, freq2: 200, freq2At: 0.05, type: 'sine', volume: 0.336, decay: 0.13 })
  // Impact texture
  noiseBlast({ volume: 0.2, decay: 0.055, hpFreq: 600, lpFreq: 4000 })
  // Light click transient
  beep({ freq: 1100, type: 'triangle', volume: 0.12, decay: 0.025 })
}

/** Two-tone rising chime — action available */
export function playActionAvailable() {
  beep({ freq: 880, type: 'sine', volume: 0.2, decay: 0.28 })
  beep({ freq: 1175, type: 'sine', volume: 0.16, decay: 0.35, delay: 0.13 })
}

/** Bright triumphant chord — win declared */
export function playWin() {
  beep({ freq: 523, type: 'sine', volume: 0.224, decay: 0.6 })
  beep({ freq: 659, type: 'sine', volume: 0.192, decay: 0.65, delay: 0.05 })
  beep({ freq: 784, type: 'sine', volume: 0.16, decay: 0.75, delay: 0.11 })
  beep({ freq: 1047, type: 'sine', volume: 0.144, decay: 0.9, delay: 0.2 })
  beep({ freq: 1319, type: 'sine', volume: 0.112, decay: 1.0, delay: 0.32 })
}

/** Kong draw — warm resonant click */
export function playKong() {
  beep({ freq: 440, freq2: 660, freq2At: 0.08, type: 'triangle', volume: 0.176, decay: 0.25 })
}

/** Short tick — turn timer countdown (≤10 seconds) */
export function playTick() {
  beep({ freq: 900, type: 'sine', volume: 0.176, decay: 0.06 })
}

// ─── Cantonese speech via Google Cloud TTS (server proxy) ─────────────────────
//
// The server exposes GET /tts?text=<Chinese> which proxies to Google Cloud TTS
// (yue-HK WaveNet-A voice). Audio is decoded and played through the AudioContext
// so it shares the same audio pipeline as sound effects.
//
// Falls back to Web Speech API if the server endpoint is unavailable (e.g. no
// GOOGLE_CLOUD_TTS_API_KEY configured, or offline dev without the server running).

// Derive the server base URL.
// In production VITE_WS_URL is set (e.g. wss://hule-server.onrender.com/ws),
// so we strip the protocol prefix and /ws suffix to get the HTTP base URL.
// In local dev the Vite proxy forwards /tts → http://localhost:8080, so '' works.
const _TTS_BASE = (() => {
  const wsUrl = import.meta.env.VITE_WS_URL as string | undefined
  if (wsUrl) return wsUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:').replace(/\/ws$/, '')
  return ''
})()

// Availability is determined lazily on the first speak() call.
// null = unknown (will try server), true = confirmed working, false = failed (retry after cooldown)
let _ttsAvailable: boolean | null = null
let _ttsLastFailTime = 0
const TTS_RETRY_COOLDOWN = 30_000

// Client-side AudioBuffer cache — avoids re-fetching the same term
const _ttsCache = new Map<string, AudioBuffer>()

// Raw MP3 byte cache — populated by prefetchTTS() before AudioContext is available
const _rawCache = new Map<string, ArrayBuffer>()

// Local static MP3 files bundled with the app (public/tts/) — loaded first, no server needed
const TTS_LOCAL: Record<string, string> = {
  '上':   '/tts/chow.mp3',
  '碰':   '/tts/pung.mp3',
  '槓':   '/tts/kong.mp3',
  '花牌': '/tts/flower.mp3',
  '食糊': '/tts/win.mp3',
  '自摸': '/tts/zimo.mp3',
}

// Web Speech fallback ─────────────────────────────────────────────────────────

let _chineseVoice: SpeechSynthesisVoice | null | undefined = undefined

function getChineseVoice(): SpeechSynthesisVoice | null {
  if (_chineseVoice !== undefined) return _chineseVoice
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  // Prefer Cantonese; fall back to any Chinese voice so audio always plays.
  _chineseVoice =
    voices.find(v => v.lang === 'zh-HK') ??
    voices.find(v => v.lang === 'yue-HK') ??
    voices.find(v => v.lang === 'yue') ??
    voices.find(v => v.lang === 'zh-TW') ??
    voices.find(v => v.lang.startsWith('zh')) ??
    null
  return _chineseVoice
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { _chineseVoice = undefined }
}

function speakWebSpeech(zhText: string, _phonetic: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const voice = getChineseVoice()
  // With a Chinese voice: speak Chinese characters in the voice's own locale.
  // Without any Chinese voice: fall back to English phonetics so the browser's
  // default voice says something rather than staying completely silent.
  const utt = new SpeechSynthesisUtterance(voice ? zhText : _phonetic)
  if (voice) { utt.voice = voice; utt.lang = voice.lang }
  utt.pitch = 1.1
  utt.rate = 0.9
  utt.volume = 1
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utt)
}

// Main speak function ─────────────────────────────────────────────────────────

/**
 * Speak a Cantonese game term.
 * Fetches MP3 audio from the server's Google Cloud TTS proxy and plays it
 * through the Web Audio API. Falls back to Web Speech API on any error.
 *
 * @param zhText   Chinese characters to synthesise (yue-HK WaveNet voice)
 * @param phonetic English phonetic spelling used only when no server or Chinese
 *                 voice is available (e.g. 'pung3', 'gong3', 'sik6 wu2')
 */
async function fetchRaw(zhText: string): Promise<ArrayBuffer> {
  // Try local bundled file first — instant, no server needed
  const localPath = TTS_LOCAL[zhText]
  if (localPath) {
    try {
      const res = await fetch(localPath)
      if (res.ok) return res.arrayBuffer()
    } catch { /* fall through to server */ }
  }
  // Fall back to server TTS proxy
  const ac = new AbortController()
  setTimeout(() => ac.abort(), 5000)
  const res = await fetch(`${_TTS_BASE}/tts?text=${encodeURIComponent(zhText)}`, { signal: ac.signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.arrayBuffer()
}

async function fetchTTSBuffer(zhText: string): Promise<AudioBuffer> {
  const cached = _ttsCache.get(zhText)
  if (cached) return cached
  // Use pre-fetched raw bytes if available (no extra network round-trip)
  const arrayBuf = _rawCache.get(zhText) ?? await fetchRaw(zhText)
  const audioBuffer = await ctx().decodeAudioData(arrayBuf)
  _ttsCache.set(zhText, audioBuffer)
  _rawCache.delete(zhText)
  return audioBuffer
}

export async function speak(zhText: string, phonetic: string): Promise<void> {
  // Skip fetch if server is known unavailable and retry cooldown hasn't expired
  if (_ttsAvailable === false && Date.now() - _ttsLastFailTime < TTS_RETRY_COOLDOWN) {
    speakWebSpeech(zhText, phonetic)
    return
  }

  try {
    const audioBuffer = await fetchTTSBuffer(zhText)
    _ttsAvailable = true
    const source = ctx().createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx().destination)
    source.start()
  } catch {
    _ttsAvailable = false
    _ttsLastFailTime = Date.now()
    speakWebSpeech(zhText, phonetic)
  }
}

export const sayChow   = () => speak('上',   'soeng6')
export const sayPung   = () => speak('碰',   'pung3')
export const sayKong   = () => speak('槓',   'gong3')
export const sayFlower = () => speak('花牌', 'faa1 paai4')
export const sayWin    = () => speak('食糊', 'sik6 wu2')
export const sayZimo   = () => speak('自摸', 'zi6 mo2')

const TTS_ALL_TERMS = ['上', '碰', '槓', '花牌', '食糊', '自摸']

/**
 * Pre-fetch raw MP3 bytes for all TTS terms — no AudioContext required.
 * Safe to call on page load. warmTTS() will decode these instantly later.
 */
export function prefetchTTS() {
  for (const zh of TTS_ALL_TERMS) {
    if (_ttsCache.has(zh) || _rawCache.has(zh)) continue
    fetchRaw(zh)
      .then(buf => { _rawCache.set(zh, buf); _ttsAvailable = true })
      .catch(() => { /* silently ignore — speak() will retry on demand */ })
  }
}

/**
 * Decode pre-fetched MP3 bytes into AudioBuffers ready for playback.
 * Call once after a user gesture has unlocked AudioContext.
 * Failures are silently ignored — speak() will retry on demand.
 */
export function warmTTS() {
  for (const zh of TTS_ALL_TERMS) {
    fetchTTSBuffer(zh)
      .then(() => { _ttsAvailable = true })
      .catch(() => { _ttsAvailable = false; _ttsLastFailTime = Date.now() })
  }
}

/** Tile-clatter burst — shuffle animation */
export function playShuffling() {
  // White noise bursts through a bandpass filter — sounds like ceramic tiles clacking
  const bursts = 4
  for (let i = 0; i < bursts; i++) {
    const delay = i * 0.10 + Math.random() * 0.03
    // Low thud component
    noiseBlast({ volume: 0.13 + Math.random() * 0.05, decay: 0.07, hpFreq: 400, lpFreq: 3000, delay })
    // High click component
    noiseBlast({ volume: 0.08 + Math.random() * 0.03, decay: 0.03, hpFreq: 3000, delay: delay + 0.005 })
  }
}
