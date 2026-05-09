'use client'

import { useIntl } from 'react-intl'
import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useIncomingTransferContext } from '@/contexts/incoming-transfer-context'
import { ModalShell, UserAvatar } from '@/components/ui'
import { UserMenuContent } from './user-menu-content'

export function UserMenu() {
  const t = useIntl()
  const { user } = useAuth()
  const { transfer: incomingTransfer } = useIncomingTransferContext()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) return null

  const handleClose = () => setMenuOpen(false)

  return (
    <>
      <UserAvatar
        name={user.name}
        size="md"
        onClick={() => setMenuOpen(true)}
        ariaLabel={t.formatMessage({ id: 'ui.user_menu.open' })}
        badge={incomingTransfer ? <span /> : undefined}
      />
      <ModalShell
        isOpen={menuOpen}
        onClose={handleClose}
        title={t.formatMessage({ id: 'ui.user_menu.title' })}
        variant="half"
      >
        <UserMenuContent onAction={handleClose} />
      </ModalShell>
    </>
  )
}
