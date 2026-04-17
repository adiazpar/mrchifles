'use client'

import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useNavbar } from '@/contexts/navbar-context'

const TRANSITION = { type: 'tween' as const, duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { pendingHref, slideDirection, slideTargetPath } = useNavbar()

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

  // Back-compat: if no target path was set, fall back to the legacy /account rule.
  // This keeps the existing Account flow working unchanged when callers don't
  // explicitly opt in to the new slideTargetPath contract.
  const effectiveTargetPath = slideTargetPath ?? '/account'
  const isTargetPage = pathname === effectiveTargetPath

  const isEntering =
    (slideDirection === 'forward' && isTargetPage) ||
    (slideDirection === 'back' && !isTargetPage)

  const isExiting =
    (slideDirection === 'forward' && !isTargetPage) ||
    (slideDirection === 'back' && isTargetPage)

  let initial: { x: string | number; opacity: number } | false = false
  if (isEntering) {
    initial = slideDirection === 'forward'
      ? { x: '100%', opacity: 0 }
      : { x: '-30%', opacity: 0 }
  } else if (isExiting) {
    initial = { x: 0, opacity: 1 }
  }

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
