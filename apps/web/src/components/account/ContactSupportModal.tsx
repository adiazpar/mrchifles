'use client'

import { useIntl } from 'react-intl'
import { useMemo } from 'react'
import { LifeBuoy } from 'lucide-react'
import { ModalShell } from '@/components/ui'

export interface ContactSupportModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Reframes the "coming soon" support placeholder as a notice posted on
 * the wall: bordered paper card with a mono NOTICE eyebrow, italic-
 * accented title, an italic body line, and a small mono footnote
 * pointing the user to the help they have today (the business owner
 * who invited them). When the real support flow ships, replace the
 * notice card with the new UI — the shell stays the same.
 */
export function ContactSupportModal({ isOpen, onClose }: ContactSupportModalProps) {
  const intl = useIntl()

  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'account.support_title' })
    const emphasis = intl.formatMessage({ id: 'account.support_title_emphasis' })
    const idx = full.indexOf(emphasis)
    if (!emphasis || idx === -1) return full
    return (
      <>
        {full.slice(0, idx)}
        <em>{emphasis}</em>
        {full.slice(idx + emphasis.length)}
      </>
    )
  }, [intl])

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={intl.formatMessage({ id: 'account.support_modal_title' })}
      noSwipeDismiss
    >
      <div className="contact-support__notice">
        <div className="contact-support__icon" aria-hidden="true">
          <LifeBuoy />
        </div>
        <div className="contact-support__eyebrow">
          {intl.formatMessage({ id: 'account.support_eyebrow' })}
        </div>
        <h2 className="contact-support__title">{titleNode}</h2>
        <p className="contact-support__body">
          {intl.formatMessage({ id: 'account.support_body' })}
        </p>
      </div>

      <div className="contact-support__footnote">
        <span className="contact-support__footnote-eyebrow">
          {intl.formatMessage({ id: 'account.support_footnote_eyebrow' })}
        </span>
        {intl.formatMessage({ id: 'account.support_footnote' })}
      </div>
    </ModalShell>
  )
}
