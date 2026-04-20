/**
 * Global tap-feedback primitive. See
 * `.claude/docs/plans/2026-04-20-tap-feedback-design.md` for the design.
 *
 * On pointerdown over any element matching TAP_FEEDBACK_SELECTOR, stamps
 * `data-pressed="true"` on that element. On pointerup / pointercancel /
 * window blur, clears the attribute — but only after the element has been
 * pressed for at least MIN_PRESS_MS. This guarantees even microtaps produce
 * a visibly pronounced press state.
 */

export const MIN_PRESS_MS = 120

export const TAP_FEEDBACK_SELECTOR = [
  '.btn',
  '.fab',
  '.payment-btn',
  '.caja-action-btn',
  '.mobile-nav-item',
  '.swipeable-row-action',
  '[data-tap-feedback]',
].join(',')

interface PressRecord {
  element: HTMLElement
  pressStart: number
  clearTimer: number | null
}

const activePresses = new Map<number, PressRecord>()

function isDisabled(el: HTMLElement): boolean {
  if ((el as HTMLButtonElement).disabled) return true
  if (el.getAttribute('aria-disabled') === 'true') return true
  return false
}

function clearPress(record: PressRecord) {
  if (record.clearTimer !== null) {
    window.clearTimeout(record.clearTimer)
  }
  record.element.removeAttribute('data-pressed')
}

function schedulePressClear(pointerId: number) {
  const record = activePresses.get(pointerId)
  if (!record) return

  const elapsed = performance.now() - record.pressStart
  const remaining = Math.max(0, MIN_PRESS_MS - elapsed)

  const run = () => {
    activePresses.delete(pointerId)
    record.element.removeAttribute('data-pressed')
  }

  if (remaining === 0) {
    run()
  } else {
    record.clearTimer = window.setTimeout(run, remaining)
  }
}

function handlePointerDown(e: PointerEvent) {
  const target = e.target as Element | null
  if (!target) return
  const el = target.closest(TAP_FEEDBACK_SELECTOR) as HTMLElement | null
  if (!el) return
  if (isDisabled(el)) return

  // If there's already a press record for this pointerId, clear it first.
  const existing = activePresses.get(e.pointerId)
  if (existing) clearPress(existing)

  el.setAttribute('data-pressed', 'true')
  activePresses.set(e.pointerId, {
    element: el,
    pressStart: performance.now(),
    clearTimer: null,
  })
}

function handlePointerRelease(e: PointerEvent) {
  schedulePressClear(e.pointerId)
}

function handleWindowBlur() {
  for (const [pointerId] of activePresses) {
    schedulePressClear(pointerId)
  }
}

let mounted = false

export function mount() {
  if (mounted) return
  mounted = true
  document.addEventListener('pointerdown', handlePointerDown, { passive: true })
  document.addEventListener('pointerup', handlePointerRelease, { passive: true })
  document.addEventListener('pointercancel', handlePointerRelease, { passive: true })
  window.addEventListener('blur', handleWindowBlur)
}

export function unmount() {
  if (!mounted) return
  mounted = false
  document.removeEventListener('pointerdown', handlePointerDown)
  document.removeEventListener('pointerup', handlePointerRelease)
  document.removeEventListener('pointercancel', handlePointerRelease)
  window.removeEventListener('blur', handleWindowBlur)
  for (const record of activePresses.values()) clearPress(record)
  activePresses.clear()
}
