'use client'

import { ChevronLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { UserMenu } from './user-menu'

interface DrillDownHeaderProps {
  title: string
  subtitle?: string
  onBack: () => void
  showUserMenu?: boolean
}

export function DrillDownHeader({ title, subtitle, onBack, showUserMenu = true }: DrillDownHeaderProps) {
  const t = useTranslations()
  return (
    <header className="page-header page-header--fixed page-header--three-col">
      <div className="page-header__content">
        <button
          type="button"
          onClick={onBack}
          data-tap-feedback
          className="btn btn-secondary btn-icon flex-shrink-0"
          aria-label={t('ui.page_header.go_back')}
        >
          <ChevronLeft style={{ width: 20, height: 20 }} />
        </button>
      </div>
      <div className="page-header__titles">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      <div className="page-header__actions">
        {showUserMenu && <UserMenu />}
      </div>
    </header>
  )
}
