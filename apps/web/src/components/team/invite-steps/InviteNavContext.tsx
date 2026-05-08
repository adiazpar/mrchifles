import { createContext, useContext } from 'react'
import type { InviteRole } from '@kasero/shared/types'
import type { InviteDuration } from '@kasero/shared/auth'

// ---------------------------------------------------------------------------
// Nav ref context — steps call navRef.current?.push / .pop to navigate.
// ---------------------------------------------------------------------------

export const InviteNavRefContext = createContext<React.RefObject<HTMLIonNavElement | null> | null>(null)

export function useInviteNavRef(): React.RefObject<HTMLIonNavElement | null> {
  const ctx = useContext(InviteNavRefContext)
  if (!ctx) throw new Error('useInviteNavRef must be used inside InviteModal')
  return ctx
}

// ---------------------------------------------------------------------------
// Shared callbacks + state for InviteModal steps
// ---------------------------------------------------------------------------

export interface InviteCallbacks {
  onClose: () => void

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

export const InviteCallbacksContext = createContext<InviteCallbacks | null>(null)

export function useInviteCallbacks(): InviteCallbacks {
  const ctx = useContext(InviteCallbacksContext)
  if (!ctx) throw new Error('useInviteCallbacks must be used inside InviteModal')
  return ctx
}
