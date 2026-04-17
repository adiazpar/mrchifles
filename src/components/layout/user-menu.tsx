'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/auth-context'
import { getUserInitials } from '@/lib/auth'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { UserMenuContent } from './user-menu-content'

export function UserMenu() {
  const t = useTranslations('ui.user_menu')
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
        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm overflow-hidden"
        aria-label={t('open')}
        style={user.avatar ? undefined : avatarStyles}
      >
        {user.avatar ? (
          // Avatar is a small base64 data URL — Next/Image adds no benefit here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          getUserInitials(user.name)
        )}
      </button>
      <BottomSheet
        isOpen={menuOpen}
        onClose={handleClose}
        title={t('title')}
      >
        <UserMenuContent onAction={handleClose} />
      </BottomSheet>
    </>
  )
}
