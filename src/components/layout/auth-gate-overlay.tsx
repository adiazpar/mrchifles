'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useAuthGate, type AuthGatePhase } from '@/contexts/auth-gate-context'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const
const EASE_OUT_BACK = [0.34, 1.56, 0.64, 1] as const

// Phases where the overlay surface is (or is becoming) fully opaque.
// Everything between overlay-in and overlay-out inclusive — so the
// icon's breath gaps and animations all render on a solid surface.
const OPAQUE_PHASES: ReadonlySet<AuthGatePhase> = new Set([
  'overlay-in',
  'icon-in',
  'hold',
  'icon-out',
])

// Only the two overlay phases actually animate surface opacity; the middle
// phases render with duration 0 so Framer never re-triggers the fade while
// the icon is doing its thing.
function overlayFadeDuration(phase: AuthGatePhase, reducedMotion: boolean): number {
  if (reducedMotion) {
    if (phase === 'overlay-in' || phase === 'overlay-out') return 0.2
    return 0
  }
  switch (phase) {
    case 'overlay-in': return 0.25
    case 'overlay-out': return 0.3
    default:
      return 0
  }
}

// Icon animation variants. Pop-in overshoots to 1.05 then settles; pop-out
// punches up to 1.1 then collapses while fading. Hidden states match the
// endpoints of the pop animations so phase transitions don't snap.
const ICON_HIDDEN_PRE = {
  scale: 0.6,
  opacity: 0,
  transition: { duration: 0 },
}

const ICON_POP_IN = {
  scale: [0.6, 1.05, 1],
  opacity: [0, 1, 1],
  transition: { duration: 0.4, times: [0, 0.7, 1], ease: EASE_OUT_BACK },
}

const ICON_REST = {
  scale: 1,
  opacity: 1,
  transition: { duration: 0 },
}

const ICON_POP_OUT = {
  scale: [1, 1.1, 0.85],
  opacity: [1, 1, 0],
  transition: { duration: 0.4, times: [0, 0.4, 1], ease: 'easeIn' as const },
}

const ICON_HIDDEN_POST = {
  scale: 0.85,
  opacity: 0,
  transition: { duration: 0 },
}

function iconAnimateForPhase(phase: AuthGatePhase, reducedMotion: boolean) {
  if (reducedMotion) return ICON_REST
  switch (phase) {
    case 'overlay-in': return ICON_HIDDEN_PRE
    case 'icon-in': return ICON_POP_IN
    case 'hold': return ICON_REST
    case 'icon-out': return ICON_POP_OUT
    case 'overlay-out': return ICON_HIDDEN_POST
    default: return ICON_REST
  }
}

export function AuthGateOverlay() {
  const { phase, reducedMotion } = useAuthGate()
  const visible = phase !== 'idle'
  const targetOpacity = OPAQUE_PHASES.has(phase) ? 1 : 0
  const fadeDuration = overlayFadeDuration(phase, reducedMotion)
  const iconAnimate = iconAnimateForPhase(phase, reducedMotion)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="auth-gate-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: targetOpacity }}
          exit={{ opacity: 0 }}
          transition={{ duration: fadeDuration, ease: EASE_OUT_EXPO }}
          aria-hidden="true"
        >
          <motion.img
            className="auth-gate-overlay__icon"
            src="/icon-source.png"
            alt=""
            width={128}
            height={128}
            animate={iconAnimate}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
