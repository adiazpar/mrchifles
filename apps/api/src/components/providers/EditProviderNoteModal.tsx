'use client'

import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { Spinner, Modal, useModal, ConfirmationAnimation } from '@/components/ui'
import { NOTE_TITLE_MAX, NOTE_BODY_MAX } from '@/lib/provider-notes'
import type { ProviderNote } from '@kasero/shared/types'

// ============================================
// SAVE BUTTON
// ============================================

interface SaveNoteButtonProps {
  onSubmit: () => Promise<boolean>
  isSaving: boolean
  disabled: boolean
}

function SaveNoteButton({ onSubmit, isSaving, disabled }: SaveNoteButtonProps) {
  const { goToStep } = useModal()
  const tCommon = useTranslations('common')

  // Optimistic: navigate to the save-success step before firing the API.
  const handleClick = () => {
    goToStep(3)
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

// ============================================
// DELETE BUTTON
// ============================================

interface DeleteNoteButtonProps {
  onConfirm: () => Promise<boolean>
  isDeleting: boolean
}

function DeleteNoteButton({ onConfirm, isDeleting }: DeleteNoteButtonProps) {
  const tCommon = useTranslations('common')
  const { goToStep } = useModal()

  // Wait for the API to resolve so a failure lands us back on the form
  // step with the error visible instead of showing the success animation.
  const handleClick = async () => {
    const ok = await onConfirm()
    if (ok) goToStep(2)
    else goToStep(0)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-danger flex-1"
      disabled={isDeleting}
    >
      {isDeleting ? <Spinner /> : tCommon('delete')}
    </button>
  )
}

// ============================================
// PROPS
// ============================================

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

// ============================================
// COMPONENT
// ============================================

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
  const t = useTranslations('providers')
  const tCommon = useTranslations('common')

  const isValid = title.trim().length > 0 && body.trim().length > 0
  const hasChanges = editingNote
    ? title.trim() !== editingNote.title.trim() || body.trim() !== editingNote.body.trim()
    : false
  // True when the modal was opened directly from a note row's trash
  // icon. In that flow the delete-confirm step has no meaningful "edit"
  // step to return to, so Cancel and the header back-arrow should
  // close the modal instead of dropping the user into the edit form.
  const openedAsDelete = initialStep === 1

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title={t('note_modal_title_edit')}
      initialStep={initialStep}
    >
      {/* Step 0: edit form */}
      <Modal.Step title={t('note_modal_title_edit')}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">{error}</div>
          </Modal.Item>
        )}

        <Modal.Item>
          <label htmlFor="edit-provider-note-title" className="label">
            {t('note_title_label')} <span className="text-error">*</span>
          </label>
          <input
            id="edit-provider-note-title"
            type="text"
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            className="input"
            placeholder={t('note_title_placeholder')}
            autoComplete="off"
            maxLength={NOTE_TITLE_MAX}
          />
        </Modal.Item>

        <Modal.Item>
          <label htmlFor="edit-provider-note-body" className="label">
            {t('note_body_label')} <span className="text-error">*</span>
          </label>
          <textarea
            id="edit-provider-note-body"
            value={body}
            onChange={e => onBodyChange(e.target.value)}
            className="input"
            rows={8}
            placeholder={t('note_body_placeholder')}
            maxLength={NOTE_BODY_MAX}
          />
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton step={1} className="btn btn-secondary btn-icon">
            <Trash2 className="text-error" style={{ width: 16, height: 16 }} />
          </Modal.GoToStepButton>
          <SaveNoteButton
            onSubmit={onSubmit}
            isSaving={isSaving}
            disabled={isSaving || !isValid || !hasChanges}
          />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: delete confirmation */}
      <Modal.Step
        title={t('note_delete_confirm_title')}
        backStep={openedAsDelete ? undefined : 0}
        hideBackButton={openedAsDelete}
      >
        <Modal.Item>
          <p className="text-text-secondary">
            {t('note_delete_confirm_body', { title: editingNote?.title ?? '' })}
          </p>
        </Modal.Item>

        <Modal.Footer>
          {openedAsDelete ? (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={isDeleting}
            >
              {tCommon('cancel')}
            </button>
          ) : (
            <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1" disabled={isDeleting}>
              {tCommon('cancel')}
            </Modal.GoToStepButton>
          )}
          <DeleteNoteButton onConfirm={onDelete} isDeleting={isDeleting} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: delete success */}
      <Modal.Step title={t('success_note_deleted_title')} hideBackButton>
        <Modal.Item>
          <ConfirmationAnimation
            type="error"
            triggered={noteDeleted}
            title={t('success_note_deleted_heading')}
            subtitle={t('success_note_deleted_subtitle')}
          />
        </Modal.Item>

        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('done')}
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: save success */}
      <Modal.Step title={t('success_note_updated_title')} hideBackButton>
        <Modal.Item>
          <ConfirmationAnimation
            type="success"
            triggered={noteSaved}
            title={t('success_note_updated_heading')}
            subtitle={t('success_note_updated_subtitle')}
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
