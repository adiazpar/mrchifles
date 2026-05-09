'use client'

import { useIntl } from 'react-intl'
import { useEffect, useMemo, useState } from 'react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui/modal-shell'
import { LocalePicker } from '@/components/businesses/shared'
import { useBusiness } from '@/contexts/business-context'
import { useUpdateBusiness } from '@/hooks/useUpdateBusiness'
import { getLocaleConfig } from '@kasero/shared/locale-config'

interface Props { isOpen: boolean; onClose: () => void }

export function EditLocationModal({ isOpen, onClose }: Props) {
  const intl = useIntl()
  const { business } = useBusiness()
  const { update, isSubmitting, error, reset } = useUpdateBusiness()
  const [locale, setLocale] = useState(business?.locale ?? 'en-US')

  useEffect(() => {
    if (isOpen) setLocale(business?.locale ?? 'en-US')
  }, [isOpen, business?.locale])

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => { reset() }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, reset])

  const handleSave = async () => {
    if (locale === business?.locale) { onClose(); return }
    const ok = await update({ locale })
    if (ok) onClose()
  }

  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'manage.edit_location_hero_title' })
    const emphasis = intl.formatMessage({ id: 'manage.edit_location_hero_title_emphasis' })
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

  const currentLocale = getLocaleConfig(business?.locale ?? 'en-US')
  const nextLocale = getLocaleConfig(locale)
  const isChanged = locale !== (business?.locale ?? 'en-US')

  const footer = (
    <IonButton
      expand="block"
      onClick={handleSave}
      disabled={isSubmitting || !isChanged}
      className="flex-1"
    >
      {isSubmitting ? <IonSpinner name="crescent" /> : intl.formatMessage({ id: 'manage.save' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={intl.formatMessage({ id: 'manage.edit_location_title' })}
      footer={footer}
      noSwipeDismiss
    >
      {error && <div className="modal-error">{error}</div>}

      <header className="modal-hero edit-location__hero">
        <div className="modal-hero__eyebrow">
          {intl.formatMessage({ id: 'manage.edit_location_eyebrow' })}
        </div>
        <h1 className="modal-hero__title">{titleNode}</h1>
        <p className="modal-hero__subtitle">
          {intl.formatMessage({ id: 'manage.edit_location_hero_subtitle' })}
        </p>
      </header>

      {/* Current → Next plate. Reads as a typeset diff. */}
      <div
        className={
          'edit-location__plate ' +
          (isChanged ? 'edit-location__plate--changed' : 'edit-location__plate--unchanged')
        }
      >
        <div className="edit-location__plate-cell edit-location__plate-cell--current">
          <span className="edit-location__plate-eyebrow">
            {intl.formatMessage({ id: 'manage.edit_location_plate_current' })}
          </span>
          {currentLocale && (
            <>
              <span className="edit-location__plate-flag">{currentLocale.flag}</span>
              <span className="edit-location__plate-country">{currentLocale.country}</span>
              <span className="edit-location__plate-code">
                {currentLocale.code} · {currentLocale.currency}
              </span>
            </>
          )}
        </div>

        <div className="edit-location__plate-arrow" aria-hidden="true">
          <svg viewBox="0 0 22 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="6" x2="18" y2="6" stroke="currentColor" strokeWidth="1.2" />
            <polyline
              points="14 2, 20 6, 14 10"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="edit-location__plate-cell edit-location__plate-cell--next">
          <span className="edit-location__plate-eyebrow">
            {intl.formatMessage({ id: 'manage.edit_location_plate_next' })}
          </span>
          {nextLocale && (
            <>
              <span className="edit-location__plate-flag">{nextLocale.flag}</span>
              <span className="edit-location__plate-country">{nextLocale.country}</span>
              <span className="edit-location__plate-code">
                {nextLocale.code} · {nextLocale.currency}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="edit-location__shelf">
        <LocalePicker value={locale} onChange={setLocale} showCurrency={false} />
        <div className="manage-edit__note">
          {intl.formatMessage({ id: 'manage.edit_location_currency_note' })}
        </div>
      </div>
    </ModalShell>
  )
}
