'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform, animate, type MotionValue, type PanInfo } from 'framer-motion'
import { useHorizontalSwipeIntent } from '@/hooks/useHorizontalSwipeIntent'

export type SwipeActionVariant = 'neutral' | 'info' | 'danger'

export interface SwipeAction {
  /** Icon node rendered above the label. */
  icon: ReactNode
  /** Short label rendered below the icon. Also used as the button's accessible name. */
  label: string
  /** Visual treatment. `info` = brand/sky-blue, `danger` = red. Default: `neutral`. */
  variant?: SwipeActionVariant
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

const ACTION_WIDTH = 88
const SWIPE_VELOCITY_THRESHOLD = 400
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

const variantClass: Record<SwipeActionVariant, string> = {
  neutral: 'text-text-primary',
  info: 'text-brand',
  danger: 'text-error',
}

/**
 * SwipeableRow — swipe-left to reveal action buttons (Mail.app style).
 *
 * Action buttons are not visually present until the user starts swiping. Each button's
 * opacity and scale are driven by the live drag offset via `useTransform`, so the buttons
 * scale-fade in progressively as their slot is exposed. Buttons have no background — they
 * are icon + label only, colored by variant (`neutral` = text-primary, `danger` = error red).
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
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Action layer — sits behind the row. Each button's opacity/scale is driven by the
          row's live drag offset, so they scale-fade in as their slot is revealed. */}
      <div className="absolute inset-y-0 right-0 flex pointer-events-auto" aria-hidden={!isOpen}>
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
              close()
              action.onClick()
            }}
          />
        ))}
      </div>

      {/* Row layer — draggable, sits on top of the action layer.
          Intentionally has no background or padding: the consumer's row content
          is responsible for being opaque so the action layer doesn't bleed through. */}
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
  // Each button reveals as its slot is exposed. Slot N spans from -N*W (just starting to
  // appear) to -(N+1)*W (fully visible). useTransform requires a monotonically-ascending
  // input range, so we use [-(N+1)*W, -N*W] ascending and reverse the output to [1, 0].
  const start = -(slotIndex + 1) * ACTION_WIDTH
  const end = -slotIndex * ACTION_WIDTH
  const opacity = useTransform(x, [start, end], [1, 0], { clamp: true })
  const scale = useTransform(x, [start, end], [1, 0], { clamp: true })

  return (
    <motion.button
      type="button"
      aria-label={action.label}
      onClick={onTap}
      style={{ width: ACTION_WIDTH, opacity, scale }}
      className={`swipeable-row-action ${variantClass[action.variant ?? 'neutral']}`}
    >
      <span className="flex items-center justify-center w-7 h-7">{action.icon}</span>
      <span className="text-[11px] font-medium">{action.label}</span>
    </motion.button>
  )
}
