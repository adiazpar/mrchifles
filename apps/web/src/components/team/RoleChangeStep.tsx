'use client'

import { useIntl } from 'react-intl';
import { User as UserIcon, UserCircle } from 'lucide-react'
import { Modal, useModal, Spinner } from '@/components/ui'
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
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary">
          {t.formatMessage({
            id: 'team.role_change_description'
          }, { name: memberName })}
        </p>
      </Modal.Item>
      <Modal.Item>
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
      </Modal.Item>
    </>
  );
}

// Footer button for role change that handles navigation
export interface RoleChangeSaveButtonProps {
  roleChangeLoading: boolean
  isDisabled: boolean
  onSubmit: () => Promise<boolean>
}

export function RoleChangeSaveButton({
  roleChangeLoading,
  isDisabled,
  onSubmit,
}: RoleChangeSaveButtonProps) {
  const tCommon = useIntl()
  const { goToStep } = useModal()

  const handleSubmit = () => {
    goToStep(0)
    onSubmit()
  }

  return (
    <button
      type="button"
      onClick={handleSubmit}
      className="btn btn-primary flex-1"
      disabled={roleChangeLoading || isDisabled}
    >
      {roleChangeLoading ? <Spinner /> : tCommon.formatMessage({
        id: 'common.save'
      })}
    </button>
  );
}

// Footer button for cancel/back navigation
export interface RoleChangeCancelButtonProps {
  disabled: boolean
}

export function RoleChangeCancelButton({ disabled }: RoleChangeCancelButtonProps) {
  const tCommon = useIntl()
  const { goToStep } = useModal()

  return (
    <button
      type="button"
      onClick={() => goToStep(0)}
      className="btn btn-secondary flex-1"
      disabled={disabled}
    >
      {tCommon.formatMessage({
        id: 'common.cancel'
      })}
    </button>
  );
}
