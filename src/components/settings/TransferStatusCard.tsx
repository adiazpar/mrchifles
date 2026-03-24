'use client'

import { Clock, Copy } from 'lucide-react'
import { Spinner } from '@/components/ui'
import type { PendingTransfer, IncomingTransfer } from '@/hooks'
import { formatTimeRemaining } from '@/hooks'

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
  const isAccepted = transfer.status === 'accepted'

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className={`p-4 rounded-lg border ${isAccepted ? 'border-success bg-success-subtle' : 'border-warning bg-warning-subtle'}`}>
        <div className="flex items-start justify-between mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${isAccepted ? 'bg-success text-white' : 'bg-warning text-white'}`}>
            {isAccepted ? 'Accepted' : 'Pending'}
          </span>
          <div className="flex items-center text-xs text-text-tertiary">
            <Clock size={14} className="mr-1" />
            {formatTimeRemaining(transfer.expiresAt)}
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-1">
          Transfer to:
        </p>
        <p className="font-medium text-text-primary">
          {transfer.toUser?.name || transfer.toEmail}
        </p>

        <p className="text-xs text-text-tertiary mt-2">
          Code: <span className="font-mono">{transfer.code}</span>
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
            {transferLoading ? <Spinner /> : 'Confirm transfer'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onShowLink}
            className="btn btn-secondary flex-1"
          >
            <Copy size={16} />
            <span>Copy link</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-error hover:underline"
        disabled={transferLoading}
      >
        Cancel transfer
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
  const isAccepted = transfer.status === 'accepted'

  if (isAccepted) {
    return (
      <div className="p-4 rounded-lg border border-warning bg-warning-subtle">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-warning text-white">
            Awaiting confirmation
          </span>
          <div className="flex items-center text-xs text-text-tertiary">
            <Clock size={14} className="mr-1" />
            {formatTimeRemaining(transfer.expiresAt)}
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-3">
          From: <span className="font-medium text-text-primary">{transfer.fromUser?.name || 'Owner'}</span>
        </p>

        <p className="text-sm text-text-secondary">
          You have accepted the transfer. Waiting for <strong>{transfer.fromUser?.name || 'the owner'}</strong> to confirm to complete the process.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-brand bg-brand-subtle">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand text-white">
            New
          </span>
          <div className="flex items-center text-xs text-text-tertiary">
            <Clock size={14} className="mr-1" />
            {formatTimeRemaining(transfer.expiresAt)}
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-3">
          From: <span className="font-medium text-text-primary">{transfer.fromUser?.name || 'Owner'}</span>
        </p>

        <p className="text-sm text-text-secondary">
          The owner wants to transfer ownership of the business to you. By accepting, you will become the new owner when the current owner confirms the transfer.
        </p>
      </div>

      <button
        type="button"
        onClick={onAccept}
        className="btn btn-primary w-full"
        disabled={acceptingTransfer}
      >
        {acceptingTransfer ? <Spinner /> : 'Accept transfer'}
      </button>
    </div>
  )
}
