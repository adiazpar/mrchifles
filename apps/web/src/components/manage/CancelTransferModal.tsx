'use client'

import { useIntl } from 'react-intl'
import { useEffect, useMemo, useState } from 'react'
import { Clock } from 'lucide-react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import { usePendingTransferContext } from '@/contexts/pending-transfer-context'

interface Props {
  isOpen: boolean
  onClose: () => void
}

/**
 * Recalculates the remaining time to expiry on a 60s tick so the modal's
 * countdown stays live while the user is looking at it.
 */
type ExpiryLabel = {
  key:
    | 'transfer_pending_expires_soon'
    | 'transfer_pending_expires_hours'
    | 'transfer_pending_expires_minutes'
  values: Record<string, number>
  isSoon: boolean
}

function useExpiryLabel(expiresAt: string | undefined): ExpiryLabel | null {
  const [, bump] = useState(0)
  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => bump((n) => n + 1), 60_000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (!expiresAt) return null
  const msRemaining = new Date(expiresAt).getTime() - Date.now()
  if (msRemaining <= 60_000) {
    return { key: 'transfer_pending_expires_soon', values: {}, isSoon: true }
  }
  const hoursRemaining = Math.floor(msRemaining / 3_600_000)
  if (hoursRemaining >= 1) {
    return {
      key: 'transfer_pending_expires_hours',
      values: { hours: hoursRemaining },
      isSoon: false,
    }
  }
  const minutesRemaining = Math.floor(msRemaining / 60_000)
  return {
    key: 'transfer_pending_expires_minutes',
    values: { minutes: minutesRemaining },
    isSoon: minutesRemaining < 15,
  }
}

export function CancelTransferModal({ isOpen, onClose }: Props) {
  const intl = useIntl()
  const { transfer, cancel, isCancelling, error } = usePendingTransferContext()
  const expiry = useExpiryLabel(transfer?.expiresAt)

  // Auto-close if the transfer disappears while the modal is open.
  useEffect(() => {
    if (isOpen && !transfer && !isCancelling) onClose()
  }, [isOpen, transfer, isCancelling, onClose])

  const handleCancelTransfer = async () => {
    await cancel()
  }

  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'manage.cancel_transfer_hero_title' })
    const emphasis = intl.formatMessage({ id: 'manage.cancel_transfer_hero_title_emphasis' })
    const idx = full.indexOf(emphasis)
    if (!emphasis || idx === -1) return full
    return (
      <>
        {full.slice(0, idx)}
        <em>{emphasis}</em>
        {full.slice(idx + emphasis.length)}
      </>
    )
  }, [intl])

  const footer = (
    <IonButton
      color="danger"
      expand="block"
      onClick={handleCancelTransfer}
      disabled={isCancelling || !transfer}
    >
      {isCancelling
        ? <IonSpinner name="crescent" />
        : intl.formatMessage({ id: 'manage.transfer_withdraw' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={intl.formatMessage({ id: 'manage.transfer_pending_heading' })}
      footer={footer}
      noSwipeDismiss
    >
      {error && <div className="modal-error">{error}</div>}

      <header className="modal-hero cancel-transfer__hero">
        <div className="modal-hero__eyebrow">
          {intl.formatMessage({ id: 'manage.cancel_transfer_eyebrow' })}
        </div>
        <h1 className="modal-hero__title">{titleNode}</h1>
        <p className="modal-hero__subtitle">
          {intl.formatMessage({ id: 'manage.cancel_transfer_hero_subtitle' })}
        </p>
      </header>

      <div className="cancel-transfer__plate">
        <div className="cancel-transfer__plate-eyebrow">
          <Clock />
          {intl.formatMessage({ id: 'manage.cancel_transfer_plate_eyebrow' })}
        </div>

        <div className="cancel-transfer__plate-recipient">
          <span className="cancel-transfer__plate-recipient-label">
            {intl.formatMessage({ id: 'manage.cancel_transfer_recipient_label' })}
          </span>
          <span className="cancel-transfer__plate-recipient-value">
            {transfer?.toEmail ?? ''}
          </span>
        </div>

        {expiry && (
          <div
            className={
              'cancel-transfer__plate-expiry' +
              (expiry.isSoon ? ' cancel-transfer__plate-expiry--soon' : '')
            }
          >
            {intl.formatMessage(
              { id: 'manage.' + expiry.key },
              expiry.values,
            )}
          </div>
        )}
      </div>

      <p className="cancel-transfer__note">
        {intl.formatMessage({ id: 'manage.cancel_transfer_note' })}
      </p>
    </ModalShell>
  )
}
