'use client'

import { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/react'
import { close, chevronBack } from 'ionicons/icons'
import { ModalShell } from '@/components/ui'
import type { User, UserRole } from '@kasero/shared/types'
import type { TeamMember } from '@/hooks/useTeamManagement'
import { MemberDetailsBody } from './member-steps/MemberDetailsStep'
import { MemberRoleChangeBody } from './member-steps/MemberRoleChangeStep'
import { MemberPartnerWarningBody } from './member-steps/MemberPartnerWarningStep'
import { MemberRemoveBody } from './member-steps/MemberRemoveStep'

type Step = 'details' | 'role-change' | 'partner-warn' | 'remove'

export interface MemberModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  member: TeamMember | null
  currentUser: User | null
  canManageTeam: boolean
  callerRole: UserRole | null

  newRole: 'partner' | 'employee'
  setNewRole: (role: 'partner' | 'employee') => void

  roleChangeLoading: boolean
  removeLoading: boolean

  onToggleStatus: () => void
  onSubmitRoleChange: () => Promise<boolean>
  onRemoveMember: () => Promise<boolean>
}

/**
 * Member detail + management flow. Pattern 1 (single `step` state,
 * conditional body rendering inside one ModalShell). The previous
 * IonNav-based version registered each step's `<IonPage>` against the
 * surrounding IonRouterOutlet's StackManager, which left the outlet's
 * view-stack tracking in a state that made the next iOS slide pop
 * (e.g. team -> manage) drag for ~1-2s. See InviteModal for the full
 * note.
 *
 * `rawContent` so we keep the team modal's `.pm-header / .pm-content /
 * .pm-footer` styling that the default ModalShell IonContent doesn't
 * apply.
 */
export function MemberModal({
  isOpen,
  onClose,
  onExitComplete,
  member,
  currentUser,
  canManageTeam,
  callerRole,
  setNewRole,
  roleChangeLoading,
  removeLoading,
  onToggleStatus,
  onSubmitRoleChange,
  onRemoveMember,
}: MemberModalProps) {
  const t = useIntl()
  const [step, setStep] = useState<Step>('details')

  // Reset to root surface every time the modal opens. The same modal
  // is reused across different members, so without this it could open
  // on a stale step from the previous member's flow.
  useEffect(() => {
    if (isOpen) setStep('details')
  }, [isOpen])

  // Delayed cleanup — runs ~250ms after dismiss animation so the
  // parent's handleUserModalExitComplete (clears selectedMember) does
  // not unmount the modal mid animation.
  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(onExitComplete, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onExitComplete])

  if (!member) return null

  const isSelf = member.id === currentUser?.id
  const isPartnerOnPartner = callerRole === 'partner' && member.role === 'partner'
  const isManageable =
    canManageTeam && !isSelf && member.role !== 'owner' && !isPartnerOnPartner
  const isPromoting = member.role === 'employee'

  // Title is only shown on the details step (matches the prior
  // toolbar that rendered an IonTitle there). Sub-steps' toolbars
  // were title-less; they leaned on the body's hero to set context.
  const modalTitleId = isSelf
    ? 'team.member_v2.step_title_self'
    : 'team.member_v2.step_title_other'

  const onBack: (() => void) | undefined =
    step === 'details' ? undefined : () => setStep('details')

  const handleChangeRoleTap = () => {
    // Pre-set the proposed direction so the role-change / warning
    // step opens with the right radio selected, then advance.
    setNewRole(isPromoting ? 'partner' : 'employee')
    setStep(isPromoting ? 'partner-warn' : 'role-change')
  }

  const handleRoleChangeConfirm = () => {
    void onSubmitRoleChange()
    setStep('details')
  }

  const handleRemoveConfirm = async () => {
    const ok = await onRemoveMember()
    if (ok) onClose()
  }

  // Footer derived per step. Details step has no footer (its actions
  // are inline action ladder buttons in the body).
  let footer: React.ReactNode = null
  if (step === 'role-change' || step === 'partner-warn') {
    const isDanger = step === 'partner-warn'
    footer = (
      <IonButton
        color={isDanger ? 'danger' : undefined}
        onClick={handleRoleChangeConfirm}
        disabled={roleChangeLoading}
      >
        {roleChangeLoading ? (
          <IonSpinner name="crescent" />
        ) : (
          t.formatMessage({
            id: isDanger
              ? 'team.member_v2.partner_warning_confirm'
              : 'team.member_v2.role_change_confirm',
          })
        )}
      </IonButton>
    )
  } else if (step === 'remove') {
    footer = (
      <IonButton
        color="danger"
        onClick={handleRemoveConfirm}
        disabled={removeLoading}
      >
        {removeLoading ? (
          <IonSpinner name="crescent" />
        ) : (
          t.formatMessage({ id: 'team.member_v2.remove_confirm' })
        )}
      </IonButton>
    )
  }

  return (
    <ModalShell rawContent isOpen={isOpen} onClose={onClose}>
      <IonHeader className="pm-header">
        <IonToolbar>
          {onBack && (
            <IonButtons slot="start">
              <IonButton
                fill="clear"
                onClick={onBack}
                aria-label={t.formatMessage({ id: 'common.back' })}
              >
                <IonIcon icon={chevronBack} />
              </IonButton>
            </IonButtons>
          )}
          {step === 'details' && (
            <IonTitle>{t.formatMessage({ id: modalTitleId })}</IonTitle>
          )}
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={onClose}
              aria-label={t.formatMessage({ id: 'common.close' })}
            >
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        {step === 'details' && (
          <MemberDetailsBody
            member={member}
            isSelf={isSelf}
            isManageable={isManageable}
            isPromoting={isPromoting}
            onChangeRole={handleChangeRoleTap}
            onToggleStatus={onToggleStatus}
            onRemove={() => setStep('remove')}
            onCloseSelfFooterLink={onClose}
          />
        )}
        {step === 'role-change' && <MemberRoleChangeBody member={member} />}
        {step === 'partner-warn' && <MemberPartnerWarningBody member={member} />}
        {step === 'remove' && <MemberRemoveBody member={member} />}
      </IonContent>

      {footer && (
        <IonFooter className="pm-footer">
          <IonToolbar>
            <div className="modal-footer">{footer}</div>
          </IonToolbar>
        </IonFooter>
      )}
    </ModalShell>
  )
}
