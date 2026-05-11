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
import { ProviderSuccessBody } from './AddProviderModal'
import { ModalShell } from '@/components/ui'
import { getProviderInitials } from './ProviderListItem'
import type { Provider } from '@kasero/shared/types'

type Step = 'confirm' | 'delete-success'

export interface DeleteProviderModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  provider: Provider | null
  isDeleting: boolean
  error: string
  providerDeleted: boolean
  /** Resolves true on a successful delete; the modal then advances to
      the delete-success step so the parent can navigate away after
      onExitComplete. */
  onDelete: () => Promise<boolean>
}

/**
 * Standalone delete-confirm flow for a provider, extracted from the
 * old all-fields EditProviderModal. Two steps: oxblood-tinted confirm
 * surface with a specimen card, then the quiet delete-success step
 * (no celebration on destruction — the success body's mode="delete"
 * branch keeps the static oxblood seal). The parent owns the API call
 * and detaches the provider from the shared client state on success.
 */
export function DeleteProviderModal({
  isOpen,
  onClose,
  onExitComplete,
  provider,
  isDeleting,
  error,
  providerDeleted,
  onDelete,
}: DeleteProviderModalProps) {
  const t = useIntl()
  const [step, setStep] = useState<Step>('confirm')

  useEffect(() => {
    if (isOpen) setStep('confirm')
  }, [isOpen])

  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(onExitComplete, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onExitComplete])

  const handleDelete = async () => {
    const ok = await onDelete()
    if (ok) setStep('delete-success')
  }

  const footer =
    step === 'confirm' ? (
      <button
        type="button"
        className="tm-invite__danger-pill"
        onClick={handleDelete}
        disabled={isDeleting || !provider}
      >
        {isDeleting ? (
          <span
            className="order-modal__pill-spinner"
            aria-label={t.formatMessage({ id: 'common.loading' })}
          />
        ) : (
          t.formatMessage({ id: 'providers.modal_v2.delete_confirm' })
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
        {step === 'confirm' && provider && (
          <div className="pm-shell">
            <header className="pm-hero">
              <span className="pm-hero__eyebrow pm-hero__eyebrow--danger">
                {t.formatMessage({ id: 'providers.modal_v2.eyebrow_delete' })}
              </span>
              <h1 className="pm-hero__title pm-hero__title--danger">
                {t.formatMessage(
                  { id: 'providers.modal_v2.title_delete' },
                  {
                    name: provider.name,
                    em: (chunks) => <em>{chunks}</em>,
                  },
                )}
              </h1>
              <p className="pm-hero__subtitle">
                {t.formatMessage({ id: 'providers.modal_v2.subtitle_delete' })}
              </p>
            </header>

            {error && (
              <div className="pm-error" role="alert">
                {error}
              </div>
            )}

            <div
              className="pv-specimen"
              data-active={provider.active ? 'true' : 'false'}
            >
              <span className="pv-specimen__avatar" aria-hidden="true">
                {getProviderInitials(provider.name)}
              </span>
              <span className="pv-specimen__body">
                <span className="pv-specimen__name">{provider.name}</span>
                <span className="pv-specimen__meta">
                  <span className="pv-specimen__meta-dot" aria-hidden="true" />
                  <span>
                    {t.formatMessage({
                      id: provider.active
                        ? 'providers.modal_v2.status_pill_active'
                        : 'providers.modal_v2.status_pill_paused',
                    })}
                  </span>
                  {(provider.phone || provider.email) && (
                    <>
                      <span
                        className="pv-specimen__meta-sep"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                      <span>
                        {(provider.phone || provider.email || '').toUpperCase()}
                      </span>
                    </>
                  )}
                </span>
              </span>
            </div>
          </div>
        )}
        {step === 'delete-success' && (
          <ProviderSuccessBody triggered={providerDeleted} mode="delete" />
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
