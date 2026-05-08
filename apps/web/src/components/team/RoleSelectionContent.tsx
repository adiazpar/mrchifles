'use client'

import { useIntl } from 'react-intl';
import { User as UserIcon, UserCircle } from 'lucide-react'
import { RoleCard } from './RoleCard'
import type { InviteRole } from '@kasero/shared/types'

export interface RoleSelectionContentProps {
  selectedRole: InviteRole
  setSelectedRole: (role: InviteRole) => void
}

export function RoleSelectionContent({
  selectedRole,
  setSelectedRole,
}: RoleSelectionContentProps) {
  const t = useIntl()
  return (
    <div>
      <label className="label">{t.formatMessage({
        id: 'team.new_member_role_label'
      })}</label>
      <div className="space-y-3">
        <RoleCard
          icon={<UserIcon className="w-5 h-5" />}
          title={t.formatMessage({
            id: 'team.role_employee'
          })}
          description={t.formatMessage({
            id: 'team.role_employee_description'
          })}
          selected={selectedRole === 'employee'}
          onClick={() => setSelectedRole('employee')}
        />
        <RoleCard
          icon={<UserCircle className="w-5 h-5" />}
          title={t.formatMessage({
            id: 'team.role_partner'
          })}
          description={t.formatMessage({
            id: 'team.role_partner_description'
          })}
          selected={selectedRole === 'partner'}
          onClick={() => setSelectedRole('partner')}
        />
      </div>
    </div>
  );
}
