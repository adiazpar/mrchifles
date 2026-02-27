'use client'

import { ReactNode } from 'react'
import { UserMenu } from './user-menu'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
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
