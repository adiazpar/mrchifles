'use client'

import { useRef } from 'react'
import { IonNav } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import type { InviteRole } from '@kasero/shared/types'
import type { InviteDuration } from '@kasero/shared/auth'
import {
  InviteNavRefContext,
  InviteCallbacksContext,
  type InviteCallbacks,
} from './invite-steps/InviteNavContext'
import { InviteRoleStep } from './invite-steps/InviteRoleStep'
import { InviteCodeStep } from './invite-steps/InviteCodeStep'

export interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  selectedRole: InviteRole
  setSelectedRole: (role: InviteRole) => void

  selectedDuration: InviteDuration
  setSelectedDuration: (d: InviteDuration) => void

  newCode: string | null
  newCodeExpiresAt: Date | null
  qrDataUrl: string | null
  isGenerating: boolean
  copyFeedback: string | null

  onGenerateCode: () => Promise<void>
  onRegenerateCode: () => Promise<void>
  onCopyCode: (code: string) => void
  onDeleteCode: () => Promise<boolean>
  isDeletingCode: boolean
  codeDeleted: boolean
}

export function InviteModal({
  isOpen,
  onClose,
  onExitComplete,
  selectedRole,
  setSelectedRole,
  selectedDuration,
  setSelectedDuration,
  newCode,
  newCodeExpiresAt,
  qrDataUrl,
  isGenerating,
  copyFeedback,
  onGenerateCode,
  onRegenerateCode,
  onCopyCode,
  onDeleteCode,
  isDeletingCode,
  codeDeleted,
}: InviteModalProps) {
  const navRef = useRef<HTMLIonNavElement>(null)

  const handleClose = () => {
    onClose()
    onExitComplete()
  }

  const callbacks: InviteCallbacks = {
    onClose: handleClose,
    selectedRole,
    setSelectedRole,
    selectedDuration,
    setSelectedDuration,
    newCode,
    newCodeExpiresAt,
    qrDataUrl,
    isGenerating,
    copyFeedback,
    onGenerateCode,
    onRegenerateCode,
    onCopyCode,
    onDeleteCode,
    isDeletingCode,
    codeDeleted,
  }

  // If there's already a code (opened from existing invite code list item),
  // start on the code view; otherwise start on role selection.
  const rootComponent = newCode
    ? () => <InviteCodeStep />
    : () => <InviteRoleStep />

  return (
    <InviteCallbacksContext.Provider value={callbacks}>
      <InviteNavRefContext.Provider value={navRef}>
        <ModalShell rawContent isOpen={isOpen} onClose={handleClose}>
          <IonNav ref={navRef} root={rootComponent} />
        </ModalShell>
      </InviteNavRefContext.Provider>
    </InviteCallbacksContext.Provider>
  )
}
