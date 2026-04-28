'use client'

import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { usePageTransition } from '@/contexts/page-transition-context'

const SLIDE_TRANSITION = { type: 'tween' as const, duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }
const FADE_TRANSITION = { duration: 0.15 }

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { slideDirection, slideTargetPath } = usePageTransition()

  // Back-compat fallback: the existing Account flow sets only slideDirection
  // without slideTargetPath. Treat /account as the default target in that case.
  const effectiveTargetPath = slideTargetPath ?? '/account'
  const isTargetPage = pathname === effectiveTargetPath

  const isSliding = slideDirection !== null
  const isEntering = isSliding && (
    (slideDirection === 'forward' && isTargetPage) ||
    (slideDirection === 'back' && !isTargetPage)
  )

  let initial: { x: string | number; opacity: number } | false
  let animate: { x: string | number; opacity: number }

  if (isEntering) {
    initial = slideDirection === 'forward'
      ? { x: '100%', opacity: 0 }
      : { x: '-30%', opacity: 0 }
    animate = { x: 0, opacity: 1 }
  } else if (isSliding) {
    // Exiting — start at rest, translate out
    initial = { x: 0, opacity: 1 }
    animate = { x: slideDirection === 'back' ? '100%' : '-30%', opacity: 0 }
  } else {
    // No slide — instant swap. Tab-bar navigation never fades; the new
    // route mounts at full opacity immediately so the user never sees the
    // ghost-content flash from fading the old page out before the new one
    // is ready. Matches native iOS/Android tab-bar behavior. Drill-downs
    // (which set slideDirection) are handled by the slide branches above.
    initial = false
    animate = { x: 0, opacity: 1 }
  }

  // Always render motion.div with the same key shape. Switching element types
  // (div ↔ motion.div) or toggling a key only in one branch causes React to
  // unmount the entire subtree, which aborts in-flight animations and resets
  // child state. The pathname key is intentional: on route change we WANT a
  // fresh motion.div so `initial` takes effect (slide from right on enter).
  return (
    <motion.div
      key={`page-${pathname}`}
      initial={initial}
      animate={animate}
      transition={isSliding ? SLIDE_TRANSITION : FADE_TRANSITION}
      className="flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  )
}
