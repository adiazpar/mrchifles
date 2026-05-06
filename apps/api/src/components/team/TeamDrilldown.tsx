'use client'

import { Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, Copy, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Spinner, Modal, ConfirmationAnimation, useModal } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { useTeamManagement } from '@/hooks'
import {
  RoleSelectionContent,
  DurationPicker,
  CodeGeneratedContent,
  UserDetailsStep,
  RoleChangeContent,
  RoleChangeCancelButton,
  ConfirmDeleteCodeButton,
  TeamMemberListItem,
  InviteCodeListItem,
} from '@/components/team'
import { DrillDownHeader } from '@/components/layout/DrillDownHeader'

interface TeamDrilldownProps {
  businessId: string
}

function GenerateOrConfirmButton({
  isGenerating,
  selectedRole,
  onGenerate,
}: {
  isGenerating: boolean
  selectedRole: 'partner' | 'employee'
  onGenerate: () => Promise<void>
}) {
  const t = useTranslations('team')
  const { goToStep, lock, unlock } = useModal()

  const handleClick = async () => {
    if (selectedRole === 'partner') {
      goToStep(4)
    } else {
      lock()
      await onGenerate()
      unlock()
      goToStep(1)
    }
  }

  return (
    <button
      type="button"
      className="btn btn-primary flex-1"
      disabled={isGenerating}
      onClick={handleClick}
    >
      {isGenerating ? <Spinner /> : t('generate_code_button')}
    </button>
  )
}

function ConfirmGenerateButton({
  isGenerating,
  onGenerate,
}: {
  isGenerating: boolean
  onGenerate: () => Promise<void>
}) {
  const t = useTranslations('team')
  const { goToStep, lock, unlock } = useModal()

  const handleClick = async () => {
    lock()
    await onGenerate()
    unlock()
    goToStep(1)
  }

  return (
    <button
      type="button"
      className="btn btn-primary flex-1"
      disabled={isGenerating}
      onClick={handleClick}
    >
      {isGenerating ? <Spinner /> : t('partner_warning_confirm')}
    </button>
  )
}

function RoleChangeSaveOrConfirmButton({
  roleChangeLoading,
  isDisabled,
  newRole,
  onSubmit,
}: {
  roleChangeLoading: boolean
  isDisabled: boolean
  newRole: 'partner' | 'employee'
  onSubmit: () => Promise<boolean>
}) {
  const tCommon = useTranslations('common')
  const { goToStep } = useModal()

  const handleClick = () => {
    if (newRole === 'partner') {
      goToStep(2)
    } else {
      goToStep(0)
      void onSubmit()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-primary flex-1"
      disabled={roleChangeLoading || isDisabled}
    >
      {roleChangeLoading ? <Spinner /> : tCommon('save')}
    </button>
  )
}

function ConfirmRoleChangeButton({
  roleChangeLoading,
  onSubmit,
}: {
  roleChangeLoading: boolean
  onSubmit: () => Promise<boolean>
}) {
  const t = useTranslations('team')
  const { goToStep } = useModal()

  const handleClick = () => {
    goToStep(0)
    void onSubmit()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-primary flex-1"
      disabled={roleChangeLoading}
    >
      {roleChangeLoading ? <Spinner /> : t('partner_warning_confirm')}
    </button>
  )
}

function ConfirmRemoveMemberButton({
  removeLoading,
  onSubmit,
}: {
  removeLoading: boolean
  onSubmit: () => Promise<void>
}) {
  const t = useTranslations('team')
  return (
    <button
      type="button"
      className="btn btn-danger flex-1"
      disabled={removeLoading}
      onClick={() => void onSubmit()}
    >
      {removeLoading ? <Spinner /> : t('remove_confirm')}
    </button>
  )
}

export function TeamDrilldown({ businessId }: TeamDrilldownProps) {
  const router = useRouter()
  const t = useTranslations('team')
  const tCommon = useTranslations('common')
  const tNav = useTranslations('navigation')
  const { user } = useAuth()

  const {
    sortedTeamMembers,
    teamMembers,
    inviteCodes,
    isLoading,
    error,
    canManageTeam,
    callerRole,
    selectedRole,
    setSelectedRole,
    selectedDuration,
    setSelectedDuration,
    newCode,
    newCodeExpiresAt,
    qrDataUrl,
    isGenerating,
    copyFeedback,
    handleGenerateCode,
    handleRegenerateCode,
    handleCopyCode,
    handleDeleteCode,
    isDeletingCode,
    codeDeleted,
    isModalOpen,
    handleOpenModal,
    handleOpenExistingCode,
    handleCloseModal,
    handleModalExitComplete,
    selectedMember,
    isUserModalOpen,
    newRole,
    setNewRole,
    roleChangeLoading,
    removeLoading,
    handleOpenUserModal,
    handleCloseUserModal,
    handleUserModalExitComplete,
    handleToggleUserStatus,
    handleSubmitRoleChange,
    handleRemoveMember,
  } = useTeamManagement({ businessId })

  return (
    <>
      <DrillDownHeader title={tNav('team')} onBack={() => router.back()} />
      {isLoading ? (
        <main className="page-loading">
          <Spinner className="spinner-lg" />
        </main>
      ) : (
        <main className="page-content space-y-6">
          {error && (
            <div className="p-4 bg-error-subtle text-error rounded-lg">
              {error}
            </div>
          )}

          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                {t('member_count', { count: teamMembers.length })}
              </span>
              {canManageTeam && (
                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="btn btn-primary"
                  style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)', minHeight: 'unset', gap: 'var(--space-2)', borderRadius: 'var(--radius-full)' }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  {t('add_member_button')}
                </button>
              )}
            </div>

            <hr className="border-border" />

            <div className="list-divided">
              {sortedTeamMembers.map((member, i) => (
                <Fragment key={member.id}>
                  {i > 0 && <hr className="list-divider" />}
                  <TeamMemberListItem
                    member={member}
                    isSelf={member.id === user?.id}
                    onClick={() => handleOpenUserModal(member)}
                  />
                </Fragment>
              ))}
            </div>
          </div>

          {canManageTeam && inviteCodes.length > 0 && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {t('active_code_count', { count: inviteCodes.length })}
                </span>
              </div>

              <hr className="border-border" />

              <div className="list-divided">
                {inviteCodes.map((code, i) => (
                  <Fragment key={code.id}>
                    {i > 0 && <hr className="list-divider" />}
                    <InviteCodeListItem
                      code={code}
                      onClick={() => handleOpenExistingCode(code)}
                    />
                  </Fragment>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onExitComplete={handleModalExitComplete}
        initialStep={newCode ? 1 : 0}
      >
        <Modal.Step title={t('step_add_member')}>
          <DurationPicker
            selected={selectedDuration}
            onSelect={setSelectedDuration}
          />
          <RoleSelectionContent
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
          />
          <Modal.Footer>
            <Modal.CancelBackButton />
            <GenerateOrConfirmButton
              isGenerating={isGenerating}
              selectedRole={selectedRole}
              onGenerate={handleGenerateCode}
            />
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title={t('step_code_generated')} hideBackButton>
          {newCode && (
            <CodeGeneratedContent
              selectedRole={selectedRole}
              newCode={newCode}
              expiresAt={newCodeExpiresAt!}
              qrDataUrl={qrDataUrl}
              isGenerating={isGenerating}
              onRegenerate={handleRegenerateCode}
            />
          )}
          <Modal.Footer>
            <Modal.GoToStepButton step={2} className="btn btn-secondary btn-icon" title={t('step_delete_code')}>
              <Trash2 className="text-error" style={{ width: 16, height: 16 }} />
            </Modal.GoToStepButton>
            <button
              type="button"
              onClick={() => newCode && handleCopyCode(newCode)}
              className="btn btn-secondary btn-icon"
            >
              {copyFeedback === newCode ? (
                <Check className="text-success" style={{ width: 16, height: 16 }} />
              ) : (
                <Copy style={{ width: 16, height: 16 }} />
              )}
            </button>
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-primary flex-1"
            >
              {tCommon('done')}
            </button>
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title={t('step_delete_code')} backStep={1}>
          <Modal.Item>
            <p className="text-text-secondary">
              {t('delete_code_description', { code: newCode ?? '' })}
            </p>
          </Modal.Item>
          <Modal.Footer>
            <Modal.GoToStepButton step={1} className="btn btn-secondary flex-1" disabled={isDeletingCode}>
              {tCommon('cancel')}
            </Modal.GoToStepButton>
            <ConfirmDeleteCodeButton
              isDeletingCode={isDeletingCode}
              onDelete={handleDeleteCode}
            />
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title={t('step_code_deleted')} hideBackButton>
          <Modal.Item>
            <ConfirmationAnimation
              type="error"
              triggered={codeDeleted}
              title={t('code_deleted_heading')}
              subtitle={t('code_deleted_description')}
            />
          </Modal.Item>
          <Modal.Footer>
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-primary flex-1"
            >
              {tCommon('close')}
            </button>
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title={t('step_partner_warning')} backStep={0}>
          <Modal.Item>
            <h3 className="text-lg font-semibold text-text-primary">{t('partner_warning_heading')}</h3>
            <p className="text-sm text-text-secondary mt-2">{t('partner_warning_body')}</p>
          </Modal.Item>
          <Modal.Footer>
            <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1" disabled={isGenerating}>
              {tCommon('cancel')}
            </Modal.GoToStepButton>
            <ConfirmGenerateButton
              isGenerating={isGenerating}
              onGenerate={handleGenerateCode}
            />
          </Modal.Footer>
        </Modal.Step>
      </Modal>

      <Modal
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
        onExitComplete={handleUserModalExitComplete}
      >
        <Modal.Step
          title={selectedMember?.id === user?.id ? t('step_your_profile') : t('step_manage_member')}
          hideBackButton
        >
          {selectedMember && (
            <UserDetailsStep
              member={selectedMember}
              currentUser={user}
              canManageTeam={canManageTeam}
              callerRole={callerRole}
              onToggleStatus={handleToggleUserStatus}
            />
          )}
        </Modal.Step>

        <Modal.Step title={t('step_change_role')} backStep={0}>
          {selectedMember && (
            <RoleChangeContent
              memberName={selectedMember.name}
              newRole={newRole}
              setNewRole={setNewRole}
            />
          )}
          <Modal.Footer>
            <RoleChangeCancelButton disabled={roleChangeLoading} />
            <RoleChangeSaveOrConfirmButton
              roleChangeLoading={roleChangeLoading}
              isDisabled={selectedMember ? newRole === selectedMember.role : false}
              newRole={newRole}
              onSubmit={handleSubmitRoleChange}
            />
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title={t('step_partner_warning')} backStep={1}>
          <Modal.Item>
            <h3 className="text-lg font-semibold text-text-primary">{t('partner_warning_heading')}</h3>
            <p className="text-sm text-text-secondary mt-2">{t('partner_warning_body')}</p>
          </Modal.Item>
          <Modal.Footer>
            <Modal.GoToStepButton step={1} className="btn btn-secondary flex-1" disabled={roleChangeLoading}>
              {tCommon('cancel')}
            </Modal.GoToStepButton>
            <ConfirmRoleChangeButton
              roleChangeLoading={roleChangeLoading}
              onSubmit={handleSubmitRoleChange}
            />
          </Modal.Footer>
        </Modal.Step>

        <Modal.Step title={t('step_remove_member')} backStep={0}>
          {selectedMember && (
            <Modal.Item>
              <h3 className="text-lg font-semibold text-text-primary">
                {t('remove_warning_heading', { name: selectedMember.name })}
              </h3>
              <p className="text-sm text-text-secondary mt-2">
                {t('remove_warning_body', { name: selectedMember.name })}
              </p>
            </Modal.Item>
          )}
          <Modal.Footer>
            <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1" disabled={removeLoading}>
              {tCommon('cancel')}
            </Modal.GoToStepButton>
            <ConfirmRemoveMemberButton
              removeLoading={removeLoading}
              onSubmit={async () => {
                const ok = await handleRemoveMember()
                if (ok) handleCloseUserModal()
              }}
            />
          </Modal.Footer>
        </Modal.Step>
      </Modal>
    </>
  )
}
