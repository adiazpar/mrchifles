'use client'

import { useRef, useCallback } from 'react'
import { IonNav } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import type { User, UserRole } from '@kasero/shared/types'
import type { TeamMember } from '@/hooks/useTeamManagement'
import {
  MemberNavRefContext,
  MemberCallbacksContext,
  type MemberCallbacks,
} from './member-steps/MemberNavContext'
import { MemberDetailsStep } from './member-steps/MemberDetailsStep'

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

export function MemberModal({
  isOpen,
  onClose,
  onExitComplete,
  member,
  currentUser,
  canManageTeam,
  callerRole,
  newRole,
  setNewRole,
  roleChangeLoading,
  removeLoading,
  onToggleStatus,
  onSubmitRoleChange,
  onRemoveMember,
}: MemberModalProps) {
  const navRef = useRef<HTMLIonNavElement>(null)

  // Stable root thunk — defined outside render via useCallback so IonNav never
  // sees a new function reference between re-renders and avoids remounting.
  // Must run before any early return so hook order stays stable.
  const detailsStepRoot = useCallback(() => <MemberDetailsStep />, [])

  if (!member) return null

  const handleClose = () => {
    onClose()
    onExitComplete()
  }

  const callbacks: MemberCallbacks = {
    onClose: handleClose,
    member,
    currentUser,
    canManageTeam,
    callerRole,
    newRole,
    setNewRole,
    roleChangeLoading,
    removeLoading,
    onToggleStatus,
    onSubmitRoleChange,
    onRemoveMember,
  }

  return (
    <MemberCallbacksContext.Provider value={callbacks}>
      <MemberNavRefContext.Provider value={navRef}>
        <ModalShell rawContent isOpen={isOpen} onClose={handleClose}>
          <IonNav ref={navRef} root={detailsStepRoot} swipeGesture={false} />
        </ModalShell>
      </MemberNavRefContext.Provider>
    </MemberCallbacksContext.Provider>
  )
}
