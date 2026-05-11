import { useEffect } from 'react'

import { haptic } from '@/lib/haptics'

// Opt-in only. The provider fires haptics for exactly four surfaces:
//   - bottom-nav business tabs       (ion-tab-button)
//   - header back chevron            (ion-back-button)
//   - header hamburger / menu        (ion-menu-button)
//   - explicit final-action buttons  ([data-haptic]) — also used for the
//     business row on the hub
// Everything else is silent on purpose.
const HAPTIC_TARGET_SELECTOR = [
  'ion-tab-button',
  'ion-back-button',
  'ion-menu-button',
  '[data-haptic]',
].join(',')

function isOptedOut(el: Element): boolean {
  if (el.closest('[data-no-haptic]')) return true
  const button = el as HTMLButtonElement
  if (button.disabled) return true
  if (el.getAttribute('aria-disabled') === 'true') return true
  return false
}

function handleClick(e: MouseEvent) {
  const target = e.target as Element | null
  if (!target) return
  const el = target.closest(HAPTIC_TARGET_SELECTOR)
  if (!el) return
  if (isOptedOut(el)) return
  haptic()
}

export function HapticFeedbackProvider() {
  useEffect(() => {
    // Capture phase, not bubble. Some Ionic web components (IonBackButton
    // notably) install internal click handlers on the host that change the
    // DOM mid-handler — by the time the click finishes bubbling to
    // `document`, the source page is already unmounting and the listener
    // can miss the event. Listening at the capture phase guarantees the
    // haptic fires synchronously before any descendant handler runs.
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])
  return null
}
