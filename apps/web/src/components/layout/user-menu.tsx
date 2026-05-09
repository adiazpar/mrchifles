'use client'

import { useIntl } from 'react-intl';
import { useState } from 'react'
import { IonButton } from '@ionic/react'
import { Menu } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useIncomingTransferContext } from '@/contexts/incoming-transfer-context'
import { ModalShell } from '@/components/ui'
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
        <IonButton
          fill="clear"
          shape="round"
          onClick={() => setMenuOpen(true)}
          className="flex-shrink-0"
          aria-label={t.formatMessage({
            id: 'ui.user_menu.open'
          })}
        >
          <Menu style={{ width: 20, height: 20 }} />
        </IonButton>
        {incomingTransfer && (
          <span
            className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-warning badge-pop-in pointer-events-none"
            aria-hidden="true"
          />
        )}
      </span>
      <ModalShell
        isOpen={menuOpen}
        onClose={handleClose}
        title={t.formatMessage({
          id: 'ui.user_menu.title'
        })}
        variant="half"
      >
        <UserMenuContent onAction={handleClose} />
      </ModalShell>
    </>
  );
}
