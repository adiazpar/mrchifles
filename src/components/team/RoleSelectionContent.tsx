'use client'

import { User as UserIcon, UserCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui'
import { RoleCard } from './RoleCard'
import type { InviteRole } from '@/types'

export interface RoleSelectionContentProps {
  selectedRole: InviteRole
  setSelectedRole: (role: InviteRole) => void
}

export function RoleSelectionContent({
  selectedRole,
  setSelectedRole,
}: RoleSelectionContentProps) {
  const t = useTranslations('team')
  return (
    <Modal.Item>
      <label className="label">{t('new_member_role_label')}</label>
      <div className="space-y-3">
        <RoleCard
          icon={<UserIcon className="w-5 h-5" />}
          title={t('role_employee')}
          description={t('role_employee_description')}
          selected={selectedRole === 'employee'}
          onClick={() => setSelectedRole('employee')}
        />
        <RoleCard
          icon={<UserCircle className="w-5 h-5" />}
          title={t('role_partner')}
          description={t('role_partner_description')}
          selected={selectedRole === 'partner'}
          onClick={() => setSelectedRole('partner')}
        />
      </div>
    </Modal.Item>
  )
}
