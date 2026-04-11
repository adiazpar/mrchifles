'use client'

import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { InviteCode, InviteRole } from '@/types'

export interface InviteCodeListItemProps {
  code: InviteCode
  onClick: () => void
}

export function InviteCodeListItem({ code, onClick }: InviteCodeListItemProps) {
  const t = useTranslations('team')
  const { formatDate } = useBusinessFormat()

  const roleLabels: Record<InviteRole, string> = {
    partner: t('role_partner'),
    employee: t('role_employee'),
  }

  return (
    <div
      className="list-item-clickable list-item-flat"
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
      {/* Info */}
      <div className="flex-1 min-w-0">
        <code className="font-display font-bold tracking-widest">
          {code.code}
        </code>
        <span className="text-xs text-text-tertiary mt-0.5 block">
          {roleLabels[code.role]} · {t('invite_expires', { date: formatDate(code.expiresAt) })}
        </span>
      </div>

      {/* Chevron */}
      <div className="text-text-tertiary ml-2">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  )
}
