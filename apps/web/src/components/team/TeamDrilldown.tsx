'use client'

import { useIntl } from 'react-intl';
import { Plus } from 'lucide-react'
import { IonButton, IonList, IonSpinner } from '@ionic/react'
import { useAuth } from '@/contexts/auth-context'
import { useTeamManagement } from '@/hooks'
import {
  TeamMemberListItem,
  InviteCodeListItem,
} from '@/components/team'
import { InviteModal } from './InviteModal'
import { MemberModal } from './MemberModal'

interface TeamDrilldownProps {
  businessId: string
}

/**
 * The wrapping `IonHeader` + `IonBackButton` inside `TeamTab` provides
 * the title and back affordance for this view.
 */
export function TeamDrilldown({ businessId }: TeamDrilldownProps) {
  const intl = useIntl()
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
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <IonSpinner name="crescent" />
        </div>
      ) : (
        <div className="px-4 py-6 space-y-6">
          {error && (
            <div className="p-4 bg-error-subtle text-error rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-bg-surface rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-border">
              <span className="text-sm text-text-secondary">
                {intl.formatMessage({ id: 'team.member_count' }, { count: teamMembers.length })}
              </span>
              {canManageTeam && (
                <IonButton onClick={handleOpenModal} size="small" shape="round">
                  <Plus style={{ width: 14, height: 14 }} />
                  {intl.formatMessage({ id: 'team.add_member_button' })}
                </IonButton>
              )}
            </div>
            <IonList lines="full">
              {sortedTeamMembers.map((member) => (
                <TeamMemberListItem
                  key={member.id}
                  member={member}
                  isSelf={member.id === user?.id}
                  onClick={() => handleOpenUserModal(member)}
                />
              ))}
            </IonList>
          </div>

          {canManageTeam && inviteCodes.length > 0 && (
            <div className="bg-bg-surface rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <span className="text-sm text-text-secondary">
                  {intl.formatMessage({ id: 'team.active_code_count' }, { count: inviteCodes.length })}
                </span>
              </div>
              <IonList lines="full">
                {inviteCodes.map((code) => (
                  <InviteCodeListItem
                    key={code.id}
                    code={code}
                    onClick={() => handleOpenExistingCode(code)}
                  />
                ))}
              </IonList>
            </div>
          )}
        </div>
      )}

      <InviteModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onExitComplete={handleModalExitComplete}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
        selectedDuration={selectedDuration}
        setSelectedDuration={setSelectedDuration}
        newCode={newCode}
        newCodeExpiresAt={newCodeExpiresAt}
        qrDataUrl={qrDataUrl}
        isGenerating={isGenerating}
        copyFeedback={copyFeedback}
        onGenerateCode={handleGenerateCode}
        onRegenerateCode={handleRegenerateCode}
        onCopyCode={handleCopyCode}
        onDeleteCode={handleDeleteCode}
        isDeletingCode={isDeletingCode}
        codeDeleted={codeDeleted}
      />

      <MemberModal
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
        onExitComplete={handleUserModalExitComplete}
        member={selectedMember}
        currentUser={user}
        canManageTeam={canManageTeam}
        callerRole={callerRole}
        newRole={newRole}
        setNewRole={setNewRole}
        roleChangeLoading={roleChangeLoading}
        removeLoading={removeLoading}
        onToggleStatus={handleToggleUserStatus}
        onSubmitRoleChange={handleSubmitRoleChange}
        onRemoveMember={handleRemoveMember}
      />
    </>
  );
}
