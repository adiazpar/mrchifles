'use client'

import { useEffect, useState } from 'react'
import { UserMenu } from './user-menu'
import { IconArrowLeft } from '@/components/icons'
import { useHeaderContext } from '@/contexts/header-context'

/**
 * Fixed page header component that reads its configuration from HeaderContext.
 * Place this in the dashboard layout - pages use the useHeader() hook to set content.
 */
export function PageHeader() {
  const { config } = useHeaderContext()
  const { title, subtitle, actions, showBackButton, onBack, isReturning } = config

  // Clear returning state after animation completes
  const [showReturnAnimation, setShowReturnAnimation] = useState(isReturning)

  useEffect(() => {
    if (isReturning) {
      setShowReturnAnimation(true)
      // Clear after animation duration
      const timer = setTimeout(() => setShowReturnAnimation(false), 300)
      return () => clearTimeout(timer)
    } else {
      setShowReturnAnimation(false)
    }
  }, [isReturning])

  const getContentClass = () => {
    if (showBackButton) return 'page-header__content--with-back'
    if (showReturnAnimation) return 'page-header__content--returning'
    return ''
  }

  // Don't render if no title is set (initial state)
  if (!title) {
    return <header className="page-header page-header--fixed" />
  }

  return (
    <header className="page-header page-header--fixed">
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
