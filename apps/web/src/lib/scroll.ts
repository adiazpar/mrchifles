/**
 * Scroll utilities for tab content containers.
 */

/**
 * Scrolls to the top with smooth animation.
 *
 * Resolution order:
 *   1. Explicit target element (if provided).
 *   2. The window — covers hub/auth contexts. Inside Ionic tabs, callers
 *      should pass the IonContent's scroll element explicitly when they
 *      need to scroll the inner scroller rather than the window.
 */
export function scrollToTop(target?: HTMLElement | null): void {
  if (target) {
    target.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
