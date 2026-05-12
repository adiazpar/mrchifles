'use client'

import { useIntl } from 'react-intl'
import { ChevronRight } from 'lucide-react'
import { getUserInitials } from '@kasero/shared/auth'
import type { TeamMember } from '@/hooks/useTeamManagement'
import type { UserRole } from '@kasero/shared/types'

export interface TeamMemberListItemProps {
  member: TeamMember
  isSelf: boolean
}

/**
 * Single ledger row in the unified roster.
 *
 * Layout: 36px avatar (initials or photo) → italic Fraunces name on the
 * top line → mono uppercase caption on the bottom line in the form
 * `ROLE [· YOU] [· DISABLED]` → trailing chevron. The owner role token is
 * rendered in terracotta; everyone else stays in muted tertiary ink. The
 * whole row dims to 0.55 opacity when the member is disabled.
 *
 * Bare markup (no <button>): the wrapping IonItem owns the click target
 * so SwipeRow can drive future swipe actions — same structure as the
 * providers roster.
 */
export function TeamMemberListItem({ member, isSelf }: TeamMemberListItemProps) {
  const t = useIntl()

  const roleLabels: Record<UserRole, string> = {
    owner: t.formatMessage({ id: 'team.role_owner' }),
    partner: t.formatMessage({ id: 'team.role_partner' }),
    employee: t.formatMessage({ id: 'team.role_employee' }),
  }

  const isInactive = member.status !== 'active'
  const isOwner = member.role === 'owner'

  const rowClass = isInactive
    ? 'tm-roster__row tm-roster__row--inactive'
    : 'tm-roster__row'

  const roleClass = isOwner
    ? 'tm-roster__row-role tm-roster__row-role--owner'
    : 'tm-roster__row-role'

  return (
    <div className={rowClass}>
      <span className="tm-roster__avatar" aria-hidden="true">
        {member.avatar ? (
          <img src={member.avatar} alt="" />
        ) : (
          <span>{getUserInitials(member.name)}</span>
        )}
      </span>

      <span className="tm-roster__row-body">
        <span className="tm-roster__row-name">{member.name}</span>
        <span className="tm-roster__row-meta">
          <span className={roleClass}>{roleLabels[member.role].toUpperCase()}</span>
          {isSelf && (
            <>
              <span className="tm-roster__row-meta-sep" aria-hidden="true">·</span>
              <span>{t.formatMessage({ id: 'team.roster.you_label' }).toUpperCase()}</span>
            </>
          )}
          {isInactive && (
            <>
              <span className="tm-roster__row-meta-sep" aria-hidden="true">·</span>
              <span>{t.formatMessage({ id: 'team.status_disabled' }).toUpperCase()}</span>
            </>
          )}
        </span>
      </span>

      <ChevronRight size={16} className="tm-roster__row-chev" aria-hidden="true" />
    </div>
  )
}
