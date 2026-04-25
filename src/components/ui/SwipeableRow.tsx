'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform, animate, type MotionValue, type PanInfo } from 'framer-motion'
import { useHorizontalSwipeIntent } from '@/hooks/useHorizontalSwipeIntent'

export type SwipeActionVariant = 'neutral' | 'info' | 'success' | 'pos' | 'warning' | 'danger'

export interface SwipeAction {
  /** Icon node rendered above the label. */
  icon: ReactNode
  /** Short label rendered below the icon. Also used as the button's accessible name. */
  label: string
  /** Visual treatment. `info` = brand/sky-blue, `success` = green, `pos` = sales orange, `warning` = amber, `danger` = red. Default: `neutral`. */
  variant?: SwipeActionVariant
  /** When true, the button is visually muted and non-interactive (tap does nothing). */
  disabled?: boolean
  /** Called when the user taps the action. The row closes automatically just before this fires. */
  onClick: () => void
}

interface SwipeableRowProps {
  /** Actions revealed when the user swipes the row to the left. Rendered in order, left to right. */
  actions: SwipeAction[]
  children: ReactNode
  /** Optional extra className on the outer wrapper. */
  className?: string
}

const ACTION_WIDTH = 72
const SWIPE_VELOCITY_THRESHOLD = 400
// Push each button's scale-in ramp this many px further into the drag.
// Without this, the rightmost button starts scaling the instant the row
// moves; with it, the row slides a bit before the first button appears,
// then each button still lands at scale(1) by the time its slot is
// fully exposed (the ramp just gets compressed, not shifted past it).
const APPEAR_DELAY = 40
// Tween with iOS-style cubic bezier (matches TabContainer's tab slide).
// Swapped in for a spring to avoid the underdamped overshoot + frame-by-
// frame JS cost that read as jitter on iOS PWA when the row snaps back
// after a release. Tween math is cheaper and monotonic — no oscillation.
const RELEASE_TRANSITION = {
  type: 'tween' as const,
  duration: 0.28,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
}

/**
 * Cross-row registry so only one row is open at a time (Mail.app behavior).
 * Each mounted SwipeableRow registers a closer; opening a row calls every other closer.
 */
const openCallbacks = new Set<() => void>()
function closeAllExcept(self: () => void) {
  openCallbacks.forEach((cb) => {
    if (cb !== self) cb()
  })
}


/**
 * SwipeableRow — swipe-left to reveal action buttons (Mail.app style).
 *
 * Architecture: the action layer sits BEHIND the draggable row (absolute, anchored
 * to the right edge). Each button's `opacity` and `scale` are driven per-frame by
 * `useTransform(x, ...)` over the slot's exposure range — so every button scale-fades
 * in as its slot is uncovered, tracking the finger rather than firing on a threshold.
 * The useTransform-driven buttons are supposed to land at scale/opacity 0 once the
 * row is back at x=0, but the tap-feedback scale(0.94) composing with the reveal
 * transform can leave a visible ghost on close, so the row layer carries an opaque
 * surface-colored background (`.swipeable-row .list-item-clickable` in
 * interactive.css) matching the enclosing `.card`, to hide any such artifact once
 * snapped back.
 *
 * `opacity` and `scale` are both composited on modern engines, so the per-frame
 * style writes (2 per button per frame during motion) stay on the compositor and
 * don't trigger layout/paint.
 *
 * Buttons render via the shared `.icon-stack-btn` pattern (also used by the barcode-tab
 * Scan / Generate / Print row): a circular icon over a small label. The icon is tinted
 * by variant (brand/success/pos/warning/error/text-primary); labels always render in
 * `--color-text-secondary` so the semantics read from the icon, not the whole button.
 *
 * Other behavior: tap-to-close, tap-outside-to-close, and one-row-open-at-a-time. See the
 * tab-system-style guide doc for details.
 */
export function SwipeableRow({ actions, children, className }: SwipeableRowProps) {
  const revealWidth = actions.length * ACTION_WIDTH
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)

  const close = useCallback(() => {
    setIsOpen(false)
    animate(x, 0, RELEASE_TRANSITION)
  }, [x])

  const open = useCallback(() => {
    setIsOpen(true)
    animate(x, -revealWidth, RELEASE_TRANSITION)
    closeAllExcept(close)
  }, [x, revealWidth, close])

  useEffect(() => {
    openCallbacks.add(close)
    return () => {
      openCallbacks.delete(close)
    }
  }, [close])

  // Close on tap-outside while open.
  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen, close])

  // iOS touch-intent disambiguation so a slightly-diagonal swipe
  // doesn't let iOS commit to vertical scroll before framer-motion
  // locks the drag axis. See useHorizontalSwipeIntent for the full
  // rationale.
  useHorizontalSwipeIntent(containerRef)

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const { offset, velocity } = info
    const passedHalf = offset.x < -revealWidth / 2
    const fastEnough = velocity.x < -SWIPE_VELOCITY_THRESHOLD
    if (passedHalf || fastEnough) open()
    else close()
  }

  // When the row is open, a tap on its content should close the row
  // instead of activating the inner onClick (e.g. "open detail modal").
  //
  // Two things to suppress for this gesture:
  //   1. The synthesized `click` that follows pointerdown — stopping
  //      pointerdown doesn't cancel it, so we latch a ref and consume
  //      click in a separate capture handler.
  //   2. The native `:hover` / `:active` pseudo-classes on the inner
  //      `.list-item-clickable`. These are triggered by the browser
  //      from raw pointer/touch input, independent of React, so
  //      `stopPropagation` on the synthetic event does nothing. We
  //      imperatively add a class on the draggable element that sets
  //      `pointer-events: none` on its children — the inner element
  //      is no longer a pointer target so the browser never enters
  //      its `:active` state. The motion.div itself still receives
  //      pointer events so drag stays functional.
  //
  // The 400ms timeout is a safety net for edge cases where a click
  // never fires (e.g. the gesture turned into a scroll) — without it
  // the latch/class could leak onto an unrelated future tap.
  const suppressNextClickRef = useRef(false)
  const rowElRef = useRef<HTMLDivElement>(null)

  const handleRowPointerDownCapture = (e: React.PointerEvent) => {
    if (isOpen) {
      e.stopPropagation()
      e.preventDefault()
      suppressNextClickRef.current = true
      const el = rowElRef.current
      if (el) el.classList.add('swipeable-row--suppress-interactive')
      setTimeout(() => {
        suppressNextClickRef.current = false
        if (el) el.classList.remove('swipeable-row--suppress-interactive')
      }, 400)
      close()
    }
  }

  const handleRowClickCapture = (e: React.MouseEvent) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      e.stopPropagation()
      e.preventDefault()
    }
  }

  return (
    <div
      ref={containerRef}
      className={`swipeable-row relative overflow-hidden ${className ?? ''}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Action layer — sits behind the row, pinned to the right edge of the
          container. Each button's opacity/scale is driven by `useTransform(x)`
          over the range in which its slot is being exposed, so every button
          scale-fades in as its slot emerges. The buttons are supposed to be
          at scale(0)/opacity(0) when x=0, but in practice the tap-feedback
          scale(0.94) composing with the reveal transform can leave a ghost
          mid-close; the row layer above carries an opaque surface-colored bg
          (see `.swipeable-row .list-item-clickable` in interactive.css, set
          to match the enclosing `.card`) to cover any such artifact once the
          row has snapped back. */}
      <div
        className="absolute inset-y-0 right-0 flex pointer-events-auto"
        aria-hidden={!isOpen}
      >
        {actions.map((action, i) => (
          <SwipeActionButton
            key={i}
            action={action}
            // Slot index = position from the right edge. The rightmost button
            // (i = length - 1) is exposed first as the row slides left, so it
            // gets slot 0; the leftmost button gets the last slot.
            slotIndex={actions.length - 1 - i}
            x={x}
            onTap={() => {
              if (action.disabled) return
              close()
              action.onClick()
            }}
          />
        ))}
      </div>

      {/* Row layer — draggable, full container width, transparent so the consumer's
          hover/active styles render unobscured. Sits on top of the action layer;
          since the action buttons are at scale(0) at rest, nothing shows through. */}
      <motion.div
        ref={rowElRef}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -revealWidth, right: 0 }}
        dragElastic={0.1}
        // `willChange: transform` is a hint that promotes this element
        // to its own composite layer on iOS Safari (especially inside a
        // standalone PWA), where the compositor otherwise re-evaluates
        // layer promotion frame-by-frame and causes visible jitter
        // during drag. Cheap for the ~dozens of rows we render.
        style={{ x, willChange: 'transform' }}
        onDragEnd={handleDragEnd}
        onPointerDownCapture={handleRowPointerDownCapture}
        onClickCapture={handleRowClickCapture}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  )
}

interface SwipeActionButtonProps {
  action: SwipeAction
  /** Position from the right edge: 0 = rightmost (revealed first), N-1 = leftmost (revealed last). */
  slotIndex: number
  x: MotionValue<number>
  onTap: () => void
}

function SwipeActionButton({ action, slotIndex, x, onTap }: SwipeActionButtonProps) {
  // Slot N is fully exposed at x = -(N+1)*W. Button reaches scale(1) there.
  // The "just starting to appear" end is pushed further into the drag by
  // APPEAR_DELAY, so the row has to slide that much past the slot's normal
  // start before the button begins scaling up.
  const fullyVisibleAt = -(slotIndex + 1) * ACTION_WIDTH
  const startAppearingAt = -slotIndex * ACTION_WIDTH - APPEAR_DELAY
  const opacity = useTransform(x, [fullyVisibleAt, startAppearingAt], [1, 0], { clamp: true })
  const scale = useTransform(x, [fullyVisibleAt, startAppearingAt], [1, 0], { clamp: true })

  // The reveal scale/opacity live on a wrapper so the inner <button>'s CSS
  // transform (scale(0.94) on [data-pressed='true'], applied by the global
  // tap-feedback module) isn't overwritten by framer-motion's inline style.
  // Nested transforms compose multiplicatively.
  return (
    <div className="swipeable-row-slot" style={{ width: ACTION_WIDTH }}>
      <motion.div style={{ opacity, scale }}>
        <button
          type="button"
          aria-label={action.label}
          onClick={onTap}
          disabled={action.disabled}
          className={`icon-stack-btn icon-stack-btn--${action.variant ?? 'neutral'}`}
        >
          <span className="icon-stack-btn__icon">{action.icon}</span>
          <span className="icon-stack-btn__label">{action.label}</span>
        </button>
      </motion.div>
    </div>
  )
}
