'use client'

import { useIntl } from 'react-intl';
import { CircleHelp } from 'lucide-react'
import { ModalShell } from '@/components/ui'

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
  const t = useIntl()

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t.formatMessage({ id: 'account.support_modal_title' })}
    >
      <div className="flex flex-col items-center text-center py-6">
        <div className="w-16 h-16 rounded-full bg-brand-subtle flex items-center justify-center mb-4">
          <CircleHelp className="w-8 h-8 text-brand" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">
          {t.formatMessage({
            id: 'account.support_coming_soon_heading'
          })}
        </h2>
        <p className="text-sm text-text-secondary mt-2 max-w-sm">
          {t.formatMessage({
            id: 'account.support_coming_soon_description'
          })}
        </p>
      </div>
    </ModalShell>
  );
}
