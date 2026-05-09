'use client'

import { useIntl } from 'react-intl'
import { useState } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import { menuOutline } from 'ionicons/icons'
import { useAuth } from '@/contexts/auth-context'
import { useIncomingTransferContext } from '@/contexts/incoming-transfer-context'
import { ModalShell, UserAvatar } from '@/components/ui'
import { UserMenuContent } from './user-menu-content'

interface UserMenuProps {
  /**
   * `avatar` (default) — initials in a terracotta circle. Used on the
   * Hub home where we want the user's identity present in the chrome.
   * `hamburger` — a simple Lucide menu glyph in an Ionic clear-fill
   * IonButton. Used on business-tab headers where the toolbar already
   * shows the business name and an avatar would compete with it.
   * Both triggers open the same modal sheet.
   */
  trigger?: 'avatar' | 'hamburger'
}

export function UserMenu({ trigger = 'avatar' }: UserMenuProps) {
  const t = useIntl()
  const { user } = useAuth()
  const { transfer: incomingTransfer } = useIncomingTransferContext()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) return null

  const handleClose = () => setMenuOpen(false)
  const handleOpen = () => setMenuOpen(true)
  const ariaLabel = t.formatMessage({ id: 'ui.user_menu.open' })

  return (
    <>
      {trigger === 'hamburger' ? (
        <IonButton
          fill="clear"
          shape="round"
          onClick={handleOpen}
          aria-label={ariaLabel}
          className="user-menu-hamburger"
        >
          <IonIcon icon={menuOutline} slot="icon-only" />
          {incomingTransfer ? (
            <span className="user-menu-hamburger__badge" aria-hidden="true" />
          ) : null}
        </IonButton>
      ) : (
        <UserAvatar
          name={user.name}
          size="md"
          onClick={handleOpen}
          ariaLabel={ariaLabel}
          badge={incomingTransfer ? <span /> : undefined}
        />
      )}
      <ModalShell
        isOpen={menuOpen}
        onClose={handleClose}
        title={t.formatMessage({ id: 'ui.user_menu.title' })}
        variant="half"
        flushContent
      >
        <UserMenuContent onAction={handleClose} />
      </ModalShell>
    </>
  )
}
