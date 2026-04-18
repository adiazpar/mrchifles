'use client'

import { useTranslations } from 'next-intl'
import { CircleHelp } from 'lucide-react'
import { Modal } from '@/components/ui'

export interface ContactSupportModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * "Coming soon" placeholder for the contact support flow. When the
 * support feature ships, replace the body of this modal with the real
 * UI (email link, WhatsApp deep link, in-app chat, etc.). The shell
 * stays the same.
 */
export function ContactSupportModal({ isOpen, onClose }: ContactSupportModalProps) {
  const t = useTranslations('account')
  const tCommon = useTranslations('common')

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Step title={t('support_modal_title')}>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-brand-subtle flex items-center justify-center mb-4">
              <CircleHelp className="w-8 h-8 text-brand" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              {t('support_coming_soon_heading')}
            </h2>
            <p className="text-sm text-text-secondary mt-2 max-w-sm">
              {t('support_coming_soon_description')}
            </p>
          </div>
        </Modal.Item>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={onClose}
          >
            {tCommon('close')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
