import { useEffect, type RefObject } from 'react'

/**
 * iOS touch-intent disambiguation for a horizontal swipe gesture that
 * lives inside a vertically-scrollable page.
 *
 * The default `touch-action: pan-y` on a horizontally-draggable element
 * (what framer-motion's `drag="x"` sets) tells iOS "let the page scroll
 * vertically AND let JS handle horizontal pans". On a diagonal gesture
 * iOS commits to vertical scroll before framer-motion's direction lock
 * kicks in, so the page visibly slides when the user meant to swipe the
 * component.
 *
 * This hook watches raw touch events on the referenced element. Once
 * horizontal motion exceeds a small threshold AND dominates vertical
 * motion, it calls `preventDefault` on the (non-passive) touchmove
 * listener — cancelling iOS's pending vertical scroll for the current
 * gesture. Purely-vertical gestures are left alone, so the page keeps
 * scrolling normally.
 *
 * framer-motion's drag uses pointer events, so its own logic is
 * unaffected. Pass `enabled = false` to skip attaching listeners (e.g.
 * when a tab container is in non-swipeable mode).
 */
export function useHorizontalSwipeIntent(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    let startX = 0
    let startY = 0
    let intent: 'none' | 'horizontal' | 'vertical' = 'none'

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      intent = 'none'
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const dx = Math.abs(e.touches[0].clientX - startX)
      const dy = Math.abs(e.touches[0].clientY - startY)

      if (intent === 'none') {
        // Small threshold so a twitchy finger doesn't latch to an axis.
        if (dx < 6 && dy < 6) return
        intent = dx > dy ? 'horizontal' : 'vertical'
      }

      if (intent === 'horizontal') {
        e.preventDefault()
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    // passive: false is required for preventDefault to actually cancel
    // the browser's scroll on this gesture.
    el.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
    }
  }, [ref, enabled])
}
