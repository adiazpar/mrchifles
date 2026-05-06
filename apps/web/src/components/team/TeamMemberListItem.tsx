'use client'

import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getUserInitials } from '@kasero/shared/auth'
import type { TeamMember } from '@/hooks/useTeamManagement'
import type { UserRole } from '@kasero/shared/types'

export interface TeamMemberListItemProps {
  member: TeamMember
  isSelf: boolean
  onClick: () => void
}

export function TeamMemberListItem({ member, isSelf, onClick }: TeamMemberListItemProps) {
  const t = useTranslations('team')

  const roleLabels: Record<UserRole, string> = {
    owner: t('role_owner'),
    partner: t('role_partner'),
    employee: t('role_employee'),
  }

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
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0 overflow-hidden">
        {member.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.avatar}
            alt=""
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-brand">
            {getUserInitials(member.name)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{member.name}</span>
          {isSelf && (
            <span className="text-xs text-text-tertiary">{t('member_you_label')}</span>
          )}
        </div>
        <span className="text-xs text-text-tertiary mt-0.5 block">
          {roleLabels[member.role]}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center justify-center">
        <span className={`text-xs font-medium ${member.status === 'active' ? 'text-success' : 'text-error'}`}>
          {member.status === 'active' ? t('status_active') : t('status_disabled')}
        </span>
      </div>

      {/* Chevron */}
      <div className="text-text-tertiary ml-2 flex items-center">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  )
}
