'use client'

import { Clock, Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui'
import type { PendingTransfer, IncomingTransfer } from '@/hooks'

// ============================================
// TIME REMAINING HELPER
// ============================================

function useTimeRemaining(expiresAt: string): string {
  const t = useTranslations('team')
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diff = expiry.getTime() - now.getTime()

  if (diff <= 0) return t('transfer_expired')

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return t('transfer_expires_hours', { hours, minutes })
  }
  return t('transfer_expires_minutes', { minutes })
}

// ============================================
// PENDING TRANSFER CARD (Owner)
// ============================================

export interface PendingTransferCardProps {
  transfer: PendingTransfer
  transferLoading: boolean
  onShowLink: () => void
  onConfirm: () => void
  onCancel: () => void
}

export function PendingTransferCard({
  transfer,
  transferLoading,
  onShowLink,
  onConfirm,
  onCancel,
}: PendingTransferCardProps) {
  const t = useTranslations('team')
  const timeRemaining = useTimeRemaining(transfer.expiresAt)
  const isAccepted = transfer.status === 'accepted'

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className={`p-4 rounded-lg border ${isAccepted ? 'border-success bg-success-subtle' : 'border-warning bg-warning-subtle'}`}>
        <div className="flex items-start justify-between mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${isAccepted ? 'bg-success text-white' : 'bg-warning text-white'}`}>
            {isAccepted ? t('transfer_status_accepted') : t('transfer_status_pending')}
          </span>
          <div className="flex items-center text-xs text-text-tertiary">
            <Clock size={14} className="mr-1" />
            {timeRemaining}
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-1">
          {t('transfer_to_label')}
        </p>
        <p className="font-medium text-text-primary">
          {transfer.toUser?.name || transfer.toEmail}
        </p>

        <p className="text-xs text-text-tertiary mt-2">
          {t('transfer_code_label')} <span className="font-mono">{transfer.code}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {isAccepted ? (
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-primary flex-1"
            disabled={transferLoading}
          >
            {transferLoading ? <Spinner /> : t('transfer_confirm_button')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onShowLink}
            className="btn btn-secondary flex-1"
          >
            <Copy size={16} />
            <span>{t('transfer_copy_link_button')}</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-error hover:underline"
        disabled={transferLoading}
      >
        {t('transfer_cancel_button')}
      </button>
    </div>
  )
}

// ============================================
// INCOMING TRANSFER CARD (Non-owner)
// ============================================

export interface IncomingTransferCardProps {
  transfer: IncomingTransfer
  acceptingTransfer: boolean
  onAccept: () => void
}

export function IncomingTransferCard({
  transfer,
  acceptingTransfer,
  onAccept,
}: IncomingTransferCardProps) {
  const t = useTranslations('team')
  const timeRemaining = useTimeRemaining(transfer.expiresAt)
  const isAccepted = transfer.status === 'accepted'

  if (isAccepted) {
    return (
      <div className="p-4 rounded-lg border border-warning bg-warning-subtle">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-warning text-white">
            {t('transfer_status_awaiting_confirmation')}
          </span>
          <div className="flex items-center text-xs text-text-tertiary">
            <Clock size={14} className="mr-1" />
            {timeRemaining}
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-3">
          {t('transfer_to_label')} <span className="font-medium text-text-primary">{transfer.fromUser?.name || t('transfer_owner_fallback')}</span>
        </p>

        <p className="text-sm text-text-secondary">
          {t('transfer_accepted_waiting', { name: transfer.fromUser?.name || t('transfer_owner_fallback') })}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-brand bg-brand-subtle">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand text-white">
            {t('transfer_status_new')}
          </span>
          <div className="flex items-center text-xs text-text-tertiary">
            <Clock size={14} className="mr-1" />
            {timeRemaining}
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-3">
          {t('transfer_to_label')} <span className="font-medium text-text-primary">{transfer.fromUser?.name || t('transfer_owner_fallback')}</span>
        </p>

        <p className="text-sm text-text-secondary">
          {t('transfer_incoming_description')}
        </p>
      </div>

      <button
        type="button"
        onClick={onAccept}
        className="btn btn-primary w-full"
        disabled={acceptingTransfer}
      >
        {acceptingTransfer ? <Spinner /> : t('transfer_accept_button')}
      </button>
    </div>
  )
}
