'use client'

import { useEffect, useState } from 'react'
import { Crown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui'
import { usePendingTransfer } from '@/hooks/usePendingTransfer'

export function PendingTransferCard() {
  const t = useTranslations('manage')
  const { transfer, isLoading, error, isCancelling, cancel } = usePendingTransfer()
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!transfer) return
    const id = setInterval(() => forceTick(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [transfer])

  function formatExpiry(expiresAt: string) {
    const msRemaining = new Date(expiresAt).getTime() - Date.now()
    if (msRemaining <= 0) return t('transfer_pending_expires_soon')
    const hours = Math.floor(msRemaining / (60 * 60 * 1000))
    if (hours >= 1) return t('transfer_pending_expires_hours', { hours })
    const minutes = Math.max(1, Math.floor(msRemaining / (60 * 1000)))
    return t('transfer_pending_expires_minutes', { minutes })
  }

  if (isLoading || !transfer) return null

  return (
    <div className="card card-padding flex flex-col gap-3">
      {error && (
        <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">{error}</div>
      )}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0">
          <Crown className="w-6 h-6 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-text-primary mb-1">
            {t('transfer_pending_heading')}
          </h2>
          <p className="text-sm text-text-secondary">
            {t('transfer_pending_waiting', { recipient: transfer.toEmail })}
          </p>
          <p className="text-xs text-text-tertiary mt-1">{formatExpiry(transfer.expiresAt)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={cancel}
        disabled={isCancelling}
        className="btn btn-secondary w-full"
      >
        {isCancelling ? <Spinner size="sm" /> : t('transfer_cancel')}
      </button>
    </div>
  )
}
