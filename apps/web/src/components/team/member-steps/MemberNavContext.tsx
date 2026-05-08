import { createContext, useContext } from 'react'
import type { User, UserRole } from '@kasero/shared/types'
import type { TeamMember } from '@/hooks/useTeamManagement'

// ---------------------------------------------------------------------------
// Nav ref context — steps call navRef.current?.push / .pop to navigate.
// ---------------------------------------------------------------------------

export const MemberNavRefContext = createContext<React.RefObject<HTMLIonNavElement | null> | null>(null)

export function useMemberNavRef(): React.RefObject<HTMLIonNavElement | null> {
  const ctx = useContext(MemberNavRefContext)
  if (!ctx) throw new Error('useMemberNavRef must be used inside MemberModal')
  return ctx
}

// ---------------------------------------------------------------------------
// Shared callbacks + state for MemberModal steps
// ---------------------------------------------------------------------------

export interface MemberCallbacks {
  onClose: () => void

  member: TeamMember
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

export const MemberCallbacksContext = createContext<MemberCallbacks | null>(null)

export function useMemberCallbacks(): MemberCallbacks {
  const ctx = useContext(MemberCallbacksContext)
  if (!ctx) throw new Error('useMemberCallbacks must be used inside MemberModal')
  return ctx
}
