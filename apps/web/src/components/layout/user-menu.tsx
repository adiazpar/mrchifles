'use client'

import { useIntl } from 'react-intl';
import { useState } from 'react'
import { IonRippleEffect } from '@ionic/react'
import { Menu } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useIncomingTransferContext } from '@/contexts/incoming-transfer-context'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { UserMenuContent } from './user-menu-content'

export function UserMenu() {
  const t = useIntl()
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
          className="btn btn-secondary btn-icon flex-shrink-0 ion-activatable ripple-parent"
          aria-label={t.formatMessage({
            id: 'ui.user_menu.open'
          })}
        >
          <Menu style={{ width: 20, height: 20 }} />
          <IonRippleEffect />
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
        title={t.formatMessage({
          id: 'ui.user_menu.title'
        })}
      >
        <UserMenuContent onAction={handleClose} />
      </BottomSheet>
    </>
  );
}
