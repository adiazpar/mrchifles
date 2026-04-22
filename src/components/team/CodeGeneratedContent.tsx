'use client'

import { RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge, Spinner, Modal } from '@/components/ui'
import type { InviteRole } from '@/types'

export interface CodeGeneratedContentProps {
  selectedRole: InviteRole
  newCode: string
  expiresAt: Date
  qrDataUrl: string | null
  isGenerating: boolean
  onRegenerate: () => Promise<void>
}

export function CodeGeneratedContent({
  selectedRole,
  newCode,
  expiresAt,
  qrDataUrl,
  isGenerating,
  onRegenerate,
}: CodeGeneratedContentProps) {
  const t = useTranslations('team')

  const roleLabels: Record<InviteRole, string> = {
    partner: t('role_partner'),
    employee: t('role_employee'),
  }

  const msRemaining = expiresAt.getTime() - Date.now()
  const hours = Math.max(0, Math.round(msRemaining / (60 * 60 * 1000)))
  const days = Math.round(msRemaining / (24 * 60 * 60 * 1000))
  const label = hours < 24
    ? t('code_valid_hours', { hours })
    : t('code_valid_days_n', { days })

  return (
    <Modal.Item>
      <div className="invite-success-compact">
        {/* Role badge and expiry */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <Badge variant="brand">{roleLabels[selectedRole]}</Badge>
          <span className="text-xs text-text-tertiary">{label}</span>
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="flex justify-center mb-3">
            <div className="invite-qr-box">
              {/* eslint-disable-next-line @next/next/no-img-element -- Data URL for QR code, no optimization benefit */}
              <img src={qrDataUrl} alt={t('qr_alt')} />
            </div>
          </div>
        )}

        {/* Large readable code */}
        <div className="text-center mb-1">
          <code className="text-3xl font-display font-bold tracking-[0.3em] -mr-[0.3em] text-text-primary">
            {newCode}
          </code>
        </div>

        {/* Regenerate button */}
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isGenerating}
          className="invite-regenerate"
        >
          {isGenerating ? (
            <>
              <Spinner />
              <span>{t('regenerating')}</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('regenerate_code_button')}</span>
            </>
          )}
        </button>
      </div>
    </Modal.Item>
  )
}
