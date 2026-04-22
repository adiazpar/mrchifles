'use client'

import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Provider } from '@/types'

export function getProviderInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export interface ProviderListItemProps {
  provider: Provider
  onClick: () => void
}

export function ProviderListItem({ provider, onClick }: ProviderListItemProps) {
  const t = useTranslations('providers')
  return (
    <div
      className="list-item-clickable"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      tabIndex={0}
      role="button"
    >
      <div className="avatar">
        {getProviderInitials(provider.name)}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium truncate block">{provider.name}</span>
        <span className="text-xs text-text-tertiary mt-0.5 block">
          {provider.phone || t('no_phone')}
        </span>
      </div>
      <div className="flex items-center justify-center">
        <span className={`text-xs font-medium ${provider.active ? 'text-success' : 'text-error'}`}>
          {provider.active ? t('status_active') : t('status_inactive')}
        </span>
      </div>
      <div className="text-text-tertiary ml-2 flex items-center">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  )
}
