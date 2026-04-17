'use client'

import { useEffect } from 'react'
import { Trash2, Plus, Check, Copy } from 'lucide-react'
import { Spinner, Modal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/auth-context'
import { useBusiness } from '@/contexts/business-context'
import { useNavbar } from '@/contexts/navbar-context'
import { useTeamManagement } from '@/hooks'
import {
  RoleSelectionContent,
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

export default function TeamPage() {
  const t = useTranslations('team')
  const tCommon = useTranslations('common')
  const { user } = useAuth()
  const { businessId } = useBusiness()
  const { hide, show } = useNavbar()

  // Team is a drill-down page (not in bottom nav). Hide the bottom nav while
  // viewing so it feels like a focused detail flow, matching Account settings.
  useEffect(() => {
    hide()
    return () => show()
  }, [hide, show])

  const {
    // Data
    sortedTeamMembers,
    teamMembers,
    inviteCodes,
    isLoading,
    error,

    // Permission
    canManageTeam,

    // Invite code state
    selectedRole,
    setSelectedRole,
    newCode,
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
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4" />
                  {t('add_member_button')}
                </button>
              )}
            </div>

            <hr className="border-border" />

            <div className="space-y-2">
              {sortedTeamMembers.map((member) => (
                <TeamMemberListItem
                  key={member.id}
                  member={member}
                  isSelf={member.id === user?.id}
                  onClick={() => handleOpenUserModal(member)}
                />
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

              <div className="space-y-2">
                {inviteCodes.map((code) => (
                  <InviteCodeListItem
                    key={code.id}
                    code={code}
                    onClick={() => handleOpenExistingCode(code)}
                  />
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
              qrDataUrl={qrDataUrl}
              isGenerating={isGenerating}
              onRegenerate={handleRegenerateCode}
            />
          )}
          <Modal.Footer>
            <Modal.GoToStepButton step={2} className="btn btn-secondary">
              <Trash2 className="w-5 h-5" />
            </Modal.GoToStepButton>
            <button
              type="button"
              onClick={() => newCode && handleCopyCode(newCode)}
              className="btn btn-secondary"
              title={t('step_delete_code')}
            >
              {copyFeedback === newCode ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <Copy className="w-5 h-5" />
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
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {t('delete_code_heading')}
              </h3>
              <p className="text-sm text-text-secondary">
                {t('delete_code_description', { code: newCode ?? '' })}
              </p>
            </div>
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
            <div className="flex flex-col items-center text-center py-4">
              <div style={{ width: 160, height: 160 }}>
                {codeDeleted && (
                  <LottiePlayer
                    src="/animations/error.json"
                    loop={false}
                    autoplay={true}
                    delay={500}
                    style={{ width: 160, height: 160 }}
                  />
                )}
              </div>
              <p
                className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
                style={{ opacity: codeDeleted ? 1 : 0 }}
              >
                {t('code_deleted_heading')}
              </p>
              <p
                className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
                style={{ opacity: codeDeleted ? 1 : 0 }}
              >
                {t('code_deleted_description')}
              </p>
            </div>
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
