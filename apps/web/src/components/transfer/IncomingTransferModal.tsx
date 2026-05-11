'use client'

import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import { useIncomingTransferContext } from '@/contexts/incoming-transfer-context'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type ExpiryLabel = {
  id:
    | 'manage.transfer_pending_expires_soon'
    | 'manage.transfer_pending_expires_hours'
    | 'manage.transfer_pending_expires_minutes'
  values: Record<string, number>
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
    return { id: 'manage.transfer_pending_expires_soon', values: {} }
  }
  const hoursRemaining = Math.floor(msRemaining / 3_600_000)
  if (hoursRemaining >= 1) {
    return {
      id: 'manage.transfer_pending_expires_hours',
      values: { hours: hoursRemaining },
    }
  }
  const minutesRemaining = Math.floor(msRemaining / 60_000)
  return {
    id: 'manage.transfer_pending_expires_minutes',
    values: { minutes: minutesRemaining },
  }
}

export function IncomingTransferModal({ isOpen, onClose }: Props) {
  const tAccount = useIntl()
  const tManage = useIntl()
  const {
    transfer,
    error,
    isAccepting,
    isDeclining,
    handleAccept,
    handleDecline,
  } = useIncomingTransferContext()
  const expiry = useExpiryLabel(transfer?.expiresAt)

  // If the transfer disappears while the modal is open (e.g. after a
  // successful decline, or the sender cancels in another tab) close
  // the modal automatically so we don't show stale state.
  useEffect(() => {
    if (isOpen && !transfer && !isAccepting && !isDeclining) onClose()
  }, [isOpen, transfer, isAccepting, isDeclining, onClose])

  const busy = isAccepting || isDeclining

  const description = transfer
    ? transfer.fromUser
      ? tAccount.formatMessage({
    id: 'account.incoming_transfer_description'
  }, {
          name: transfer.fromUser.name,
          business: transfer.business.name,
        })
      : tAccount.formatMessage({
    id: 'account.incoming_transfer_description_anonymous'
  }, {
          business: transfer.business.name,
        })
    : ''

  const footer = (
    <>
      <IonButton
        fill="outline"
        onClick={handleDecline}
        disabled={busy || !transfer}
        className="flex-1"
        data-haptic
      >
        {isDeclining ? <IonSpinner name="crescent" /> : tAccount.formatMessage({
          id: 'account.incoming_transfer_decline'
        })}
      </IonButton>
      <IonButton
        onClick={handleAccept}
        disabled={busy || !transfer}
        className="flex-1"
        data-haptic
      >
        {isAccepting ? <IonSpinner name="crescent" /> : tAccount.formatMessage({
          id: 'account.incoming_transfer_accept'
        })}
      </IonButton>
    </>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={tAccount.formatMessage({ id: 'account.incoming_transfer_heading' })}
      footer={footer}
    >
      <div
        className="p-3 rounded-lg flex items-start gap-3"
        style={{
          backgroundColor:
            'color-mix(in oklab, var(--color-warning) 10%, transparent)',
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor:
              'color-mix(in oklab, var(--color-warning) 22%, transparent)',
          }}
        >
          <ArrowRightLeft className="w-5 h-5 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-warning">
            {tAccount.formatMessage({
              id: 'account.incoming_transfer_heading'
            })}
          </p>
          <p className="text-xs text-text-secondary mt-1">{description}</p>
          {expiry && (
            <p className="text-xs text-text-secondary mt-1">
              {tManage.formatMessage({ id: expiry.id }, expiry.values)}
            </p>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-3 p-3 bg-error-subtle text-error text-sm rounded-lg">
          {error}
        </div>
      )}
    </ModalShell>
  )
}
