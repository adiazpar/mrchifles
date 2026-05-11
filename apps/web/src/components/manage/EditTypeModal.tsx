'use client'

import { useIntl } from 'react-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui/modal-shell'
import { BusinessTypeGrid } from '@/components/businesses/shared'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useBusiness } from '@/contexts/business-context'
import { useUpdateBusiness } from '@/hooks/useUpdateBusiness'
import type { BusinessType } from '@/hooks'

interface Props { isOpen: boolean; onClose: () => void }

type Step = 'form' | 'save-success'

export function EditTypeModal({ isOpen, onClose }: Props) {
  const intl = useIntl()
  const { business } = useBusiness()
  const { update, isSubmitting, error, reset } = useUpdateBusiness()
  const [step, setStep] = useState<Step>('form')
  const [saved, setSaved] = useState(false)
  const [selected, setSelected] = useState<BusinessType | null>(business?.type ?? null)

  // Open-time reset, gated on the close→open transition. Without the
  // wasOpenRef guard, refreshBusiness() updating business?.type mid-save
  // would re-fire this effect and reset the step back to 'form' just as
  // we transition to 'save-success', hiding the Lottie celebration. See
  // EditNameModal for the full rationale.
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setStep('form')
      setSaved(false)
      setSelected(business?.type ?? null)
    }
    wasOpenRef.current = isOpen
  }, [isOpen, business?.type])

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setSelected(null)
        setSaved(false)
        setStep('form')
        reset()
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, reset])

  const handleSave = async () => {
    if (!selected || selected === business?.type) { onClose(); return }
    const ok = await update({ type: selected })
    if (ok) {
      setSaved(true)
      setStep('save-success')
    }
  }

  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'manage.edit_type_hero_title' })
    const emphasis = intl.formatMessage({ id: 'manage.edit_type_hero_title_emphasis' })
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

  const title = step === 'form'
    ? intl.formatMessage({ id: 'manage.edit_type_title' })
    : intl.formatMessage({ id: 'manage.edit_type_title_success' })

  const footer = step === 'form' ? (
    <IonButton
      expand="block"
      onClick={handleSave}
      disabled={isSubmitting || !selected || selected === business?.type}
      className="flex-1"
    >
      {isSubmitting ? <IonSpinner name="crescent" /> : intl.formatMessage({ id: 'manage.save' })}
    </IonButton>
  ) : (
    <IonButton
      expand="block"
      onClick={onClose}
      className="flex-1"
    >
      {intl.formatMessage({ id: 'common.done' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      noSwipeDismiss
    >
      {step === 'form' && (
        <>
          {error && <div className="modal-error">{error}</div>}

          <header className="modal-hero edit-type__hero">
            <div className="modal-hero__eyebrow">
              {intl.formatMessage({ id: 'manage.edit_type_eyebrow' })}
            </div>
            <h1 className="modal-hero__title">{titleNode}</h1>
            <p className="modal-hero__subtitle">
              {intl.formatMessage({ id: 'manage.edit_type_hero_subtitle' })}
            </p>
          </header>

          <div className="edit-type__shelf">
            <p className="edit-type__caption">
              {intl.formatMessage({ id: 'manage.edit_type_caption' })}
            </p>
            <BusinessTypeGrid selected={selected} onSelect={setSelected} />
          </div>
        </>
      )}

      {step === 'save-success' && (
        <div className="manage-seal" aria-hidden={!saved}>
          <div className="manage-seal__lottie">
            {saved && (
              <LottiePlayer
                src="/animations/success.json"
                loop={false}
                autoplay={true}
                delay={300}
                style={{ width: 144, height: 144 }}
              />
            )}
          </div>

          <span className="manage-seal__stamp">
            {intl.formatMessage({ id: 'manage.edit_type_success_stamp' })}
          </span>

          <h2 className="manage-seal__title">
            {intl.formatMessage(
              { id: 'manage.edit_type_success_title' },
              { em: (chunks) => <em>{chunks}</em> },
            )}
          </h2>

          <p className="manage-seal__subtitle">
            {intl.formatMessage({ id: 'manage.edit_type_success_subtitle' })}
          </p>
        </div>
      )}
    </ModalShell>
  )
}
