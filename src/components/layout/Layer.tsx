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

export function Layer({
  index, isTop, isInitialMount, exitDirection,
  peelProgress, isUnderlay, onPeelDismiss, ariaLabel, children, reducedMotion,
}: LayerProps) {
  // The layer's own x. We start offscreen-right unless this is the
  // initial-mount root (depth 0 on first paint after page load), in which
  // case it sits at 0 with no animation.
  const x = useMotionValue<number | string>(isInitialMount ? 0 : '100%')

  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const wasTopRef = useRef(false)

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
      const numeric = typeof v === 'number' ? v : (v === '0' ? 0 : (v === '100%' ? w : 0))
      const progress = Math.max(0, Math.min(1, numeric / w))
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
      return () => { el.style.overflow = prev }
    }
  }, [isTop])

  const handleDragEnd = (_: PointerEvent, info: PanInfo) => {
    if (reducedMotion || !isTop) return
    const dismissed = info.offset.x > window.innerWidth * 0.4 || info.velocity.x > 500
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

  // Exit target. Root-swap: 'left' (the previous root has been replaced).
  const exitX = exitDirection === 'left' ? '-100%' : '100%'

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal={isTop ? 'true' : 'false'}
      aria-label={ariaLabel}
      tabIndex={-1}
      className="layer fixed inset-0 bg-bg-base overflow-y-auto overflow-x-hidden"
      style={{
        zIndex: `calc(var(--z-overlay) + ${index})` as unknown as number,
        x: styleX,
        boxShadow: isTop && index > 0 ? '-12px 0 24px -8px rgba(0, 0, 0, 0.18)' : undefined,
        willChange: 'transform',
      }}
      exit={reducedMotion ? undefined : { x: exitX, transition: SLIDE_TRANSITION }}
      drag={peelable ? 'x' : false}
      dragConstraints={{ left: 0 }}
      dragElastic={{ left: 0.05, right: 1 }}
      dragDirectionLock
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  )
}
