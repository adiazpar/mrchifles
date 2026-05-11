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
import { ProviderNameField, ProviderSuccessBody } from './AddProviderModal'
import { ModalShell } from '@/components/ui'

type Step = 'form' | 'save-success'

export interface EditProviderNameModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  initialName: string
  isSaving: boolean
  error: string
  providerSaved: boolean
  /** PATCH the provider with the new name. Resolves true on success
      so the modal can advance to the save-success step. */
  onSubmit: (name: string) => Promise<boolean>
}

/**
 * Per-field edit modal for a provider's name. Mirrors the manage-page
 * EditNameModal pattern: focused, single field, terracotta primary
 * pill in the footer, lottie save-success step on resolution. The
 * modal owns the input state; the parent page owns the API call (so
 * it can also update the shared providers store on success).
 */
export function EditProviderNameModal({
  isOpen,
  onClose,
  onExitComplete,
  initialName,
  isSaving,
  error,
  providerSaved,
  onSubmit,
}: EditProviderNameModalProps) {
  const t = useIntl()
  const [step, setStep] = useState<Step>('form')
  const [value, setValue] = useState(initialName)

  // Reset to form + initialName only when the modal transitions from
  // closed to open. The parent updates provider.name (the source of
  // initialName) inside the save handler before this modal commits its
  // step='save-success' transition; if we reset on every initialName
  // change the success step renders for one frame and is immediately
  // flipped back to 'form', so the Lottie celebration never shows.
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setStep('form')
      setValue(initialName)
    }
    wasOpenRef.current = isOpen
  }, [isOpen, initialName])

  // Delayed cleanup so onExitComplete fires after the dismiss animation.
  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(onExitComplete, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onExitComplete])

  const trimmed = value.trim()
  const hasInput = trimmed.length > 0
  const hasChanges = hasInput && trimmed !== initialName.trim()
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
                {t.formatMessage({ id: 'providers.edit_name_eyebrow' })}
              </span>
              <h1 className="pm-hero__title">
                {t.formatMessage(
                  { id: 'providers.edit_name_title' },
                  { em: (chunks) => <em>{chunks}</em> },
                )}
              </h1>
              <p className="pm-hero__subtitle">
                {t.formatMessage({ id: 'providers.edit_name_subtitle' })}
              </p>
            </header>

            {error && (
              <div className="pm-error" role="alert">
                {error}
              </div>
            )}

            <div className="pv-fields">
              <ProviderNameField value={value} onChange={setValue} />
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
