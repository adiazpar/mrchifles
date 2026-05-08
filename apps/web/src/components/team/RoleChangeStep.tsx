'use client'

import { useIntl } from 'react-intl';
import { User as UserIcon, UserCircle } from 'lucide-react'
import { RoleCard } from './RoleCard'

export interface RoleChangeContentProps {
  memberName: string
  newRole: 'partner' | 'employee'
  setNewRole: (role: 'partner' | 'employee') => void
}

export function RoleChangeContent({
  memberName,
  newRole,
  setNewRole,
}: RoleChangeContentProps) {
  const t = useIntl()
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        {t.formatMessage({
          id: 'team.role_change_description'
        }, { name: memberName })}
      </p>
      <div className="space-y-3">
        <RoleCard
          icon={<UserIcon className="w-5 h-5" />}
          title={t.formatMessage({
            id: 'team.role_employee'
          })}
          description={t.formatMessage({
            id: 'team.role_employee_description'
          })}
          selected={newRole === 'employee'}
          onClick={() => setNewRole('employee')}
        />
        <RoleCard
          icon={<UserCircle className="w-5 h-5" />}
          title={t.formatMessage({
            id: 'team.role_partner'
          })}
          description={t.formatMessage({
            id: 'team.role_partner_description'
          })}
          selected={newRole === 'partner'}
          onClick={() => setNewRole('partner')}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RoleChangeSaveButton and RoleChangeCancelButton are kept for backwards
// compatibility with any external consumers, but no longer use useModal().
// Navigation is now handled by the step components in member-steps/.
// ---------------------------------------------------------------------------

export interface RoleChangeSaveButtonProps {
  roleChangeLoading: boolean
  isDisabled: boolean
  onSave: () => void
}

export function RoleChangeSaveButton({
  roleChangeLoading,
  isDisabled,
  onSave,
}: RoleChangeSaveButtonProps) {
  const tCommon = useIntl()
  return (
    <button
      type="button"
      onClick={onSave}
      className="btn btn-primary flex-1"
      disabled={roleChangeLoading || isDisabled}
    >
      {tCommon.formatMessage({ id: 'common.save' })}
    </button>
  );
}

export interface RoleChangeCancelButtonProps {
  disabled: boolean
  onCancel: () => void
}

export function RoleChangeCancelButton({ disabled, onCancel }: RoleChangeCancelButtonProps) {
  const tCommon = useIntl()
  return (
    <button
      type="button"
      onClick={onCancel}
      className="btn btn-secondary flex-1"
      disabled={disabled}
    >
      {tCommon.formatMessage({ id: 'common.cancel' })}
    </button>
  );
}
