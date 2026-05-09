'use client'

import { useIntl } from 'react-intl'
import { useMemo } from 'react'
import { ModalShell } from '@/components/ui'
import { APP_VERSION } from '@/lib/version'

export interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Editorial "colophon" page. Big Fraunces wordmark with terracotta dot,
 * italic-accented tagline, a printed-press version block, brand
 * statement, and a credit line. The version is pulled at build time from
 * package.json (see src/lib/version.ts) — bumping the version updates
 * the modal automatically on next build.
 */
export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const intl = useIntl()

  // Edition year, formatted in mono. Computed at render time so the
  // colophon stays accurate without a package.json edit.
  const edition = useMemo(() => {
    return new Date().getFullYear().toString()
  }, [])

  // Italic accent on a single word in the tagline (mirrors the auth
  // page pattern). Falls back to plain text when the locale's emphasis
  // term doesn't substring-match the tagline.
  const taglineNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'account.about_tagline_v2' })
    const emphasis = intl.formatMessage({ id: 'account.about_tagline_v2_emphasis' })
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
      title={intl.formatMessage({ id: 'account.about_modal_title' })}
      noSwipeDismiss
    >
      <div className="about-modal__page">
        <span className="about-modal__corner about-modal__corner--left">
          {intl.formatMessage({ id: 'account.about_corner_left' })}
        </span>
        <span className="about-modal__corner about-modal__corner--right">
          {intl.formatMessage(
            { id: 'account.about_corner_right' },
            { year: edition },
          )}
        </span>

        <div className="about-modal__wordmark">
          {intl.formatMessage({ id: 'account.about_app_name' })}
        </div>

        <p className="about-modal__tagline">{taglineNode}</p>

        <div className="about-modal__rule">
          {intl.formatMessage({ id: 'account.about_rule_eyebrow' })}
        </div>

        <div className="about-modal__version">
          <span className="about-modal__version-label">
            {intl.formatMessage({ id: 'account.about_version_label' })}
          </span>
          <span>{APP_VERSION}</span>
        </div>

        <p className="about-modal__statement">
          {intl.formatMessage({ id: 'account.about_description' })}
        </p>

        <p className="about-modal__credit">
          {intl.formatMessage({ id: 'account.about_credits' })}
        </p>
      </div>
    </ModalShell>
  )
}
