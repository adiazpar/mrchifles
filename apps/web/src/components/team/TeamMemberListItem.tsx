'use client'

import { useIntl } from 'react-intl';
import { IonItem, IonLabel, IonNote } from '@ionic/react'
import { getUserInitials } from '@kasero/shared/auth'
import type { TeamMember } from '@/hooks/useTeamManagement'
import type { UserRole } from '@kasero/shared/types'

export interface TeamMemberListItemProps {
  member: TeamMember
  isSelf: boolean
  onClick: () => void
}

export function TeamMemberListItem({ member, isSelf, onClick }: TeamMemberListItemProps) {
  const intl = useIntl()

  const roleLabels: Record<UserRole, string> = {
    owner: intl.formatMessage({ id: 'team.role_owner' }),
    partner: intl.formatMessage({ id: 'team.role_partner' }),
    employee: intl.formatMessage({ id: 'team.role_employee' }),
  }

  return (
    <IonItem button detail onClick={onClick}>
      {/* Avatar */}
      <div
        slot="start"
        className="w-10 h-10 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0 overflow-hidden"
      >
        {member.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.avatar}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-brand">
            {getUserInitials(member.name)}
          </span>
        )}
      </div>
      {/* Info */}
      <IonLabel>
        <h3>
          {member.name}
          {isSelf && (
            <span className="text-xs text-text-tertiary ml-2">
              {intl.formatMessage({ id: 'team.member_you_label' })}
            </span>
          )}
        </h3>
        <p>{roleLabels[member.role]}</p>
      </IonLabel>
      {/* Status */}
      <IonNote slot="end" className={member.status === 'active' ? 'text-success' : 'text-error'}>
        {member.status === 'active'
          ? intl.formatMessage({ id: 'team.status_active' })
          : intl.formatMessage({ id: 'team.status_disabled' })}
      </IonNote>
    </IonItem>
  );
}
