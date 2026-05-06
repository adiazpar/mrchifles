/**
 * Cross-platform haptic feedback for PWA installs.
 *
 * iOS 17.4+ / iPhone PWAs: `navigator.vibrate` IS implemented (despite
 * what older docs say) and is the right primary path. Apple maps it to
 * the system haptic engine, but only durations >= ~30-50ms are
 * perceptible — anything shorter is a silent no-op. We default to 50ms.
 *
 * Pre-iOS-17.4 Safari (no Vibration API): falls back to a hidden
 * `<input type="checkbox" switch>` element that natively emits a haptic
 * tap when its associated label is clicked. The structure must be
 * sibling input + label (with `for=`), wrapped in a hidden parent —
 * matches the proven progressier/ios-haptics pattern.
 *
 * Android: `navigator.vibrate` works as documented.
 *
 * Must be called from inside a user-gesture handler (touch/click).
 * Async/setTimeout callbacks are best-effort — Safari may gate them
 * outside an active gesture, but short follow-ups usually go through.
 */

function fireSwitchHaptic() {
  if (typeof document === 'undefined') return
  try {
    const wrapper = document.createElement('div')
    wrapper.setAttribute(
      'style',
      'display:none !important;opacity:0 !important;visibility:hidden !important;',
    )

    const id = `_h${Math.random().toString(36).slice(2)}`
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.id = id
    input.setAttribute('switch', '')

    const label = document.createElement('label')
    label.setAttribute('for', id)

    wrapper.appendChild(input)
    wrapper.appendChild(label)
    document.body.appendChild(wrapper)
    label.click()
    window.setTimeout(() => wrapper.remove(), 1500)
  } catch {
    // ignore
  }
}

function hasVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function haptic(pattern: number | number[] = 50) {
  if (hasVibrate()) {
    navigator.vibrate(pattern)
    return
  }
  fireSwitchHaptic()
}

export function hapticSuccess() {
  if (hasVibrate()) {
    navigator.vibrate([50, 80, 50])
    return
  }
  fireSwitchHaptic()
  window.setTimeout(fireSwitchHaptic, 130)
}

export function hapticError() {
  if (hasVibrate()) {
    navigator.vibrate([50, 80, 50, 80, 50])
    return
  }
  fireSwitchHaptic()
  window.setTimeout(fireSwitchHaptic, 130)
  window.setTimeout(fireSwitchHaptic, 260)
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__haptic = {
    haptic,
    hapticSuccess,
    hapticError,
    fireSwitchHaptic,
    hasVibrate: hasVibrate(),
  }
}
