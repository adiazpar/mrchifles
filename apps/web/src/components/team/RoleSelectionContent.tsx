'use client'

import { useIntl } from 'react-intl'
import { User as UserIcon, UserCircle } from 'lucide-react'
import { RoleCard } from './RoleCard'
import type { InviteRole } from '@kasero/shared/types'

export interface RoleSelectionContentProps {
  selectedRole: InviteRole
  setSelectedRole: (role: InviteRole) => void
}

/**
 * Stack of two RoleCards (employee + partner). Owner is intentionally
 * absent: invitees can't be promoted to owner — that requires a
 * dedicated transfer flow. Order is "employee" first (the safer pick),
 * "partner" second.
 */
export function RoleSelectionContent({
  selectedRole,
  setSelectedRole,
}: RoleSelectionContentProps) {
  const t = useIntl()
  return (
    <div className="tm-invite__role-list">
      <RoleCard
        icon={<UserIcon size={20} strokeWidth={1.6} />}
        title={t.formatMessage({ id: 'team.role_employee' })}
        description={t.formatMessage({ id: 'team.role_employee_description' })}
        selected={selectedRole === 'employee'}
        onClick={() => setSelectedRole('employee')}
      />
      <RoleCard
        icon={<UserCircle size={20} strokeWidth={1.6} />}
        title={t.formatMessage({ id: 'team.role_partner' })}
        description={t.formatMessage({ id: 'team.role_partner_description' })}
        selected={selectedRole === 'partner'}
        onClick={() => setSelectedRole('partner')}
      />
    </div>
  )
}
