/**
 * Scroll utilities for layer/tab content containers.
 */

/**
 * Scrolls to the top with smooth animation.
 *
 * Resolution order:
 *   1. Explicit target element (if provided).
 *   2. The currently active tab view (`.tab-shell-view.is-active`) — works
 *      for any caller inside a business root.
 *   3. The window — covers hub/auth contexts.
 */
export function scrollToTop(target?: HTMLElement | null): void {
  const el =
    target ??
    (typeof document !== 'undefined'
      ? document.querySelector<HTMLElement>('.tab-shell-view.is-active')
      : null)
  if (el) {
    el.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
