'use client'

import { useEffect, useRef } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type MotionValue,
  type PanInfo,
} from 'framer-motion'

export const SLIDE_TRANSITION = {
  type: 'tween' as const,
  duration: 0.28,
  ease: [0.32, 0.72, 0, 1] as const,
}
export const PARALLAX_OPEN_PERCENT = -30

interface LayerProps {
  index: number
  isTop: boolean
  isInitialMount: boolean
  /** Direction the layer slides OUT to on exit. 'right' for normal pop; 'left' for root-swap (replaced by a different root). */
  exitDirection: 'left' | 'right'
  /** Shared MotionValue (0..1). 0 = fully open. 1 = fully peeled away. */
  peelProgress: MotionValue<number>
  /** True iff this layer is the immediate underlay (idx === layers.length - 2). */
  isUnderlay: boolean
  onPeelDismiss: () => void
  ariaLabel: string
  children: React.ReactNode
  reducedMotion: boolean
}

// Pixel value treated as "definitely offscreen" — used as a non-window
// fallback during SSR so the type stays numeric.
const OFFSCREEN_FALLBACK = 1500

function offscreenRight(): number {
  return typeof window !== 'undefined' ? window.innerWidth : OFFSCREEN_FALLBACK
}

export function Layer({
  index, isTop, isInitialMount, exitDirection,
  peelProgress, isUnderlay, onPeelDismiss, ariaLabel, children, reducedMotion,
}: LayerProps) {
  // The layer's own x is purely numeric (pixels) so the imperative
  // `animate(x, 0)` and the drag handler write to a single value type —
  // mixing units (e.g. '100%') silently snaps instead of animating.
  const x = useMotionValue<number>(isInitialMount ? 0 : offscreenRight())

  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const wasTopRef = useRef(false)
  // Snapshot viewport width at drag start so a mid-drag rotation/resize
  // doesn't silently shift the dismiss threshold.
  const dragViewportWidthRef = useRef(0)

  // Open animation — imperative on the same MotionValue used by drag.
  // Single source of truth means parallax stays consistent in all phases.
  useEffect(() => {
    if (isInitialMount || reducedMotion) {
      x.set(0)
      return
    }
    const controls = animate(x, 0, SLIDE_TRANSITION)
    return () => controls.stop()
    // x is stable (useMotionValue); intentionally only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // While this layer is on top, drive peelProgress from x.
  useEffect(() => {
    if (!isTop) return
    const unsub = x.on('change', (v) => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1
      const progress = Math.max(0, Math.min(1, v / w))
      peelProgress.set(progress)
    })
    return unsub
  }, [isTop, x, peelProgress])

  // Underlay reads peelProgress to compute its parallax x.
  const underlayX = useTransform(peelProgress, (p) => `${PARALLAX_OPEN_PERCENT * (1 - p)}%`)

  // Focus capture and restore.
  useEffect(() => {
    if (isTop && !wasTopRef.current) {
      const active = document.activeElement
      if (active instanceof HTMLElement) triggerRef.current = active
      containerRef.current?.focus()
      wasTopRef.current = true
    } else if (!isTop && wasTopRef.current) {
      const t = triggerRef.current
      if (t && document.body.contains(t)) t.focus()
      triggerRef.current = null
      wasTopRef.current = false
    }
  }, [isTop])

  // Escape-to-dismiss while top.
  useEffect(() => {
    if (!isTop) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onPeelDismiss()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isTop, onPeelDismiss])

  // Scroll-lock when not on top so parallax-shifted underlay can't ghost-scroll.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (!isTop) {
      const prev = el.style.overflow
      el.style.overflow = 'hidden'
      // Reset shared peel progress so the new top layer's open animation
      // doesn't briefly inherit our last-written value.
      peelProgress.set(0)
      return () => { el.style.overflow = prev }
    }
  }, [isTop, peelProgress])

  const handleDragStart = () => {
    dragViewportWidthRef.current = typeof window !== 'undefined' ? window.innerWidth : 0
  }

  const handleDragEnd = (_: PointerEvent, info: PanInfo) => {
    if (reducedMotion || !isTop) return
    const w = dragViewportWidthRef.current || (typeof window !== 'undefined' ? window.innerWidth : 0)
    const dismissed = info.offset.x > w * 0.4 || info.velocity.x > 500
    if (dismissed) {
      onPeelDismiss()
    } else {
      animate(x, 0, { ...SLIDE_TRANSITION, duration: 0.2 })
    }
  }

  // Drag-peel: only on top non-root layers; reduced-motion disables drag.
  const peelable = isTop && index > 0 && !reducedMotion

  // The layer's own transform: own x normally, parallax-driven x when underlay.
  const styleX = isUnderlay ? underlayX : x

  // Exit target — numeric pixels, not strings, so animate() resolves cleanly.
  const exitX = exitDirection === 'left' ? -offscreenRight() : offscreenRight()

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal={isTop ? 'true' : 'false'}
      aria-label={ariaLabel}
      tabIndex={-1}
      className="layer"
      style={{
        zIndex: `calc(var(--z-overlay) + ${index})`,
        x: styleX,
        boxShadow: isTop && index > 0 ? '-12px 0 24px -8px rgba(0, 0, 0, 0.18)' : undefined,
        willChange: 'transform',
      }}
      exit={reducedMotion ? undefined : { x: exitX, transition: SLIDE_TRANSITION }}
      drag={peelable ? 'x' : false}
      dragConstraints={{ left: 0 }}
      dragElastic={{ left: 0.05, right: 1 }}
      dragDirectionLock
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  )
}
