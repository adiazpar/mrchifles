'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'

const SLIDE_TRANSITION = {
  type: 'tween' as const,
  duration: 0.28,
  ease: [0.32, 0.72, 0, 1] as const,
}

const PARALLAX_OPEN_PERCENT = -30

interface RouteOverlayProps {
  isOpen: boolean
  onPeelDismiss: () => void
  underlayRef?: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  ariaLabel: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function RouteOverlay({
  isOpen,
  onPeelDismiss,
  underlayRef,
  children,
  ariaLabel,
}: RouteOverlayProps) {
  const reducedMotion = prefersReducedMotion()
  const triggerRef = useRef<HTMLElement | null>(null)
  const wasOpenRef = useRef(false)

  // Capture trigger element on open; restore focus on close.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const active = document.activeElement
      if (active instanceof HTMLElement) triggerRef.current = active
      wasOpenRef.current = true
    } else if (!isOpen && wasOpenRef.current) {
      const t = triggerRef.current
      if (t && document.body.contains(t)) {
        t.focus()
      }
      triggerRef.current = null
      wasOpenRef.current = false
    }
  }, [isOpen])

  // Escape-to-close.
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onPeelDismiss()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onPeelDismiss])

  // Parallax on open/close (skipped when reduced motion).
  useEffect(() => {
    if (reducedMotion) return
    const el = underlayRef?.current
    if (!el) return
    if (isOpen) {
      el.style.transition = 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)'
      el.style.transform = `translateX(${PARALLAX_OPEN_PERCENT}%)`
    } else {
      el.style.transition = 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)'
      el.style.transform = 'translateX(0%)'
    }
  }, [isOpen, reducedMotion, underlayRef])

  // Lock underlay scroll while the overlay is open. Otherwise the parallax-
  // shifted sliver of underlay visible at the right edge during peel can
  // still receive scroll events, creating a perceived "ghost scroll".
  useEffect(() => {
    const el = underlayRef?.current
    if (!el) return
    if (isOpen) {
      const prevOverflow = el.style.overflow
      el.style.overflow = 'hidden'
      return () => {
        el.style.overflow = prevOverflow
      }
    }
  }, [isOpen, underlayRef])

  const handleDrag = (_: PointerEvent, info: PanInfo) => {
    if (reducedMotion) return
    const el = underlayRef?.current
    if (!el) return
    const x = Math.max(0, info.offset.x)
    const progress = Math.min(x / window.innerWidth, 1)
    const percent = PARALLAX_OPEN_PERCENT + progress * Math.abs(PARALLAX_OPEN_PERCENT)
    el.style.transition = 'none'
    el.style.transform = `translateX(${percent}%)`
  }

  const handleDragEnd = (_: PointerEvent, info: PanInfo) => {
    if (reducedMotion) return
    const dismissed =
      info.offset.x > window.innerWidth * 0.4 || info.velocity.x > 500
    if (dismissed) {
      onPeelDismiss()
    } else {
      // Below threshold — restore the underlay parallax to the fully-open
      // position. The overlay itself springs back to x:0 automatically via
      // framer-motion's built-in drag-constraint behavior.
      const el = underlayRef?.current
      if (el) {
        el.style.transition = 'transform 200ms cubic-bezier(0.32, 0.72, 0, 1)'
        el.style.transform = `translateX(${PARALLAX_OPEN_PERCENT}%)`
      }
    }
  }

  // Left-edge shadow so a same-color overlay sliding over a same-color
  // underlay is still visually distinguishable. Without this, an empty
  // overlay sliding in (before its route content has resolved) looks
  // like nothing happened — same color over same color.
  const overlayShadow = '-12px 0 24px -8px rgba(0, 0, 0, 0.18)'

  return (
    <AnimatePresence initial={true}>
      {isOpen && (
        reducedMotion ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            className="fixed inset-0 z-[var(--z-overlay)] bg-bg-base overflow-y-auto overflow-x-hidden"
            tabIndex={-1}
          >
            {children}
          </div>
        ) : (
          <motion.div
            key="route-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            tabIndex={-1}
            className="fixed inset-0 z-[var(--z-overlay)] bg-bg-base overflow-y-auto overflow-x-hidden"
            style={{ boxShadow: overlayShadow }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={SLIDE_TRANSITION}
            drag="x"
            dragConstraints={{ left: 0 }}
            dragElastic={{ left: 0.05, right: 1 }}
            dragDirectionLock
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          >
            {children}
          </motion.div>
        )
      )}
    </AnimatePresence>
  )
}
