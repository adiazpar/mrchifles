'use client'

import { useEffect, useRef, useState } from 'react'
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
import { ProviderEmailField, ProviderSuccessBody } from './AddProviderModal'
import { ModalShell } from '@/components/ui'

type Step = 'form' | 'save-success'

export interface EditProviderEmailModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  initialEmail: string
  isSaving: boolean
  error: string
  providerSaved: boolean
  /** PATCH the provider's email. Empty string clears it (server stores null). */
  onSubmit: (email: string) => Promise<boolean>
}

/**
 * Per-field edit modal for a provider's email. Mirrors the phone
 * variant — email is optional, "no input" clears the field. Server
 * still validates shape via the Zod email schema; client doesn't
 * pre-validate so the user gets the canonical translated error from
 * the API envelope rather than a divergent client message.
 */
export function EditProviderEmailModal({
  isOpen,
  onClose,
  onExitComplete,
  initialEmail,
  isSaving,
  error,
  providerSaved,
  onSubmit,
}: EditProviderEmailModalProps) {
  const t = useIntl()
  const [step, setStep] = useState<Step>('form')
  const [value, setValue] = useState(initialEmail)

  // Gate the reset on close→open transition only. The parent updates
  // provider.email before this modal commits step='save-success', so a
  // reset on every initialEmail change clobbers the success step. See
  // EditProviderNameModal for the full rationale.
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setStep('form')
      setValue(initialEmail)
    }
    wasOpenRef.current = isOpen
  }, [isOpen, initialEmail])

  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(onExitComplete, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onExitComplete])

  const trimmed = value.trim()
  const hasChanges = trimmed !== initialEmail.trim()
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
                {t.formatMessage({ id: 'providers.edit_email_eyebrow' })}
              </span>
              <h1 className="pm-hero__title">
                {t.formatMessage(
                  { id: 'providers.edit_email_title' },
                  { em: (chunks) => <em>{chunks}</em> },
                )}
              </h1>
              <p className="pm-hero__subtitle">
                {t.formatMessage({ id: 'providers.edit_email_subtitle' })}
              </p>
            </header>

            {error && (
              <div className="pm-error" role="alert">
                {error}
              </div>
            )}

            <div className="pv-fields">
              <ProviderEmailField value={value} onChange={setValue} />
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
