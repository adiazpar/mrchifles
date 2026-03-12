'use client'

import { ReactNode, useEffect, useState } from 'react'
import { UserMenu } from './user-menu'
import { IconArrowLeft } from '@/components/icons'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  /** Show a back button that slides in from the left */
  showBackButton?: boolean
  /** Callback when back button is pressed */
  onBack?: () => void
  /** Animate titles as if returning from a sub-page (slide from right) */
  isReturning?: boolean
  /** Make the header sticky at the top of the page */
  sticky?: boolean
}

export function PageHeader({
  title,
  subtitle,
  actions,
  showBackButton = false,
  onBack,
  isReturning = false,
  sticky = false,
}: PageHeaderProps) {
  // Clear returning state after animation completes
  const [showReturnAnimation, setShowReturnAnimation] = useState(isReturning)

  useEffect(() => {
    if (isReturning) {
      setShowReturnAnimation(true)
      // Clear after animation duration
      const timer = setTimeout(() => setShowReturnAnimation(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isReturning])

  const getContentClass = () => {
    if (showBackButton) return 'page-header__content--with-back'
    if (showReturnAnimation) return 'page-header__content--returning'
    return ''
  }

  return (
    <header className={`page-header${sticky ? ' page-header--sticky' : ''}`}>
      <div className={`page-header__content ${getContentClass()}`}>
        {showBackButton && (
          <button
            type="button"
            onClick={onBack}
            className="page-header__back"
            aria-label="Volver"
          >
            <IconArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="page-header__titles">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <div className="lg:hidden">
          <UserMenu variant="mobile" />
        </div>
      </div>
    </header>
  )
}
