'use client'

import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { Modal, Spinner } from '@/components/ui'
import { usePendingTransferContext } from '@/contexts/pending-transfer-context'

interface Props {
  isOpen: boolean
  onClose: () => void
}

/**
 * Recalculates the remaining time to expiry on a 60s tick so the modal's
 * countdown stays live while the user is looking at it. Returns the i18n
 * key to render plus any interpolation values.
 */
type ExpiryLabel = {
  key:
    | 'transfer_pending_expires_soon'
    | 'transfer_pending_expires_hours'
    | 'transfer_pending_expires_minutes'
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
    return { key: 'transfer_pending_expires_soon', values: {} }
  }
  const hoursRemaining = Math.floor(msRemaining / 3_600_000)
  if (hoursRemaining >= 1) {
    return {
      key: 'transfer_pending_expires_hours',
      values: { hours: hoursRemaining },
    }
  }
  const minutesRemaining = Math.floor(msRemaining / 60_000)
  return {
    key: 'transfer_pending_expires_minutes',
    values: { minutes: minutesRemaining },
  }
}

export function CancelTransferModal({ isOpen, onClose }: Props) {
  const t = useIntl()
  const tCommon = useIntl()
  const { transfer, cancel, isCancelling, error } = usePendingTransferContext()
  const expiry = useExpiryLabel(transfer?.expiresAt)

  // If the transfer disappears while the modal is open (e.g. after a
  // successful cancel, or the recipient accepts in another tab), close
  // the modal automatically so we don't show stale state.
  useEffect(() => {
    if (isOpen && !transfer && !isCancelling) onClose()
  }, [isOpen, transfer, isCancelling, onClose])

  const handleCancelTransfer = async () => {
    await cancel()
    // cancel() nulls the shared state on success — the effect above then
    // closes the modal. On failure, `error` populates and we stay open.
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Step title={t.formatMessage({
        id: 'manage.transfer_pending_heading'
      })} hideBackButton>
        <Modal.Item>
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
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-warning">
                {transfer
                  ? t.formatMessage({
                  id: 'manage.transfer_pending_waiting'
                }, { recipient: transfer.toEmail })
                  : t.formatMessage({
                  id: 'manage.transfer_pending_heading'
                })}
              </p>
              {expiry && (
                <p className="text-xs text-text-secondary mt-1">
                  {t.formatMessage({
                    id: 'manage.' + expiry.key
                  }, expiry.values)}
                </p>
              )}
            </div>
          </div>
        </Modal.Item>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}
        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="btn btn-secondary flex-1"
          >
            {tCommon.formatMessage({
              id: 'common.cancel'
            })}
          </button>
          <button
            type="button"
            onClick={handleCancelTransfer}
            disabled={isCancelling || !transfer}
            className="btn btn-primary flex-1"
            style={{ background: 'var(--color-error)' }}
          >
            {isCancelling ? <Spinner size="sm" /> : t.formatMessage({
              id: 'manage.transfer_withdraw'
            })}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  );
}
