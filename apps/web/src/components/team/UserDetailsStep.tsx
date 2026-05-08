'use client'

import { useIntl } from 'react-intl';
import { memo } from 'react'
import { Link } from 'react-router-dom'
import { IonButton } from '@ionic/react'
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
  onChangeRole: () => void
  onRemoveMember: () => void
}

export const UserDetailsStep = memo(function UserDetailsStep({
  member,
  currentUser,
  canManageTeam,
  callerRole,
  onToggleStatus,
  onChangeRole,
  onRemoveMember,
}: UserDetailsStepProps) {
  const t = useIntl()
  const { formatDate } = useBusinessFormat()
  const isSelf = member.id === currentUser?.id
  // Partner-on-partner guard mirrors the server-side check in
  // /users/change-role and /users/toggle-status: a partner cannot mutate
  // another partner; only the owner can.
  const isPartnerOnPartner = callerRole === 'partner' && member.role === 'partner'
  const isManageable =
    canManageTeam && !isSelf && member.role !== 'owner' && !isPartnerOnPartner

  const roleLabels: Record<UserRole, string> = {
    owner: t.formatMessage({
      id: 'team.role_owner'
    }),
    partner: t.formatMessage({
      id: 'team.role_partner'
    }),
    employee: t.formatMessage({
      id: 'team.role_employee'
    }),
  }

  return (
    <>
      <div className="mb-4">
        {/* Member header */}
        <div className="flex items-center gap-3">
          <div className="avatar w-11 h-11 text-sm overflow-hidden">
            {member.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              (<img
                src={member.avatar}
                alt=""
                className="w-11 h-11 rounded-full object-cover"
              />)
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
                {member.status === 'active' ? t.formatMessage({
                  id: 'team.status_active'
                }) : t.formatMessage({
                  id: 'team.status_disabled'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-4">
        {/* Member details */}
        <div className="space-y-3 p-4 bg-bg-muted rounded-lg">
          {member.email && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">{t.formatMessage({
                id: 'team.email_label'
              })}</span>
              <span className="text-sm font-medium">
                {isSelf
                  ? member.email
                  : `****${member.email.split('@')[0].slice(-4)}@${member.email.split('@')[1]}`}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">{t.formatMessage({
              id: 'team.member_since_label'
            })}</span>
            <span className="text-sm font-medium">
              {formatDate(member.createdAt)}
            </span>
          </div>
        </div>
      </div>
      {isManageable && (
        <div className="mb-4">
          <div className="space-y-3">
            {/* Change role button */}
            <IonButton
              fill="outline"
              expand="block"
              onClick={onChangeRole}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{t.formatMessage({
                id: 'team.change_role_button'
              })}</span>
            </IonButton>

            {/* Toggle status button */}
            <IonButton
              fill={member.status === 'active' ? 'clear' : 'outline'}
              color={member.status === 'active' ? 'danger' : undefined}
              expand="block"
              onClick={onToggleStatus}
            >
              {member.status === 'active' ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span>{t.formatMessage({
                    id: 'team.disable_account_button'
                  })}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t.formatMessage({
                    id: 'team.enable_account_button'
                  })}</span>
                </>
              )}
            </IonButton>

            {/* Remove from business button */}
            <IonButton
              fill="clear"
              color="danger"
              expand="block"
              onClick={onRemoveMember}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H22M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{t.formatMessage({
                id: 'team.remove_member_button'
              })}</span>
            </IonButton>

            {/* Status explanation */}
            {member.status === 'disabled' && (
              <p className="text-xs text-text-tertiary">
                {t.formatMessage({
                  id: 'team.disabled_cannot_sign_in'
                })}
              </p>
            )}
          </div>
        </div>
      )}
      {/* Self view hint */}
      {isSelf && (
        <div>
          <p className="text-xs text-text-tertiary text-center">
            {t.formatMessage({
              id: 'team.account_settings_hint'
            })}{' '}
            <Link to="/account" className="text-brand hover:underline">
              {t.formatMessage({
                id: 'team.account_settings_link'
              })}
            </Link>.
          </p>
        </div>
      )}
    </>
  );
})
