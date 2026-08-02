'use client'

import { useEffect, useRef } from 'react'
import styles from './ConstellationBackground.module.css'

interface Star {
  x: number
  y: number
  r: number
  baseAlpha: number
  twinkleSpeed: number
  twinklePhase: number
  driftX: number
  driftY: number
}

interface Link {
  a: number
  b: number
  baseAlpha: number
}

const STARS = 110
const LINK_DIST = 140
const DRIFT = 16

export function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let stars: Star[] = []
    let links: Link[] = []
    let rafId = 0

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const build = () => {
      stars = Array.from({ length: STARS }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.7,
        baseAlpha: 0.15 + Math.random() * 0.5,
        twinkleSpeed: 0.4 + Math.random() * 1.6,
        twinklePhase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * DRIFT,
        driftY: (Math.random() - 0.5) * DRIFT,
      }))

      links = []
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x
          const dy = stars[i].y - stars[j].y
          const dist = Math.hypot(dx, dy)
          if (dist < LINK_DIST) {
            links.push({ a: i, b: j, baseAlpha: (1 - dist / LINK_DIST) * 0.18 })
          }
        }
      }
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height)
      const t = time / 1000

      const xs = stars.map((s, i) => s.x + s.driftX * t + Math.sin(t * 0.5 + i * 0.35) * 16)
      const ys = stars.map((s, i) => s.y + s.driftY * t + Math.cos(t * 0.45 + i * 0.4) * 16)

      for (const link of links) {
        const x1 = xs[link.a]
        const y1 = ys[link.a]
        const x2 = xs[link.b]
        const y2 = ys[link.b]
        const pulse = 0.65 + 0.35 * Math.sin(t * 0.5 + (link.a + link.b))
        ctx.strokeStyle = `rgba(64, 165, 190, ${link.baseAlpha * pulse})`
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i]
        const x = xs[i]
        const y = ys[i]
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase)
        const alpha = s.baseAlpha * (0.35 + 0.65 * twinkle)
        ctx.fillStyle = `rgba(31, 92, 110, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      rafId = requestAnimationFrame(draw)
    }

    resize()
    build()
    if (prefersReducedMotion) {
      draw(1000)
      cancelAnimationFrame(rafId)
    } else {
      draw(0)
    }

    const onResize = () => {
      resize()
      build()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}
