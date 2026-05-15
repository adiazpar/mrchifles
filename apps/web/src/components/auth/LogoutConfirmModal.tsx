'use client'

import { useIntl } from 'react-intl'
import { IonButton } from '@ionic/react'
import { ModalShell } from '@/components/ui'

interface LogoutConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

/**
 * Minimal confirmation shown before the logout splash choreography
 * begins. Stateless — every render is derived from props and i18n,
 * so no onExitComplete cleanup is needed. noSwipeDismiss is set so
 * the user has to make a deliberate Cancel/Confirm choice (matching
 * LeaveBusinessModal); the X and backdrop still close the modal.
 */
export function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: LogoutConfirmModalProps) {
  const intl = useIntl()

  const footer = (
    <>
      <IonButton fill="outline" onClick={onClose}>
        {intl.formatMessage({ id: 'auth.logout_confirm.cancel' })}
      </IonButton>
      <IonButton color="danger" onClick={onConfirm} data-haptic>
        {intl.formatMessage({ id: 'auth.logout_confirm.action' })}
      </IonButton>
    </>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={intl.formatMessage({ id: 'auth.logout_confirm.title' })}
      footer={footer}
      noSwipeDismiss
    >
      <p className="text-text-secondary leading-relaxed">
        {intl.formatMessage({ id: 'auth.logout_confirm.subtitle' })}
      </p>
    </ModalShell>
  )
}
