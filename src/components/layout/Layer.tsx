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
  /** True iff this layer is the immediate underlay (idx === layers.length - 2). */
  isUnderlay: boolean
  /** Skip the slide-in animation. True for: first paint, layers kept-mounted, non-top newly-mounted layers. */
  skipOpenAnimation: boolean
  /** Shared MotionValue (0..1). 0 = fully open. 1 = fully peeled away. */
  peelProgress: MotionValue<number>
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

// Drag-to-peel thresholds. iOS-style: dismiss past a meaningful offset
// OR a deliberate flick. Pure offset would force users to drag too far
// for "fast back"; pure velocity would misfire on accidental release
// jitter. The combination is more deliberate than the previous values
// (which dismissed on any release with velocity > 500 px/s, easy to
// misfire on slow drags).
const DISMISS_OFFSET_FRACTION = 0.5  // 50% of viewport width
const DISMISS_VELOCITY = 800         // px/s — a clear flick, not a slip
const DISMISS_VELOCITY_MIN_OFFSET_FRACTION = 0.2  // velocity-only dismiss requires at least this much offset

export function Layer({
  index, isTop, isUnderlay, skipOpenAnimation,
  peelProgress, onPeelDismiss, ariaLabel, children, reducedMotion,
}: LayerProps) {
  // The layer's own x is purely numeric (pixels) so the imperative
  // `animate(x, 0)` and the drag handler write to a single value type —
  // mixing units (e.g. '100%') silently snaps instead of animating.
  const x = useMotionValue<number>(skipOpenAnimation ? 0 : offscreenRight())

  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const wasTopRef = useRef(false)
  // Snapshot viewport width at drag start so a mid-drag rotation/resize
  // doesn't silently shift the dismiss threshold.
  const dragViewportWidthRef = useRef(0)

  // Open animation — imperative on the same MotionValue used by drag.
  // Single source of truth means parallax stays consistent in all phases.
  // Mount-only effect (deps intentionally empty); skipOpenAnimation is
  // captured at mount time and shouldn't change after.
  useEffect(() => {
    if (skipOpenAnimation || reducedMotion) {
      x.set(0)
      return
    }
    const controls = animate(x, 0, SLIDE_TRANSITION)
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // While this layer is on top, drive peelProgress from x. Subscribe on
  // becoming top, AND immediately publish the current x so the underlay's
  // initial parallax matches reality before the first `change` event.
  // (`change` fires only on subsequent updates, not the initial value.)
  useEffect(() => {
    if (!isTop) return
    const w = typeof window !== 'undefined' ? window.innerWidth : 1
    peelProgress.set(Math.max(0, Math.min(1, x.get() / w)))
    const unsub = x.on('change', (v) => {
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

  // Scroll-lock when not on top so parallax-shifted underlay can't
  // ghost-scroll. We do NOT reset peelProgress here — the new top
  // layer publishes its own current x in its top-effect above, which
  // is the authoritative source for the underlay parallax.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (!isTop) {
      const prev = el.style.overflow
      el.style.overflow = 'hidden'
      return () => { el.style.overflow = prev }
    }
  }, [isTop])

  const handleDragStart = () => {
    dragViewportWidthRef.current = typeof window !== 'undefined' ? window.innerWidth : 0
  }

  const handleDragEnd = (_: PointerEvent, info: PanInfo) => {
    if (reducedMotion || !isTop) return
    const w = dragViewportWidthRef.current || (typeof window !== 'undefined' ? window.innerWidth : 0)
    const offsetFrac = w > 0 ? info.offset.x / w : 0
    const dismissed =
      offsetFrac >= DISMISS_OFFSET_FRACTION ||
      (offsetFrac >= DISMISS_VELOCITY_MIN_OFFSET_FRACTION && info.velocity.x >= DISMISS_VELOCITY)
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
      exit={reducedMotion ? undefined : { x: offscreenRight(), transition: SLIDE_TRANSITION }}
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
