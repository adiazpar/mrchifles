'use client'

import { AnimatePresence, motion } from 'framer-motion'

const SLIDE_TRANSITION = {
  type: 'tween' as const,
  duration: 0.28,
  ease: [0.32, 0.72, 0, 1] as const,
}

interface Props {
  isOpen: boolean
  children: React.ReactNode
}

// Renders drill-down content as an absolutely-positioned overlay above
// TabShell. AnimatePresence + mode="wait" gives us:
// - Mount (going forward into a drill-down): slide in from the right.
// - Unmount (going back to a tab): slide out to the right (exit animation
//   plays before unmount, so the user sees the slide instead of a snap).
//
// TabShell underneath stays mounted throughout, so its scroll/UI state
// is preserved when the overlay unmounts. z-10 leaves room for higher-z
// UI like modals (z-50) and the navigation/offline notices (z-40/50).
export function DrillDownOverlay({ isOpen, children }: Props) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="drill-down"
          className="absolute inset-0 z-10 bg-bg-base overflow-y-auto overflow-x-hidden"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={SLIDE_TRANSITION}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
