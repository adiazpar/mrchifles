'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Modal, Spinner, Input } from '@/components/ui'
import type { PendingTransfer } from '@/hooks'

// ============================================
// STEP 0: Initiate Transfer
// ============================================

export interface TransferInitiateContentProps {
  transferEmail: string
  setTransferEmail: (email: string) => void
  transferError: string
}

export function TransferInitiateContent({
  transferEmail,
  setTransferEmail,
  transferError,
}: TransferInitiateContentProps) {
  return (
    <>
      <Modal.Item>
        <div className="p-3 bg-warning-subtle rounded-lg">
          <p className="text-sm text-warning font-medium mb-1">Important</p>
          <p className="text-xs text-text-secondary">
            By confirming the transfer, you will lose your owner role and become a partner.
            This action is irreversible.
          </p>
        </div>
      </Modal.Item>

      {transferError && (
        <Modal.Item>
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
            {transferError}
          </div>
        </Modal.Item>
      )}

      <Modal.Item>
        <Input
          label="New owner's email"
          type="email"
          value={transferEmail}
          onChange={(e) => setTransferEmail(e.target.value)}
          placeholder="new@email.com"
          autoFocus
        />
        <p className="text-xs text-text-tertiary mt-2">
          A link will be generated that you must share with this person.
        </p>
      </Modal.Item>
    </>
  )
}

export interface TransferInitiateButtonProps {
  transferLoading: boolean
  onSubmit: (e: React.FormEvent) => void
}

export function TransferInitiateButton({
  transferLoading,
  onSubmit,
}: TransferInitiateButtonProps) {
  return (
    <button
      type="button"
      onClick={onSubmit}
      className="btn btn-primary flex-1"
      disabled={transferLoading}
    >
      {transferLoading ? <Spinner /> : 'Generate link'}
    </button>
  )
}

// ============================================
// STEP 1: Transfer Link Generated
// ============================================

export interface TransferLinkContentProps {
  transferLink: string
  linkCopied: boolean
  onCopy: () => void
}

export function TransferLinkContent({
  transferLink,
  linkCopied,
  onCopy,
}: TransferLinkContentProps) {
  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary mb-4">
          Share this link with the new owner so they can accept the transfer.
        </p>

        <button
          type="button"
          onClick={onCopy}
          className="w-full p-4 bg-bg-muted rounded-lg border border-border flex items-center justify-between hover:border-brand transition-colors"
        >
          <span className="text-sm font-mono truncate pr-2">{transferLink}</span>
          {linkCopied ? (
            <Check className="w-5 h-5 text-success flex-shrink-0" />
          ) : (
            <Copy className="w-5 h-5 text-text-secondary flex-shrink-0" />
          )}
        </button>

        <p className="text-xs text-text-tertiary mt-3">
          The link is valid for 24 hours.
        </p>
      </Modal.Item>
    </>
  )
}

export interface TransferLinkDoneButtonProps {
  onClose: () => void
}

export function TransferLinkDoneButton({ onClose }: TransferLinkDoneButtonProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="btn btn-primary flex-1"
    >
      Done
    </button>
  )
}

// ============================================
// STEP 2: Confirm Transfer with Password
// ============================================

export interface TransferConfirmContentProps {
  pendingTransfer: PendingTransfer | null
  transferError: string
  transferLoading: boolean
  onConfirm: (password: string) => void
}

export function TransferConfirmContent({
  pendingTransfer,
  transferError,
  transferLoading,
  onConfirm,
}: TransferConfirmContentProps) {
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.trim()) {
      onConfirm(password)
    }
  }

  return (
    <>
      <Modal.Item>
        <div className="p-3 bg-error-subtle rounded-lg">
          <p className="text-sm text-error font-medium mb-1">Irreversible action</p>
          <p className="text-xs text-text-secondary">
            Upon confirmation, {pendingTransfer?.toUser?.name || 'the recipient'} will become the new owner
            and your account will become a partner.
          </p>
        </div>
      </Modal.Item>

      {transferError && (
        <Modal.Item>
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
            {transferError}
          </div>
        </Modal.Item>
      )}

      <Modal.Item>
        {transferLoading ? (
          <div className="flex flex-col items-center py-8">
            <Spinner className="spinner-lg" />
            <p className="text-text-secondary mt-4">Processing...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-center text-sm text-text-secondary">
              Enter your password to confirm
            </p>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your current password"
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-error w-full"
              disabled={!password.trim()}
            >
              Confirm transfer
            </button>
          </form>
        )}
      </Modal.Item>
    </>
  )
}
