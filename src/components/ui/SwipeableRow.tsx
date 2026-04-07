'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform, animate, type MotionValue, type PanInfo } from 'framer-motion'

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
const SPRING = { type: 'spring' as const, stiffness: 500, damping: 40 }

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
    animate(x, 0, SPRING)
  }, [x])

  const open = useCallback(() => {
    setIsOpen(true)
    animate(x, -revealWidth, SPRING)
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

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const { offset, velocity } = info
    const passedHalf = offset.x < -revealWidth / 2
    const fastEnough = velocity.x < -SWIPE_VELOCITY_THRESHOLD
    if (passedHalf || fastEnough) open()
    else close()
  }

  // While open, tapping the row content closes it instead of triggering the children's onClick.
  const handleRowPointerDownCapture = (e: React.PointerEvent) => {
    if (isOpen) {
      e.stopPropagation()
      e.preventDefault()
      close()
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
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -revealWidth, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        onPointerDownCapture={handleRowPointerDownCapture}
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
