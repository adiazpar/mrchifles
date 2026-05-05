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
  isUnderlay: boolean
  /** Animate in from the right when this layer first mounts. */
  animateIn: boolean
  /** When true, animate out to the right and fire onExitComplete when done. */
  animateOut: boolean
  /** Drag-to-peel enabled. Should be true only for top non-root layers. */
  peelable: boolean
  /** Shared MotionValue (0..1). 0 = fully open. 1 = fully peeled away. */
  peelProgress: MotionValue<number>
  onPeelDismiss: () => void
  onExitComplete?: () => void
  onEntered?: () => void
  ariaLabel: string
  children: React.ReactNode
  reducedMotion: boolean
}

const OFFSCREEN_FALLBACK = 1500
function offscreenRight(): number {
  return typeof window !== 'undefined' ? window.innerWidth : OFFSCREEN_FALLBACK
}

const DISMISS_OFFSET_FRACTION = 0.5
const DISMISS_VELOCITY = 800
const DISMISS_VELOCITY_MIN_OFFSET_FRACTION = 0.2

export function Layer({
  index, isTop, isUnderlay,
  animateIn, animateOut, peelable,
  peelProgress, onPeelDismiss, onExitComplete, onEntered,
  ariaLabel, children, reducedMotion,
}: LayerProps) {
  const x = useMotionValue<number>(animateIn ? offscreenRight() : 0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const wasTopRef = useRef(false)
  const dragViewportWidthRef = useRef(0)
  // Guards against running the exit animation twice (once from drag-dismiss,
  // again when animateOut prop catches up via stack-sync).
  const exitStartedRef = useRef(false)
  // Guards against firing onExitComplete twice.
  const exitCompleteFiredRef = useRef(false)

  const fireExitComplete = () => {
    if (exitCompleteFiredRef.current) return
    exitCompleteFiredRef.current = true
    onExitComplete?.()
  }

  // Open animation on mount.
  useEffect(() => {
    if (!animateIn || reducedMotion) {
      x.set(0)
      onEntered?.()
      return
    }
    const controls = animate(x, 0, SLIDE_TRANSITION)
    controls.then(() => onEntered?.())
    return () => controls.stop()
    // Mount-only effect; props captured at mount-time intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Exit animation when animateOut becomes true (driven by stack-sync).
  // If drag-dismiss already started the exit, this is a no-op.
  useEffect(() => {
    if (!animateOut) return
    if (exitStartedRef.current) {
      // Drag already started exit. Just ensure complete callback fires
      // when the running animation finishes (it has its own .then).
      return
    }
    exitStartedRef.current = true
    if (reducedMotion) {
      fireExitComplete()
      return
    }
    const controls = animate(x, offscreenRight(), SLIDE_TRANSITION)
    controls.then(() => fireExitComplete())
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateOut])

  // While this layer is on top, drive peelProgress from x. Subscribe and
  // immediately publish current x — `change` fires only on subsequent
  // updates, so the initial value would otherwise miss the underlay.
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

  // Underlay parallax, derived from peelProgress.
  const underlayX = useTransform(
    peelProgress,
    (p) => `${PARALLAX_OPEN_PERCENT * (1 - p)}%`,
  )

  // Focus capture / restore.
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

  // Escape-to-dismiss while top and not exiting.
  useEffect(() => {
    if (!isTop || animateOut) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onPeelDismiss()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isTop, animateOut, onPeelDismiss])

  // Scroll-lock when not top (so parallax-shifted underlay can't ghost-scroll).
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
    if (reducedMotion || !isTop || animateOut) return
    const w =
      dragViewportWidthRef.current ||
      (typeof window !== 'undefined' ? window.innerWidth : 0)
    const offsetFrac = w > 0 ? info.offset.x / w : 0
    const dismissed =
      offsetFrac >= DISMISS_OFFSET_FRACTION ||
      (offsetFrac >= DISMISS_VELOCITY_MIN_OFFSET_FRACTION &&
        info.velocity.x >= DISMISS_VELOCITY)
    if (dismissed) {
      // Start exit animation immediately for instant visual response. The
      // stack-sync (via onPeelDismiss → router.back) will follow up with
      // animateOut=true, which our effect will see exitStartedRef and skip.
      exitStartedRef.current = true
      const controls = animate(x, offscreenRight(), SLIDE_TRANSITION)
      controls.then(() => fireExitComplete())
      // Sync URL in parallel — pathname update will mark this entry
      // as exiting in the parent stack, but the animation we just
      // started will finish first and fire onExitComplete.
      onPeelDismiss()
    } else {
      animate(x, 0, { ...SLIDE_TRANSITION, duration: 0.2 })
    }
  }

  const dragEnabled = peelable && isTop && !animateOut && !reducedMotion
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
        boxShadow: isTop && index > 0
          ? '-12px 0 24px -8px rgba(0, 0, 0, 0.18)'
          : undefined,
        willChange: 'transform',
      }}
      drag={dragEnabled ? 'x' : false}
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
