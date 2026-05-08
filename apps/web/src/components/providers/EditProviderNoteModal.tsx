'use client'

import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl';
import { Trash2 } from 'lucide-react'
import { IonSpinner } from '@ionic/react'
import { ConfirmationAnimation } from '@/components/ui'
import { ModalShell } from '@/components/ui/modal-shell'
import { NOTE_TITLE_MAX, NOTE_BODY_MAX } from '@kasero/shared/provider-notes'
import type { ProviderNote } from '@kasero/shared/types'

// Step indices
type Step = 'form' | 'delete-confirm' | 'delete-success' | 'save-success'

function initialStepFromProp(prop: 0 | 1): Step {
  return prop === 1 ? 'delete-confirm' : 'form'
}

export interface EditProviderNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  /** Which step to show first. 0 = form (edit button). 1 = delete confirm (trash button). */
  initialStep?: 0 | 1

  editingNote: ProviderNote | null

  title: string
  onTitleChange: (title: string) => void
  body: string
  onBodyChange: (body: string) => void

  isSaving: boolean
  noteSaved: boolean
  error: string
  onSubmit: () => Promise<boolean>

  isDeleting: boolean
  noteDeleted: boolean
  onDelete: () => Promise<boolean>
}

export function EditProviderNoteModal({
  isOpen,
  onClose,
  onExitComplete,
  initialStep = 0,
  editingNote,
  title,
  onTitleChange,
  body,
  onBodyChange,
  isSaving,
  noteSaved,
  error,
  onSubmit,
  isDeleting,
  noteDeleted,
  onDelete,
}: EditProviderNoteModalProps) {
  const t = useIntl()

  const [step, setStep] = useState<Step>(initialStepFromProp(initialStep))

  // Sync step when the modal opens at a different initialStep.
  useEffect(() => {
    if (isOpen) {
      setStep(initialStepFromProp(initialStep))
    }
  }, [isOpen, initialStep])

  // Reset step state after the modal dismissal animation completes.
  // Also fire onExitComplete so the parent can clear its own state.
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStep(initialStepFromProp(initialStep))
        onExitComplete()
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialStep, onExitComplete])

  const isValid = title.trim().length > 0 && body.trim().length > 0
  const hasChanges = editingNote
    ? title.trim() !== editingNote.title.trim() || body.trim() !== editingNote.body.trim()
    : false

  // True when the modal was opened directly from a note row's trash icon.
  // In that flow cancel/back should close the modal instead of returning to the form.
  const openedAsDelete = initialStep === 1

  // Optimistic save: jump to success immediately, fire API in background.
  const handleSave = () => {
    setStep('save-success')
    onSubmit()
    setTimeout(onClose, 1500)
  }

  // Await the delete API — navigate on result so a failure shows the error on the form.
  const handleDelete = async () => {
    const ok = await onDelete()
    if (ok) {
      setStep('delete-success')
      setTimeout(onClose, 1500)
    } else {
      setStep('form')
    }
  }

  // Derive title and back/footer for each step.
  let modalTitle: string
  let onBack: (() => void) | undefined
  let footer: React.ReactNode

  if (step === 'form') {
    modalTitle = t.formatMessage({ id: 'providers.note_modal_title_edit' })
    onBack = undefined
    footer = (
      <>
        <button
          type="button"
          onClick={() => setStep('delete-confirm')}
          className="btn btn-secondary btn-icon"
          aria-label={t.formatMessage({ id: 'common.delete' })}
        >
          <Trash2 className="text-error" style={{ width: 16, height: 16 }} />
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="btn btn-primary flex-1"
          disabled={isSaving || !isValid || !hasChanges}
        >
          {isSaving ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'common.save' })}
        </button>
      </>
    )
  } else if (step === 'delete-confirm') {
    modalTitle = t.formatMessage({ id: 'providers.note_delete_confirm_title' })
    onBack = openedAsDelete ? undefined : () => setStep('form')
    footer = (
      <>
        <button
          type="button"
          onClick={openedAsDelete ? onClose : () => setStep('form')}
          className="btn btn-secondary flex-1"
          disabled={isDeleting}
        >
          {t.formatMessage({ id: 'common.cancel' })}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="btn btn-danger flex-1"
          disabled={isDeleting}
        >
          {isDeleting ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'common.delete' })}
        </button>
      </>
    )
  } else {
    // delete-success or save-success
    modalTitle = ''
    onBack = undefined
    footer = (
      <button type="button" onClick={onClose} className="btn btn-primary flex-1">
        {t.formatMessage({ id: 'common.done' })}
      </button>
    )
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      onBack={onBack}
      footer={footer}
    >
      {step === 'form' && (
        <>
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label htmlFor="edit-provider-note-title" className="label">
              {t.formatMessage({ id: 'providers.note_title_label' })} <span className="text-error">*</span>
            </label>
            <input
              id="edit-provider-note-title"
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
            <label htmlFor="edit-provider-note-body" className="label">
              {t.formatMessage({ id: 'providers.note_body_label' })} <span className="text-error">*</span>
            </label>
            <textarea
              id="edit-provider-note-body"
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

      {step === 'delete-confirm' && (
        <p className="text-text-secondary">
          {t.formatMessage(
            { id: 'providers.note_delete_confirm_body' },
            { title: editingNote?.title ?? '' }
          )}
        </p>
      )}

      {step === 'delete-success' && (
        <ConfirmationAnimation
          type="error"
          triggered={noteDeleted}
          title={t.formatMessage({ id: 'providers.success_note_deleted_heading' })}
          subtitle={t.formatMessage({ id: 'providers.success_note_deleted_subtitle' })}
        />
      )}

      {step === 'save-success' && (
        <ConfirmationAnimation
          type="success"
          triggered={noteSaved}
          title={t.formatMessage({ id: 'providers.success_note_updated_heading' })}
          subtitle={t.formatMessage({ id: 'providers.success_note_updated_subtitle' })}
        />
      )}
    </ModalShell>
  )
}
