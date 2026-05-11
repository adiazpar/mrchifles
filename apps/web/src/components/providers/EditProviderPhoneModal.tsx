'use client'

import { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { ProviderPhoneField, ProviderSuccessBody } from './AddProviderModal'
import { ModalShell } from '@/components/ui'

type Step = 'form' | 'save-success'

export interface EditProviderPhoneModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  initialPhone: string
  isSaving: boolean
  error: string
  providerSaved: boolean
  /** PATCH the provider's phone. Empty string clears it (server stores null). */
  onSubmit: (phone: string) => Promise<boolean>
}

/**
 * Per-field edit modal for a provider's phone. Phone is optional, so
 * "no input" is a valid submission (clears the value). The save button
 * stays enabled whenever the trimmed input differs from the current
 * value, including the empty case.
 */
export function EditProviderPhoneModal({
  isOpen,
  onClose,
  onExitComplete,
  initialPhone,
  isSaving,
  error,
  providerSaved,
  onSubmit,
}: EditProviderPhoneModalProps) {
  const t = useIntl()
  const [step, setStep] = useState<Step>('form')
  const [value, setValue] = useState(initialPhone)

  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setValue(initialPhone)
    }
  }, [isOpen, initialPhone])

  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(onExitComplete, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onExitComplete])

  const trimmed = value.trim()
  const hasChanges = trimmed !== initialPhone.trim()
  const canSave = hasChanges && !isSaving

  const handleSave = async () => {
    if (!canSave) return
    const ok = await onSubmit(trimmed)
    if (ok) setStep('save-success')
  }

  const footer =
    step === 'form' ? (
      <button
        type="button"
        className="order-modal__primary-pill"
        onClick={handleSave}
        disabled={!canSave}
      >
        {isSaving ? (
          <span
            className="order-modal__pill-spinner"
            aria-label={t.formatMessage({ id: 'common.loading' })}
          />
        ) : (
          t.formatMessage({ id: 'providers.modal_v2.save_button' })
        )}
      </button>
    ) : (
      <button
        type="button"
        className="order-modal__primary-pill"
        onClick={onClose}
      >
        {t.formatMessage({ id: 'common.done' })}
      </button>
    )

  return (
    <ModalShell rawContent isOpen={isOpen} onClose={onClose} noSwipeDismiss>
      <IonHeader className="pm-header">
        <IonToolbar>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={onClose}
              aria-label={t.formatMessage({ id: 'common.close' })}
            >
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        {step === 'form' && (
          <div className="pm-shell">
            <header className="pm-hero">
              <span className="pm-hero__eyebrow">
                {t.formatMessage({ id: 'providers.edit_phone_eyebrow' })}
              </span>
              <h1 className="pm-hero__title">
                {t.formatMessage(
                  { id: 'providers.edit_phone_title' },
                  { em: (chunks) => <em>{chunks}</em> },
                )}
              </h1>
              <p className="pm-hero__subtitle">
                {t.formatMessage({ id: 'providers.edit_phone_subtitle' })}
              </p>
            </header>

            {error && (
              <div className="pm-error" role="alert">
                {error}
              </div>
            )}

            <div className="pv-fields">
              <ProviderPhoneField value={value} onChange={setValue} />
            </div>
          </div>
        )}
        {step === 'save-success' && (
          <ProviderSuccessBody triggered={providerSaved} mode="edit" />
        )}
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">{footer}</div>
        </IonToolbar>
      </IonFooter>
    </ModalShell>
  )
}
