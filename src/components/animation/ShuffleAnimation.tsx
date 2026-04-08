import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore, type ShufflePhase } from '../../store/uiStore'
import { playShuffling } from '../../utils/sounds'
import { TILE_BLANK_IMAGE } from '../../constants/tileImages'

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

const TILE_W = 52
const TILE_H = 72
const NUM_TILES = 80
const REPULSION_RADIUS = 140
const MAX_FORCE = 12

function createParticles(W: number, H: number): Particle[] {
  const particles: Particle[] = []
  // Spawn in a central cluster (~35% of screen dimensions) so tiles start together
  const spawnW = W * 0.35
  const spawnH = H * 0.35
  const cx = W / 2
  const cy = H / 2
  for (let i = 0; i < NUM_TILES; i++) {
    particles.push({
      id: i,
      x: cx + (Math.random() - 0.5) * spawnW,
      y: cy + (Math.random() - 0.5) * spawnH,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      rotation: (Math.random() - 0.5) * 50,
      rotV: (Math.random() - 0.5) * 1,
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

// ─── Canvas animation — only mounts when shuffle is active ───────────────────
// Separated so that canvasRef is always set when useEffect runs

function ShuffleCanvas({ shufflePhase }: { shufflePhase: ShufflePhase }) {
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

    // Load blank tile image
    const blankImg = new Image()
    let imageReady = false
    blankImg.onload = () => { imageReady = true }
    blankImg.onerror = () => { imageReady = false }
    if (TILE_BLANK_IMAGE) {
      blankImg.src = TILE_BLANK_IMAGE
    }

    const onMove = (e: MouseEvent) => { cursorRef.current = { x: e.clientX, y: e.clientY } }
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) cursorRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onTouch, { passive: true })

    // Shuffle sound — only during scattering phase
    if (phaseRef.current === 'scattering') playShuffling()
    const shuffleInterval = setInterval(() => {
      if (phaseRef.current === 'scattering') playShuffling()
    }, 1100)

    const cx0 = W / 2
    const cy0 = H / 2

    const tick = () => {
      // Fill background explicitly — don't rely on CSS transparency which
      // can render as white in some GPU compositing environments
      ctx.fillStyle = '#1b4332'
      ctx.fillRect(0, 0, W, H)

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
            const strength = ((REPULSION_RADIUS - d) / REPULSION_RADIUS)
            // Soft quadratic falloff so tiles near the edge barely move
            const radialForce  = strength * strength * MAX_FORCE * 0.4
            const tangForce    = strength * MAX_FORCE * 0.75
            // Alternate swirl direction per tile — chaotic mixing, not a whirlpool
            const swirl = (p.id % 2 === 0) ? 1 : -1
            p.vx += (dx / d) * radialForce + (-dy / d) * tangForce * swirl
            p.vy += (dy / d) * radialForce + ( dx / d) * tangForce * swirl
          }
          p.vx *= 0.90
          p.vy *= 0.90
          p.rotV *= 0.75
          if (p.x < TILE_W / 2)     p.vx = Math.abs(p.vx) * 0.5
          if (p.x > W - TILE_W / 2) p.vx = -Math.abs(p.vx) * 0.5
          if (p.y < TILE_H / 2)     p.vy = Math.abs(p.vy) * 0.5
          if (p.y > H - TILE_H / 2) p.vy = -Math.abs(p.vy) * 0.5
        }

        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotV

        // Draw tile
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)

        const hw = TILE_W / 2
        const hh = TILE_H / 2

        ctx.shadowColor = 'rgba(0,0,0,0.35)'
        ctx.shadowBlur = 8
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 3

        if (imageReady) {
          ctx.drawImage(blankImg, -hw, -hh, TILE_W, TILE_H)
        } else {
          // Fallback: plain ivory tile shape
          ctx.fillStyle = '#f0eadb'
          roundedRect(ctx, -hw, -hh, TILE_W, TILE_H, 5)
          ctx.fill()
          ctx.shadowColor = 'transparent'
          ctx.strokeStyle = '#c8b896'
          ctx.lineWidth = 1.5
          roundedRect(ctx, -hw, -hh, TILE_W, TILE_H, 5)
          ctx.stroke()
        }

        ctx.shadowColor = 'transparent'
        ctx.restore()
      }

      // Cursor glow during scatter
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

// ─── Outer wrapper — only mounts ShuffleCanvas when active ───────────────────

export function ShuffleAnimation({ onComplete }: { onComplete: () => void }) {
  const { shufflePhase } = useUIStore()

  if (shufflePhase === 'inactive' || shufflePhase === 'complete') return null

  return <ShuffleCanvas shufflePhase={shufflePhase} />
}
