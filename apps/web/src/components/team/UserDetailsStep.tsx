'use client'

import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslations } from 'next-intl'
import { Modal, useModal } from '@/components/ui'
import { getUserInitials } from '@kasero/shared/auth'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { User, UserRole } from '@kasero/shared/types'
import type { TeamMember } from '@/hooks/useTeamManagement'

export interface UserDetailsStepProps {
  member: TeamMember
  currentUser: User | null
  canManageTeam: boolean
  callerRole: UserRole | null
  onToggleStatus: () => void
}

export const UserDetailsStep = memo(function UserDetailsStep({
  member,
  currentUser,
  canManageTeam,
  callerRole,
  onToggleStatus,
}: UserDetailsStepProps) {
  const t = useTranslations('team')
  const { goToStep } = useModal()
  const { formatDate } = useBusinessFormat()
  const isSelf = member.id === currentUser?.id
  // Partner-on-partner guard mirrors the server-side check in
  // /users/change-role and /users/toggle-status: a partner cannot mutate
  // another partner; only the owner can.
  const isPartnerOnPartner = callerRole === 'partner' && member.role === 'partner'
  const isManageable =
    canManageTeam && !isSelf && member.role !== 'owner' && !isPartnerOnPartner

  const roleLabels: Record<UserRole, string> = {
    owner: t('role_owner'),
    partner: t('role_partner'),
    employee: t('role_employee'),
  }

  return (
    <>
      <Modal.Item>
        {/* Member header */}
        <div className="flex items-center gap-3">
          <div className="avatar w-11 h-11 text-sm overflow-hidden">
            {member.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.avatar}
                alt=""
                className="w-11 h-11 rounded-full object-cover"
              />
            ) : (
              getUserInitials(member.name)
            )}
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">{member.name}</h3>
            <div className="text-xs text-text-tertiary mt-0.5">
              {roleLabels[member.role]}
              <span className="mx-1.5">·</span>
              <span className={member.status === 'active' ? 'text-success' : 'text-error'}>
                {member.status === 'active' ? t('status_active') : t('status_disabled')}
              </span>
            </div>
          </div>
        </div>
      </Modal.Item>

      <Modal.Item>
        {/* Member details */}
        <div className="space-y-3 p-4 bg-bg-muted rounded-lg">
          {member.email && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">{t('email_label')}</span>
              <span className="text-sm font-medium">
                {isSelf
                  ? member.email
                  : `****${member.email.split('@')[0].slice(-4)}@${member.email.split('@')[1]}`}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">{t('member_since_label')}</span>
            <span className="text-sm font-medium">
              {formatDate(member.createdAt)}
            </span>
          </div>
        </div>
      </Modal.Item>

      {isManageable && (
        <Modal.Item>
          <div className="space-y-3">
            {/* Change role button */}
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="btn btn-secondary w-full justify-start gap-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{t('change_role_button')}</span>
            </button>

            {/* Toggle status button */}
            <button
              type="button"
              onClick={onToggleStatus}
              className={`btn w-full justify-start gap-3 ${
                member.status === 'active'
                  ? 'btn-ghost text-error hover:bg-error-subtle'
                  : 'btn-secondary'
              }`}
            >
              {member.status === 'active' ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span>{t('disable_account_button')}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('enable_account_button')}</span>
                </>
              )}
            </button>

            {/* Remove from business button */}
            <button
              type="button"
              onClick={() => goToStep(3)}
              className="btn btn-ghost text-error hover:bg-error-subtle w-full justify-start gap-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H22M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{t('remove_member_button')}</span>
            </button>

            {/* Status explanation */}
            {member.status === 'disabled' && (
              <p className="text-xs text-text-tertiary">
                {t('disabled_cannot_sign_in')}
              </p>
            )}
          </div>
        </Modal.Item>
      )}

      {/* Self view hint */}
      {isSelf && (
        <Modal.Item>
          <p className="text-xs text-text-tertiary text-center">
            {t('account_settings_hint')}{' '}
            <Link to="/account" className="text-brand hover:underline">
              {t('account_settings_link')}
            </Link>.
          </p>
        </Modal.Item>
      )}
    </>
  )
})
