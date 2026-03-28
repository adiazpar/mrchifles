'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { getUserInitials } from '@/lib/auth'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { UserMenuContent } from './user-menu-content'

export function UserMenu() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleClose = () => setMenuOpen(false)

  if (!user) return null

  const avatarStyles = {
    backgroundColor: 'var(--brand-100)',
    color: 'var(--brand-700)',
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
        aria-label="User menu"
        style={avatarStyles}
      >
        {getUserInitials(user.name)}
      </button>
      <BottomSheet
        isOpen={menuOpen}
        onClose={handleClose}
        title="Account and Settings"
      >
        <UserMenuContent onAction={handleClose} />
      </BottomSheet>
    </>
  )
}
