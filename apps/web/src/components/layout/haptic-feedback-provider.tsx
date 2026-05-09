import { useEffect } from 'react'

import { haptic } from '@/lib/haptics'

const HAPTIC_TARGET_SELECTOR = [
  'button',
  'a[role="button"]',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  'ion-button',
  'ion-tab-button',
  'ion-fab-button',
  'ion-back-button',
  'ion-item[button]',
  'ion-card[button]',
  'ion-segment-button',
  '.btn',
  '.fab',
  '.payment-btn',
  '.list-item-clickable',
  '.card-interactive',
  'ion-item.ion-activatable',
  '.user-menu-item',
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
