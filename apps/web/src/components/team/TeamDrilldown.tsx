'use client'

import { useMemo } from 'react'
import { useIntl } from 'react-intl'
import { Plus } from 'lucide-react'
import { PageSpinner } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { useTeamManagement, type TeamMember } from '@/hooks/useTeamManagement'
import { TeamMemberListItem, InviteCodeListItem } from '@/components/team'
import { InviteModal } from './InviteModal'
import { MemberModal } from './MemberModal'

interface TeamDrilldownProps {
  businessId: string
}

/**
 * Team roster — Modern Mercantile (unified).
 *
 * The page reads like a printed roster slip but uses one row primitive
 * for every line on it:
 *   - Hero band: "TEAM · N PEOPLE" eyebrow → Fraunces italic
 *     "Your roster" / "The team" → italic subtitle. A terracotta Invite
 *     pill anchors the right side for managers.
 *   - Roster: a single ledger covering owner, partners, employees, and
 *     disabled members in one frame. Owner is just the first row;
 *     inactive members trail at the bottom dimmed. Each row carries a
 *     mono caption (ROLE [· YOU] [· DISABLED]) instead of a chip + dot.
 *   - Pending: a quiet "PENDING · N" mono label above a second ledger of
 *     the same row primitive — the 6-char code as the primary line, role
 *     and expiry as the mono caption.
 *
 * The wrapping `IonHeader` + `IonBackButton` + `IonContent` are
 * provided by `TeamTab`; this component renders the body only.
 *
 * Data flow remains untouched — every field comes verbatim from
 * `useTeamManagement({ businessId })`.
 */
export function TeamDrilldown({ businessId }: TeamDrilldownProps) {
  const t = useIntl()
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

  // Flatten the sorted list into one ordered ledger: owner first, then
  // active members, then any disabled members (which render dimmed via
  // the row primitive). Pending invites stay in their own list below.
  const orderedRoster = useMemo(() => {
    let owner: TeamMember | null = null
    const active: TeamMember[] = []
    const inactive: TeamMember[] = []
    for (const member of sortedTeamMembers) {
      if (member.role === 'owner' && !owner && member.status === 'active') {
        owner = member
        continue
      }
      if (member.status === 'disabled') inactive.push(member)
      else active.push(member)
    }
    return owner ? [owner, ...active, ...inactive] : [...active, ...inactive]
  }, [sortedTeamMembers])

  const peopleCount = teamMembers.length

  // Pick the manager / employee variant of the hero copy. Managers see
  // "Your roster"; employees see "The team" — same tone, different
  // ownership framing.
  const titleId = canManageTeam ? 'team.roster.title_manager' : 'team.roster.title_employee'
  const subtitleId = canManageTeam
    ? 'team.roster.subtitle_manager'
    : 'team.roster.subtitle_employee'

  // Solo-owner empty state: a brand-new business has only the owner row
  // and zero pending invites. Without a nudge the page would just trail
  // off — show a line directing the manager to the Invite pill.
  const showSoloEmptyState =
    canManageTeam && orderedRoster.length <= 1 && inviteCodes.length === 0

  // Early-return the spinner so the modals below mount only AFTER the
  // page is in its loaded state. Mounting IonModal alongside a loading
  // spinner left IonNav in a half-initialized state — when the user
  // later opened a modal, IonNav's root step animated in as if it were
  // a fresh push (horizontal slide), stacking on top of IonModal's
  // slide-up and reading as a diagonal entrance. ProductsView uses this
  // same early-return pattern for the same reason.
  if (isLoading) {
    return <PageSpinner />
  }

  return (
    <>
      <div className="tm-roster">
        {/* Hero band */}
          <header className="tm-roster__hero">
            <div className="tm-roster__hero-text">
              <span className="pm-hero__eyebrow">
                {t.formatMessage(
                  { id: 'team.roster.eyebrow' },
                  { count: peopleCount },
                )}
              </span>
              <h1 className="pm-hero__title">
                {t.formatMessage(
                  { id: titleId },
                  { em: (chunks) => <em>{chunks}</em> },
                )}
              </h1>
              <p className="pm-hero__subtitle">
                {t.formatMessage({ id: subtitleId })}
              </p>
            </div>
            {canManageTeam && (
              <button
                type="button"
                className="tm-roster__invite-pill"
                onClick={handleOpenModal}
                aria-label={t.formatMessage({ id: 'team.roster.invite_aria' })}
              >
                <Plus aria-hidden="true" />
                {t.formatMessage({ id: 'team.roster.invite_button' })}
              </button>
            )}
          </header>

          {error && (
            <div className="tm-roster__error" role="alert">
              <span className="tm-roster__error-eyebrow">
                {t.formatMessage({ id: 'team.roster.error_eyebrow' })}
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* Solo-owner empty state — only when there's nothing else to show. */}
          {showSoloEmptyState && (
            <p className="tm-roster__solo-hint">
              {t.formatMessage(
                { id: 'team.roster.solo_hint' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </p>
          )}

          {/* Roster ledger — owner, active members, and any disabled
              members all flow into one frame. Disabled rows render dimmed
              with a "DISABLED" mono token in the caption. */}
          {orderedRoster.length > 0 && (
            <section className="tm-roster__section">
              <div className="tm-roster__section-list">
                {orderedRoster.map((member) => (
                  <TeamMemberListItem
                    key={member.id}
                    member={member}
                    isSelf={member.id === user?.id}
                    onClick={() => handleOpenUserModal(member)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Pending invites — manager-only, identical row primitive. */}
          {canManageTeam && inviteCodes.length > 0 && (
            <section className="tm-roster__section">
              <span className="tm-roster__section-eyebrow">
                {t.formatMessage({ id: 'team.roster.section_pending' })}
                <span className="tm-roster__section-eyebrow-count">
                  · {inviteCodes.length}
                </span>
              </span>
              <div className="tm-roster__section-list">
                {inviteCodes.map((code) => (
                  <InviteCodeListItem
                    key={code.id}
                    code={code}
                    onClick={() => handleOpenExistingCode(code)}
                  />
                ))}
              </div>
            </section>
          )}
      </div>

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
  )
}
