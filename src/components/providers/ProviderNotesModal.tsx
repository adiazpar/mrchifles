'use client'

import { useTranslations } from 'next-intl'
import { Spinner, Modal, useMorphingModal, ConfirmationAnimation } from '@/components/ui'

interface SaveNotesButtonProps {
  onSubmit: () => Promise<boolean>
  isSaving: boolean
  disabled: boolean
}

function SaveNotesButton({ onSubmit, isSaving, disabled }: SaveNotesButtonProps) {
  const { goToStep } = useMorphingModal()
  const tCommon = useTranslations('common')

  // Optimistic: jump to the success step first, fire the API in the
  // background. Parent handles the error-surfacing path via its own
  // error state (and we can wire a rollback later if needed).
  const handleClick = () => {
    goToStep(1)
    onSubmit()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-primary flex-1"
      disabled={disabled}
    >
      {isSaving ? <Spinner /> : tCommon('save')}
    </button>
  )
}

export interface ProviderNotesModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  /** Current textarea value. */
  notes: string
  onNotesChange: (notes: string) => void

  /** Original persisted value — used to decide if Save should be enabled. */
  originalNotes: string

  isSaving: boolean
  notesSaved: boolean
  error: string
  onSubmit: () => Promise<boolean>
}

export function ProviderNotesModal({
  isOpen,
  onClose,
  onExitComplete,
  notes,
  onNotesChange,
  originalNotes,
  isSaving,
  notesSaved,
  error,
  onSubmit,
}: ProviderNotesModalProps) {
  const t = useTranslations('providers')
  const tCommon = useTranslations('common')

  const hasExistingNote = originalNotes.trim().length > 0
  const hasChanges = notes.trim() !== originalNotes.trim()
  const title = hasExistingNote
    ? t('notes_modal_title_edit')
    : t('notes_modal_title_add')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title={title}
    >
      {/* Step 0: Edit form */}
      <Modal.Step title={title}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        <Modal.Item>
          <label htmlFor="provider-note-text" className="label">
            {t('notes_label')}
          </label>
          <textarea
            id="provider-note-text"
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            className="input"
            rows={8}
            placeholder={t('notes_textarea_placeholder')}
            autoFocus
          />
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary flex-1"
            disabled={isSaving}
          >
            {tCommon('cancel')}
          </button>
          <SaveNotesButton
            onSubmit={onSubmit}
            isSaving={isSaving}
            disabled={isSaving || !hasChanges}
          />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Save success */}
      <Modal.Step title={t('success_notes_saved_title')} hideBackButton>
        <Modal.Item>
          <ConfirmationAnimation
            type="success"
            triggered={notesSaved}
            title={t('success_notes_saved_heading')}
            subtitle={t('success_notes_saved_subtitle')}
          />
        </Modal.Item>

        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('done')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
