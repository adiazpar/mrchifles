'use client'

import { useIntl } from 'react-intl';
import { Spinner, Modal, useModal, ConfirmationAnimation } from '@/components/ui'
import { NOTE_TITLE_MAX, NOTE_BODY_MAX } from '@kasero/shared/provider-notes'

interface SaveNoteButtonProps {
  onSubmit: () => Promise<boolean>
  isSaving: boolean
  disabled: boolean
}

function SaveNoteButton({ onSubmit, isSaving, disabled }: SaveNoteButtonProps) {
  const { goToStep } = useModal()
  const tCommon = useIntl()

  // Optimistic: jump to the success step immediately, fire the API in
  // the background. If it fails the parent surfaces the error on reopen.
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
      {isSaving ? <Spinner /> : tCommon.formatMessage({
        id: 'common.save'
      })}
    </button>
  );
}

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
  const tCommon = useIntl()

  const isValid = title.trim().length > 0 && body.trim().length > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title={t.formatMessage({
        id: 'providers.note_modal_title_add'
      })}
    >
      {/* Step 0: form */}
      <Modal.Step title={t.formatMessage({
        id: 'providers.note_modal_title_add'
      })}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">{error}</div>
          </Modal.Item>
        )}

        <Modal.Item>
          <label htmlFor="provider-note-title" className="label">
            {t.formatMessage({
              id: 'providers.note_title_label'
            })} <span className="text-error">*</span>
          </label>
          <input
            id="provider-note-title"
            type="text"
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            className="input"
            placeholder={t.formatMessage({
              id: 'providers.note_title_placeholder'
            })}
            autoComplete="off"
            maxLength={NOTE_TITLE_MAX}
          />
        </Modal.Item>

        <Modal.Item>
          <label htmlFor="provider-note-body" className="label">
            {t.formatMessage({
              id: 'providers.note_body_label'
            })} <span className="text-error">*</span>
          </label>
          <textarea
            id="provider-note-body"
            value={body}
            onChange={e => onBodyChange(e.target.value)}
            className="input"
            rows={8}
            placeholder={t.formatMessage({
              id: 'providers.note_body_placeholder'
            })}
            maxLength={NOTE_BODY_MAX}
          />
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary flex-1"
            disabled={isSaving}
          >
            {tCommon.formatMessage({
              id: 'common.cancel'
            })}
          </button>
          <SaveNoteButton
            onSubmit={onSubmit}
            isSaving={isSaving}
            disabled={isSaving || !isValid}
          />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 1: save success */}
      <Modal.Step title={t.formatMessage({
        id: 'providers.success_note_added_title'
      })} hideBackButton>
        <Modal.Item>
          <ConfirmationAnimation
            type="success"
            triggered={noteSaved}
            title={t.formatMessage({
              id: 'providers.success_note_added_heading'
            })}
            subtitle={t.formatMessage({
              id: 'providers.success_note_added_subtitle'
            })}
          />
        </Modal.Item>

        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon.formatMessage({
              id: 'common.done'
            })}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  );
}
