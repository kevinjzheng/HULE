import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'
import { playShuffling } from '../../utils/sounds'

// ─── Blank tile particle ──────────────────────────────────────────────────────

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotV: number
}

const TILE_W = 46
const TILE_H = 62
const NUM_TILES = 80       // plenty to fill the table
const REPULSION_RADIUS = 140
const MAX_FORCE = 16

function createParticles(W: number, H: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < NUM_TILES; i++) {
    particles.push({
      id: i,
      x: TILE_W + Math.random() * (W - TILE_W * 2),
      y: TILE_H + Math.random() * (H - TILE_H * 2),
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      rotation: (Math.random() - 0.5) * 50,
      rotV: (Math.random() - 0.5) * 1.5,
    })
  }
  return particles
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShuffleAnimation({ onComplete }: { onComplete: () => void }) {
  const { shufflePhase } = useUIStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const cursorRef = useRef({ x: -9999, y: -9999 })
  const rafRef = useRef<number>(0)
  const phaseRef = useRef(shufflePhase)
  phaseRef.current = shufflePhase

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W
    canvas.height = H

    particlesRef.current = createParticles(W, H)

    const onMove = (e: MouseEvent) => { cursorRef.current = { x: e.clientX, y: e.clientY } }
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) cursorRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onTouch, { passive: true })

    // Shuffle sound interval during scattering
    // Play immediately then on interval
    if (phaseRef.current === 'scattering') playShuffling()
    const shuffleInterval = setInterval(() => {
      if (phaseRef.current === 'scattering') playShuffling()
    }, 600)

    const cx0 = W / 2
    const cy0 = H / 2

    const tick = () => {
      ctx.clearRect(0, 0, W, H)

      // Slightly tinted felt background already provided by parent div
      const cx = cursorRef.current.x
      const cy = cursorRef.current.y
      const collecting = phaseRef.current === 'collecting' || phaseRef.current === 'dealing'

      for (const p of particlesRef.current) {
        if (collecting) {
          const dx = cx0 - p.x
          const dy = cy0 - p.y
          const d = Math.sqrt(dx * dx + dy * dy) + 0.1
          p.vx += (dx / d) * 1.4
          p.vy += (dy / d) * 1.4
          p.vx *= 0.86
          p.vy *= 0.86
          p.rotV *= 0.82
        } else {
          const dx = p.x - cx
          const dy = p.y - cy
          const d = Math.sqrt(dx * dx + dy * dy) + 0.1
          if (d < REPULSION_RADIUS) {
            const force = ((REPULSION_RADIUS - d) / REPULSION_RADIUS) * MAX_FORCE
            p.vx += (dx / d) * force
            p.vy += (dy / d) * force
          }
          p.vx *= 0.97
          p.vy *= 0.97
          if (p.x < TILE_W / 2)     p.vx = Math.abs(p.vx) * 0.6
          if (p.x > W - TILE_W / 2) p.vx = -Math.abs(p.vx) * 0.6
          if (p.y < TILE_H / 2)     p.vy = Math.abs(p.vy) * 0.6
          if (p.y > H - TILE_H / 2) p.vy = -Math.abs(p.vy) * 0.6
        }

        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotV

        // ── Draw a blank ivory tile ──────────────────────────────────────
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)

        const hw = TILE_W / 2
        const hh = TILE_H / 2

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.45)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 4

        // Ivory body
        ctx.fillStyle = '#f0eadb'
        roundedRect(ctx, -hw, -hh, TILE_W, TILE_H, 5)
        ctx.fill()

        // Reset shadow before borders
        ctx.shadowColor = 'transparent'

        // Outer border
        ctx.strokeStyle = '#c8b896'
        ctx.lineWidth = 1.5
        roundedRect(ctx, -hw, -hh, TILE_W, TILE_H, 5)
        ctx.stroke()

        // Inner inset border — classic tile look
        ctx.strokeStyle = 'rgba(160,130,90,0.35)'
        ctx.lineWidth = 1
        roundedRect(ctx, -hw + 4, -hh + 4, TILE_W - 8, TILE_H - 8, 3)
        ctx.stroke()

        // Subtle diagonal sheen on upper-left
        const sheen = ctx.createLinearGradient(-hw, -hh, hw * 0.4, hh * 0.4)
        sheen.addColorStop(0, 'rgba(255,255,255,0.22)')
        sheen.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = sheen
        roundedRect(ctx, -hw, -hh, TILE_W, TILE_H, 5)
        ctx.fill()

        ctx.restore()
      }

      // Cursor glow
      if (!collecting && cx > 0) {
        ctx.save()
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55)
        glow.addColorStop(0, 'rgba(255,230,120,0.28)')
        glow.addColorStop(1, 'rgba(255,230,120,0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(cx, cy, 55, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      clearInterval(shuffleInterval)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
    }
  }, [])

  if (shufflePhase === 'inactive' || shufflePhase === 'complete') return null

  const collecting = shufflePhase === 'collecting' || shufflePhase === 'dealing'

  return (
    <div className="fixed inset-0 z-50 bg-table-felt overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {!collecting ? (
            <motion.div
              key="scatter"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="text-center"
            >
              <h1 className="text-7xl font-bold text-yellow-400 drop-shadow-[0_2px_16px_rgba(255,200,0,0.7)] mb-4">
                胡了
              </h1>
              <p className="text-white/90 text-xl bg-black/35 px-7 py-2.5 rounded-full backdrop-blur-sm font-semibold">
                Move your cursor to wash the tiles
              </p>
              <p className="text-white/45 text-sm mt-2 tracking-widest">洗　牌</p>
            </motion.div>
          ) : (
            <motion.div
              key="collect"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <p className="text-white/80 text-2xl bg-black/40 px-10 py-3 rounded-full backdrop-blur-sm font-semibold tracking-wide">
                {shufflePhase === 'dealing' ? '發牌  Dealing…' : '收牌  Gathering…'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
