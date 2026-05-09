'use client'

import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl';
import { Trash2 } from 'lucide-react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ConfirmationAnimation } from '@/components/ui'
import { ModalShell } from '@/components/ui/modal-shell'
import type { Provider } from '@kasero/shared/types'

type Step = 'form' | 'delete-confirm' | 'delete-success' | 'save-success'

function stepFromProp(prop: number): Step {
  return prop !== 0 ? 'delete-confirm' : 'form'
}

export interface ProviderModalProps {
  isOpen: boolean
  /** Step to open on (0 = form, 1 = delete confirm). Default 0. */
  initialStep?: number
  onClose: () => void
  onExitComplete: () => void

  name: string
  onNameChange: (name: string) => void
  phone: string
  onPhoneChange: (phone: string) => void
  email: string
  onEmailChange: (email: string) => void
  active: boolean
  onActiveChange: (active: boolean) => void

  editingProvider: Provider | null

  isSaving: boolean
  error: string

  providerSaved: boolean

  onSubmit: () => Promise<boolean>

  // Delete flow — only relevant when editing an existing provider.
  canDelete: boolean
  isDeleting: boolean
  providerDeleted: boolean
  onDelete: () => Promise<boolean>
}

export function ProviderModal({
  isOpen,
  initialStep = 0,
  onClose,
  onExitComplete,
  name,
  onNameChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  active,
  onActiveChange,
  editingProvider,
  isSaving,
  error,
  providerSaved,
  onSubmit,
  canDelete,
  isDeleting,
  providerDeleted,
  onDelete,
}: ProviderModalProps) {
  const t = useIntl()

  const [step, setStep] = useState<Step>(stepFromProp(initialStep))

  // Sync step when the modal opens at a different initialStep.
  useEffect(() => {
    if (isOpen) {
      setStep(stepFromProp(initialStep))
    }
  }, [isOpen, initialStep])

  // Reset step state after the modal dismissal animation completes.
  // Also fire onExitComplete so the parent can clear its own state.
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStep(stepFromProp(initialStep))
        onExitComplete()
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialStep, onExitComplete])

  const isFormValid = name.trim().length > 0
  const showDeleteAction = !!editingProvider && canDelete

  // Mirrors OrderDetailModal: when opened directly at the delete step (via a
  // swipe-tray action), back/cancel should dismiss instead of returning to the form.
  const openedFromSwipe = initialStep !== 0

  // In edit mode the Save button is disabled until the user changes something;
  // Add mode always has "changes" (the user is creating new).
  const hasChanges = editingProvider
    ? (
        name.trim() !== (editingProvider.name ?? '').trim() ||
        phone.trim() !== (editingProvider.phone ?? '').trim() ||
        email.trim() !== (editingProvider.email ?? '').trim() ||
        active !== editingProvider.active
      )
    : true

  // Optimistic save: jump to success immediately, fire API in background.
  // The user dismisses the success step manually via the Done button.
  const handleSave = () => {
    setStep('save-success')
    onSubmit()
  }

  // Await the delete API — navigate on result so a failure shows the error on the form.
  const handleDelete = async () => {
    const ok = await onDelete()
    if (ok) {
      setStep('delete-success')
    } else {
      setStep('form')
    }
  }

  // Derive title, back button, and footer for each step.
  let modalTitle: string
  let onBack: (() => void) | undefined
  let footer: React.ReactNode

  if (step === 'form') {
    modalTitle = editingProvider
      ? t.formatMessage({ id: 'providers.modal_title_edit' })
      : t.formatMessage({ id: 'providers.modal_title_add' })
    onBack = undefined
    footer = (
      <>
        {showDeleteAction && (
          <IonButton
            fill="clear"
            shape="round"
            onClick={() => setStep('delete-confirm')}
            aria-label={t.formatMessage({ id: 'common.delete' })}
          >
            <Trash2 className="text-error" style={{ width: 16, height: 16 }} />
          </IonButton>
        )}
        <IonButton
          onClick={handleSave}
          disabled={isSaving || !isFormValid || !hasChanges}
          className="flex-1"
        >
          {isSaving ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'providers.save_button' })}
        </IonButton>
      </>
    )
  } else if (step === 'delete-confirm') {
    modalTitle = t.formatMessage({ id: 'providers.delete_provider_confirm_title' })
    // Toolbar X dismisses; toolbar back (when present) returns to form.
    // Footer holds only the destructive primary.
    onBack = openedFromSwipe ? undefined : () => setStep('form')
    footer = (
      <IonButton color="danger" onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'common.delete' })}
      </IonButton>
    )
  } else {
    // delete-success or save-success
    modalTitle = ''
    onBack = undefined
    footer = (
      <IonButton expand="block" onClick={onClose} className="flex-1">
        {t.formatMessage({ id: 'common.done' })}
      </IonButton>
    )
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      onBack={onBack}
      footer={footer}
      noSwipeDismiss
    >
      {step === 'form' && (
        <>
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label htmlFor="provider-name" className="label">
              {t.formatMessage({ id: 'providers.name_label' })} <span className="text-error">*</span>
            </label>
            <input
              id="provider-name"
              type="text"
              value={name}
              onChange={e => onNameChange(e.target.value)}
              className="input"
              placeholder={t.formatMessage({ id: 'providers.name_placeholder' })}
              autoComplete="off"
              maxLength={80}
            />
          </div>

          <div>
            <label htmlFor="provider-phone" className="label">
              {t.formatMessage({ id: 'providers.phone_label' })}
            </label>
            <input
              id="provider-phone"
              type="tel"
              value={phone}
              onChange={e => onPhoneChange(e.target.value)}
              className="input"
              placeholder="999 999 999"
            />
          </div>

          <div>
            <label htmlFor="provider-email" className="label">
              {t.formatMessage({ id: 'providers.email_label' })}
            </label>
            <input
              id="provider-email"
              type="email"
              value={email}
              onChange={e => onEmailChange(e.target.value)}
              className="input"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="label mb-0">{t.formatMessage({ id: 'providers.active_label' })}</span>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {t.formatMessage({ id: 'providers.active_description' })}
                </p>
              </div>
              <input
                type="checkbox"
                checked={active}
                onChange={e => onActiveChange(e.target.checked)}
                className="toggle"
              />
            </div>
          </div>
        </>
      )}

      {step === 'delete-confirm' && (
        <p className="text-text-secondary">
          {t.formatMessage(
            { id: 'providers.delete_provider_confirm_body' },
            { name: editingProvider?.name ?? '' }
          )}
        </p>
      )}

      {step === 'delete-success' && (
        <ConfirmationAnimation
          type="error"
          triggered={providerDeleted}
          title={t.formatMessage({ id: 'providers.success_deleted_heading' })}
          subtitle={t.formatMessage({ id: 'providers.success_deleted_subtitle' })}
        />
      )}

      {step === 'save-success' && (
        <ConfirmationAnimation
          type="success"
          triggered={providerSaved}
          title={editingProvider
            ? t.formatMessage({ id: 'providers.success_updated_heading' })
            : t.formatMessage({ id: 'providers.success_added_heading' })}
          subtitle={editingProvider
            ? t.formatMessage({ id: 'providers.success_updated_subtitle' })
            : t.formatMessage({ id: 'providers.success_added_subtitle' })}
        />
      )}
    </ModalShell>
  )
}
