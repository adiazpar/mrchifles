'use client'

import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useNavbar } from '@/contexts/navbar-context'

const TRANSITION = { type: 'tween' as const, duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { pendingHref, slideDirection } = useNavbar()

  if (!slideDirection) {
    return (
      <div
        className="flex-1 flex flex-col transition-opacity duration-150"
        style={{ opacity: pendingHref ? 0 : 1 }}
      >
        {children}
      </div>
    )
  }

  const isAccountPage = pathname === '/account'

  // Use pathname to determine this page's role in the slide transition.
  // Forward to account: non-account pages exit left, account enters from right.
  // Back from account: account exits right, non-account pages enter from left.
  const isEntering =
    (slideDirection === 'forward' && isAccountPage) ||
    (slideDirection === 'back' && !isAccountPage)

  const isExiting =
    (slideDirection === 'forward' && !isAccountPage) ||
    (slideDirection === 'back' && isAccountPage)

  // Entry: starting position when mounting
  let initial: { x: string | number; opacity: number } | false = false
  if (isEntering) {
    initial = slideDirection === 'forward'
      ? { x: '100%', opacity: 0 }
      : { x: '-30%', opacity: 0 }
  } else if (isExiting) {
    initial = { x: 0, opacity: 1 }
  }

  // Animate: exit slides out, entry slides to center
  const animate = isExiting
    ? {
        x: slideDirection === 'back' ? '100%' : '-30%',
        opacity: 0,
      }
    : { x: 0, opacity: 1 }

  return (
    <motion.div
      key={`page-${pathname}`}
      initial={initial}
      animate={animate}
      transition={TRANSITION}
      className="flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  )
}
