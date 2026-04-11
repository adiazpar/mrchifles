'use client'

import { Crown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui'
import { useIncomingTransfer } from '@/hooks/useIncomingTransfer'

/**
 * Card that surfaces any pending incoming ownership transfer on the
 * account settings page. Conditionally rendered -- returns null when
 * there's nothing to show.
 *
 * Follows the Airbnb "your place" card pattern: prominent card directly
 * under the profile header with an actionable call-to-action.
 *
 * States:
 * - pending  -> Accept / Decline buttons
 * - accepted -> informational ("waiting on owner to confirm")
 * - null     -> card not rendered
 */
export function IncomingTransferCard() {
  const t = useTranslations('account')
  const {
    transfer,
    isLoading,
    error,
    isAccepting,
    isDeclining,
    handleAccept,
    handleDecline,
  } = useIncomingTransfer()

  if (isLoading || !transfer) return null

  const fromName = transfer.fromUser?.name ?? null
  const businessName = transfer.business.name

  return (
    <div className="card card-padding flex flex-col gap-4">
      {error && (
        <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0">
          <Crown className="w-6 h-6 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-text-primary mb-1">
            {t('incoming_transfer_heading')}
          </h2>
          <p className="text-sm text-text-secondary">
            {transfer.status === 'accepted'
              ? fromName
                ? t('incoming_transfer_accepted', { name: fromName })
                : t('incoming_transfer_accepted_anonymous')
              : fromName
                ? t('incoming_transfer_description', {
                    name: fromName,
                    business: businessName,
                  })
                : t('incoming_transfer_description_anonymous', {
                    business: businessName,
                  })}
          </p>
        </div>
      </div>

      {transfer.status === 'pending' && (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
          >
            {isAccepting ? <Spinner /> : t('incoming_transfer_accept')}
          </button>
          <button
            type="button"
            className="btn btn-secondary flex-1"
            onClick={handleDecline}
            disabled={isAccepting || isDeclining}
          >
            {isDeclining ? <Spinner /> : t('incoming_transfer_decline')}
          </button>
        </div>
      )}
    </div>
  )
}
