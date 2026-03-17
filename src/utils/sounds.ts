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

    const vol = opts.volume ?? 0.18
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
  beep({ freq: 1150, type: 'triangle', volume: 0.3, decay: 0.045 })
  beep({ freq: 1300, type: 'triangle', volume: 0.22, decay: 0.038, delay: 0.028 })
  // Subtle texture burst
  noiseBlast({ volume: 0.15, decay: 0.04, hpFreq: 900, lpFreq: 5000 })
}

/** Light thump — tile placed on table */
export function playDiscard() {
  // Mid-range body thump (lighter, not as boomy)
  beep({ freq: 280, freq2: 200, freq2At: 0.05, type: 'sine', volume: 0.42, decay: 0.13 })
  // Impact texture
  noiseBlast({ volume: 0.25, decay: 0.055, hpFreq: 600, lpFreq: 4000 })
  // Light click transient
  beep({ freq: 1100, type: 'triangle', volume: 0.15, decay: 0.025 })
}

/** Two-tone rising chime — action available */
export function playActionAvailable() {
  beep({ freq: 880, type: 'sine', volume: 0.25, decay: 0.28 })
  beep({ freq: 1175, type: 'sine', volume: 0.2, decay: 0.35, delay: 0.13 })
}

/** Bright triumphant chord — win declared */
export function playWin() {
  beep({ freq: 523, type: 'sine', volume: 0.28, decay: 0.6 })
  beep({ freq: 659, type: 'sine', volume: 0.24, decay: 0.65, delay: 0.05 })
  beep({ freq: 784, type: 'sine', volume: 0.2, decay: 0.75, delay: 0.11 })
  beep({ freq: 1047, type: 'sine', volume: 0.18, decay: 0.9, delay: 0.2 })
  beep({ freq: 1319, type: 'sine', volume: 0.14, decay: 1.0, delay: 0.32 })
}

/** Kong draw — warm resonant click */
export function playKong() {
  beep({ freq: 440, freq2: 660, freq2At: 0.08, type: 'triangle', volume: 0.22, decay: 0.25 })
}

/** Short tick — turn timer countdown (≤10 seconds) */
export function playTick() {
  beep({ freq: 900, type: 'sine', volume: 0.22, decay: 0.06 })
}

/** Tile-clatter burst — shuffle animation */
export function playShuffling() {
  // White noise bursts through a bandpass filter — sounds like ceramic tiles clacking
  const bursts = 6
  for (let i = 0; i < bursts; i++) {
    const delay = i * 0.05 + Math.random() * 0.02
    // Low thud component
    noiseBlast({ volume: 0.4 + Math.random() * 0.15, decay: 0.07, hpFreq: 400, lpFreq: 3000, delay })
    // High click component
    noiseBlast({ volume: 0.25 + Math.random() * 0.1, decay: 0.03, hpFreq: 3000, delay: delay + 0.005 })
  }
}
