'use client'

import { Fragment } from 'react'
import { Plus, Check, Copy, Trash2 } from 'lucide-react'
import { Spinner, Modal, ConfirmationAnimation } from '@/components/ui'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/auth-context'
import { useBusiness } from '@/contexts/business-context'
import { useTeamManagement } from '@/hooks'
import {
  RoleSelectionContent,
  DurationPicker,
  CodeGeneratedContent,
  UserDetailsStep,
  RoleChangeContent,
  RoleChangeSaveButton,
  RoleChangeCancelButton,
  GenerateCodeButton,
  ConfirmDeleteCodeButton,
  TeamMemberListItem,
  InviteCodeListItem,
} from '@/components/team'

export function TeamView() {
  const t = useTranslations('team')
  const tCommon = useTranslations('common')
  const { user } = useAuth()
  const { businessId } = useBusiness()

  const {
    // Data
    sortedTeamMembers,
    teamMembers,
    inviteCodes,
    isLoading,
    error,

    // Permission
    canManageTeam,
    callerRole,

    // Invite code state
    selectedRole,
    setSelectedRole,
    selectedDuration,
    setSelectedDuration,
    newCode,
    newCodeExpiresAt,
    qrDataUrl,
    isGenerating,
    copyFeedback,

    // Invite code actions
    handleGenerateCode,
    handleRegenerateCode,
    handleCopyCode,
    handleDeleteCode,
    isDeletingCode,
    codeDeleted,

    // Invite modal state
    isModalOpen,
    handleOpenModal,
    handleOpenExistingCode,
    handleCloseModal,
    handleModalExitComplete,

    // User management state
    selectedMember,
    isUserModalOpen,
    newRole,
    setNewRole,
    roleChangeLoading,

    // User management actions
    handleOpenUserModal,
    handleCloseUserModal,
    handleUserModalExitComplete,
    handleToggleUserStatus,
    handleSubmitRoleChange,
  } = useTeamManagement({ businessId: businessId || '' })

  if (isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  return (
    <>
      <main className="page-content space-y-6">
        {error && (
            <div className="p-4 bg-error-subtle text-error rounded-lg">
              {error}
            </div>
          )}

          {/* Team Members Card */}
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

          {/* Active Invite Codes Card */}
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

      {/* Add Member Modal */}
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
            <GenerateCodeButton
              isGenerating={isGenerating}
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
      </Modal>

      {/* User Management Modal */}
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
            <RoleChangeSaveButton
              roleChangeLoading={roleChangeLoading}
              isDisabled={selectedMember ? newRole === selectedMember.role : false}
              onSubmit={handleSubmitRoleChange}
            />
          </Modal.Footer>
        </Modal.Step>
      </Modal>
    </>
  )
}
