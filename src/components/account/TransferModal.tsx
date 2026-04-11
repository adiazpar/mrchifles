'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('team')
  return (
    <>
      <Modal.Item>
        <div className="p-3 bg-warning-subtle rounded-lg">
          <p className="text-sm text-warning font-medium mb-1">{t('transfer_initiate_warning_title')}</p>
          <p className="text-xs text-text-secondary">
            {t('transfer_initiate_warning')}
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
          label={t('transfer_new_owner_email_label')}
          type="email"
          value={transferEmail}
          onChange={(e) => setTransferEmail(e.target.value)}
          placeholder={t('transfer_new_owner_email_placeholder')}
          autoFocus
        />
        <p className="text-xs text-text-tertiary mt-2">
          {t('transfer_link_hint')}
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
  const t = useTranslations('team')
  return (
    <button
      type="button"
      onClick={onSubmit}
      className="btn btn-primary flex-1"
      disabled={transferLoading}
    >
      {transferLoading ? <Spinner /> : t('transfer_generate_link_button')}
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
  const t = useTranslations('team')
  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary mb-4">
          {t('transfer_link_share_description')}
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
          {t('transfer_link_valid_hours')}
        </p>
      </Modal.Item>
    </>
  )
}

export interface TransferLinkDoneButtonProps {
  onClose: () => void
}

export function TransferLinkDoneButton({ onClose }: TransferLinkDoneButtonProps) {
  const tCommon = useTranslations('common')
  return (
    <button
      type="button"
      onClick={onClose}
      className="btn btn-primary flex-1"
    >
      {tCommon('done')}
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
  const t = useTranslations('team')
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
          <p className="text-sm text-error font-medium mb-1">{t('transfer_confirm_warning_title')}</p>
          <p className="text-xs text-text-secondary">
            {t('transfer_confirm_warning', {
              name: pendingTransfer?.toUser?.name || t('transfer_owner_fallback'),
            })}
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
            <p className="text-text-secondary mt-4">{t('transfer_processing')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-center text-sm text-text-secondary">
              {t('transfer_confirm_password_hint')}
            </p>
            <Input
              label={t('transfer_password_label')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('transfer_password_placeholder')}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-error w-full"
              disabled={!password.trim()}
            >
              {t('transfer_confirm_button')}
            </button>
          </form>
        )}
      </Modal.Item>
    </>
  )
}
