'use client'

import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl';
import { IonButton, IonSpinner } from '@ionic/react'
import { ConfirmationAnimation } from '@/components/ui'
import { ModalShell } from '@/components/ui/modal-shell'
import { NOTE_TITLE_MAX, NOTE_BODY_MAX } from '@kasero/shared/provider-notes'

export interface AddProviderNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  title: string
  onTitleChange: (title: string) => void
  body: string
  onBodyChange: (body: string) => void

  isSaving: boolean
  noteSaved: boolean
  error: string
  onSubmit: () => Promise<boolean>
}

export function AddProviderNoteModal({
  isOpen,
  onClose,
  onExitComplete,
  title,
  onTitleChange,
  body,
  onBodyChange,
  isSaving,
  noteSaved,
  error,
  onSubmit,
}: AddProviderNoteModalProps) {
  const t = useIntl()

  const [step, setStep] = useState<'form' | 'success'>('form')

  // Reset step state after the modal dismissal animation completes.
  // Also fire onExitComplete so the parent can clear its form state.
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStep('form')
        onExitComplete()
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onExitComplete])

  const isValid = title.trim().length > 0 && body.trim().length > 0

  // Optimistic: jump to success immediately, fire the API in the background.
  // If it fails the parent surfaces the error on reopen. The user dismisses
  // the success step manually via the Done button — never auto-close.
  const handleSave = () => {
    setStep('success')
    onSubmit()
  }

  const formFooter = (
    <>
      <IonButton
        fill="outline"
        onClick={onClose}
        disabled={isSaving}
        className="flex-1"
      >
        {t.formatMessage({ id: 'common.cancel' })}
      </IonButton>
      <IonButton
        onClick={handleSave}
        disabled={isSaving || !isValid}
        className="flex-1"
      >
        {isSaving ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'common.save' })}
      </IonButton>
    </>
  )

  const successFooter = (
    <IonButton expand="block" onClick={onClose} className="flex-1">
      {t.formatMessage({ id: 'common.done' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'form' ? t.formatMessage({ id: 'providers.note_modal_title_add' }) : ''}
      footer={step === 'form' ? formFooter : successFooter}
      noSwipeDismiss
    >
      {step === 'form' && (
        <>
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label htmlFor="provider-note-title" className="label">
              {t.formatMessage({ id: 'providers.note_title_label' })} <span className="text-error">*</span>
            </label>
            <input
              id="provider-note-title"
              type="text"
              value={title}
              onChange={e => onTitleChange(e.target.value)}
              className="input"
              placeholder={t.formatMessage({ id: 'providers.note_title_placeholder' })}
              autoComplete="off"
              maxLength={NOTE_TITLE_MAX}
            />
          </div>

          <div>
            <label htmlFor="provider-note-body" className="label">
              {t.formatMessage({ id: 'providers.note_body_label' })} <span className="text-error">*</span>
            </label>
            <textarea
              id="provider-note-body"
              value={body}
              onChange={e => onBodyChange(e.target.value)}
              className="input"
              rows={8}
              placeholder={t.formatMessage({ id: 'providers.note_body_placeholder' })}
              maxLength={NOTE_BODY_MAX}
            />
          </div>
        </>
      )}

      {step === 'success' && (
        <ConfirmationAnimation
          type="success"
          triggered={noteSaved}
          title={t.formatMessage({ id: 'providers.success_note_added_heading' })}
          subtitle={t.formatMessage({ id: 'providers.success_note_added_subtitle' })}
        />
      )}
    </ModalShell>
  )
}
