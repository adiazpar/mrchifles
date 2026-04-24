'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useAuthGate, type AuthGatePhase } from '@/contexts/auth-gate-context'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const
const EASE_OUT_BACK = [0.34, 1.56, 0.64, 1] as const

const OPAQUE_PHASES: ReadonlySet<AuthGatePhase> = new Set([
  'entering-fade-in',
  'entering-hold',
  'exiting-fade-in',
  'exiting-hold',
])

function durationForPhase(phase: AuthGatePhase, reducedMotion: boolean): number {
  if (reducedMotion) {
    if (phase === 'entering-fade-in' || phase === 'exiting-fade-in') return 0.2
    if (phase === 'entering-fade-out' || phase === 'exiting-fade-out') return 0.2
    return 0
  }
  switch (phase) {
    case 'entering-fade-in': return 0.15
    case 'entering-fade-out': return 0.2
    case 'exiting-fade-in': return 0.2
    case 'exiting-fade-out': return 0.2
    case 'entering-hold':
    case 'exiting-hold':
      return 0
    default:
      return 0
  }
}

export function AuthGateOverlay() {
  const { phase, reducedMotion } = useAuthGate()
  const visible = phase !== 'idle'
  const targetOpacity = OPAQUE_PHASES.has(phase) ? 1 : 0
  const fadeDuration = durationForPhase(phase, reducedMotion)
  const isPulsing = phase === 'entering-hold' && !reducedMotion

  return (
    <AnimatePresence initial={false}>
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
            animate={isPulsing ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={
              isPulsing
                ? { duration: 0.15, ease: EASE_OUT_BACK }
                : { duration: 0 }
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
