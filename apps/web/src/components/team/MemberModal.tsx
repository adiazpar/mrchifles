'use client'

import { useRef, useCallback, useEffect } from 'react'
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

  // Delayed cleanup — runs ~250ms after the modal animates closed.
  // useTeamManagement wires onExitComplete to setSelectedMember(null), and
  // this component early-returns null when member is null, so calling
  // onExitComplete synchronously alongside onClose would unmount the modal
  // mid-dismiss-animation, leaving a stale view in the IonRouterOutlet
  // stack machine and silently breaking subsequent business-tab switching.
  // Same pattern as AddProductModal.
  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(onExitComplete, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onExitComplete])

  if (!member) return null

  const callbacks: MemberCallbacks = {
    onClose,
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
        <ModalShell rawContent isOpen={isOpen} onClose={onClose}>
          <IonNav ref={navRef} root={detailsStepRoot} swipeGesture={false} />
        </ModalShell>
      </MemberNavRefContext.Provider>
    </MemberCallbacksContext.Provider>
  )
}
