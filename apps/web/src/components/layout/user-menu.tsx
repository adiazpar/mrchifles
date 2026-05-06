'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Menu } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useIncomingTransferContext } from '@/contexts/incoming-transfer-context'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { UserMenuContent } from './user-menu-content'

export function UserMenu() {
  const t = useTranslations('ui.user_menu')
  const { user } = useAuth()
  const { transfer: incomingTransfer } = useIncomingTransferContext()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleClose = () => setMenuOpen(false)

  if (!user) return null

  return (
    <>
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          data-tap-feedback
          className="btn btn-secondary btn-icon flex-shrink-0"
          aria-label={t('open')}
        >
          <Menu style={{ width: 20, height: 20 }} />
        </button>
        {incomingTransfer && (
          <span
            className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-warning badge-pop-in pointer-events-none"
            aria-hidden="true"
          />
        )}
      </span>
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
