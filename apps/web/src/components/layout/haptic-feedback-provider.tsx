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
  '.btn',
  '.fab',
  '.payment-btn',
  '.caja-action-btn',
  '.icon-stack-btn',
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
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])
  return null
}
