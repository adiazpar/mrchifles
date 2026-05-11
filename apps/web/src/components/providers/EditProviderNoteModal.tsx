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
import { close, chevronBack } from 'ionicons/icons'
import { ModalShell } from '@/components/ui'
import {
  NoteTitleField,
  NoteBodyField,
  ProviderNoteSuccessBody,
} from './AddProviderNoteModal'
import { NOTE_BODY_MAX } from '@kasero/shared/provider-notes'
import { formatRelative } from '@/lib/formatRelative'
import type { ProviderNote } from '@kasero/shared/types'

type Step = 'form' | 'delete-confirm' | 'delete-success' | 'save-success'

function stepFromProp(initialStep: 0 | 1): Step {
  return initialStep === 1 ? 'delete-confirm' : 'form'
}

export interface EditProviderNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  /** 0 = form (pencil), 1 = delete-confirm (trash). */
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

/**
 * Edit / delete a provider note — Modern Mercantile.
 *
 * Pattern 1, rawContent. Same chrome contract as AddProviderNoteModal.
 * Adds two extra steps:
 *   - delete-confirm: oxblood hero + the note-being-deleted as a
 *     dashed-frame specimen (3-line clamped body)
 *   - delete-success: oxblood seal
 *
 * Demoted destructive link in the form footer mirrors the
 * EditProviderModal pattern. When opened directly via the trash icon
 * (initialStep=1), backing out closes the modal entirely.
 */
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
  const userLocale = t.locale

  const [step, setStep] = useState<Step>(stepFromProp(initialStep))
  // Tracks whether the modal has ever been opened in this mount. Required
  // so the cleanup-effect doesn't fire on initial mount and wipe the
  // sibling Add-note modal's draft state — see the same guard in
  // AddProviderNoteModal for the full rationale.
  const wasOpenRef = useRef(false)

  // Sync step when the modal opens at a different initialStep.
  useEffect(() => {
    if (isOpen) setStep(stepFromProp(initialStep))
  }, [isOpen, initialStep])

  // Delayed cleanup so the parent's onExitComplete (clears editingNoteId
  // + form draft) doesn't fire mid dismiss animation. Skips the initial
  // mount-with-isOpen=false state via wasOpenRef.
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true
      return
    }
    if (!wasOpenRef.current) return
    const timer = window.setTimeout(onExitComplete, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onExitComplete])

  // True when the modal was opened directly from a note row's trash
  // icon — back/cancel should close the modal instead of returning to
  // the form.
  const openedAsDelete = initialStep === 1

  const isValid = title.trim().length > 0 && body.trim().length > 0
  const hasChanges = editingNote
    ? title.trim() !== editingNote.title.trim() ||
      body.trim() !== editingNote.body.trim()
    : false

  const handleSave = () => {
    setStep('save-success')
    void onSubmit()
  }

  const handleDelete = async () => {
    const ok = await onDelete()
    if (ok) {
      setStep('delete-success')
    } else if (!openedAsDelete) {
      setStep('form')
    }
  }

  const onBack: (() => void) | undefined =
    step === 'delete-confirm' && !openedAsDelete
      ? () => setStep('form')
      : undefined

  const bodyCharsLeft = NOTE_BODY_MAX - body.length
  const counterWarn = bodyCharsLeft <= NOTE_BODY_MAX * 0.05

  let footer: React.ReactNode = null
  if (step === 'form') {
    footer = (
      <>
        <button
          type="button"
          className="provider-modal__delete-link"
          onClick={() => setStep('delete-confirm')}
          disabled={isSaving}
        >
          {t.formatMessage({ id: 'providers.modal_v2.note_delete_link' })}
        </button>
        <button
          type="button"
          className="order-modal__primary-pill"
          onClick={handleSave}
          disabled={isSaving || !isValid || !hasChanges}
          data-haptic
        >
          {isSaving ? (
            <span
              className="order-modal__pill-spinner"
              aria-label={t.formatMessage({ id: 'common.loading' })}
            />
          ) : (
            t.formatMessage({ id: 'providers.modal_v2.note_save_button' })
          )}
        </button>
      </>
    )
  } else if (step === 'delete-confirm') {
    footer = (
      <button
        type="button"
        className="tm-invite__danger-pill"
        onClick={handleDelete}
        disabled={isDeleting}
        data-haptic
      >
        {isDeleting ? (
          <span
            className="order-modal__pill-spinner"
            aria-label={t.formatMessage({ id: 'common.loading' })}
          />
        ) : (
          t.formatMessage({ id: 'providers.modal_v2.note_delete_confirm' })
        )}
      </button>
    )
  } else {
    footer = (
      <button
        type="button"
        className="order-modal__primary-pill"
        onClick={onClose}
      >
        {t.formatMessage({ id: 'common.done' })}
      </button>
    )
  }

  return (
    <ModalShell rawContent isOpen={isOpen} onClose={onClose} noSwipeDismiss>
      <IonHeader className="pm-header">
        <IonToolbar>
          {onBack && (
            <IonButtons slot="start">
              <IonButton
                fill="clear"
                onClick={onBack}
                aria-label={t.formatMessage({ id: 'common.back' })}
              >
                <IonIcon icon={chevronBack} />
              </IonButton>
            </IonButtons>
          )}
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
        {step === 'form' && editingNote && (
          <FormBody
            title={title}
            onTitleChange={onTitleChange}
            body={body}
            onBodyChange={onBodyChange}
            counterWarn={counterWarn}
            charsLeft={bodyCharsLeft}
            error={error}
          />
        )}
        {step === 'delete-confirm' && editingNote && (
          <DeleteConfirmBody
            note={editingNote}
            error={error}
            userLocale={userLocale}
          />
        )}
        {step === 'save-success' && (
          <ProviderNoteSuccessBody triggered={noteSaved} mode="edit" />
        )}
        {step === 'delete-success' && (
          <ProviderNoteSuccessBody triggered={noteDeleted} mode="delete" />
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

interface FormBodyProps {
  title: string
  onTitleChange: (v: string) => void
  body: string
  onBodyChange: (v: string) => void
  counterWarn: boolean
  charsLeft: number
  error: string
}

function FormBody({
  title,
  onTitleChange,
  body,
  onBodyChange,
  counterWarn,
  charsLeft,
  error,
}: FormBodyProps) {
  const t = useIntl()
  return (
    <div className="pm-shell">
      <header className="pm-hero">
        <span className="pm-hero__eyebrow">
          {t.formatMessage({ id: 'providers.modal_v2.note_eyebrow_edit' })}
        </span>
        <h1 className="pm-hero__title">
          {t.formatMessage(
            { id: 'providers.modal_v2.note_title_edit' },
            { em: (chunks) => <em key="em">{chunks}</em> },
          )}
        </h1>
        <p className="pm-hero__subtitle">
          {t.formatMessage({ id: 'providers.modal_v2.note_subtitle_edit' })}
        </p>
      </header>

      {error && <div className="pm-error" role="alert">{error}</div>}

      <div className="pv-fields">
        <NoteTitleField
          value={title}
          onChange={onTitleChange}
          inputId="edit-provider-note-title"
        />
        <NoteBodyField
          value={body}
          onChange={onBodyChange}
          counterWarn={counterWarn}
          charsLeft={charsLeft}
          inputId="edit-provider-note-body"
        />
      </div>
    </div>
  )
}

interface DeleteConfirmBodyProps {
  note: ProviderNote
  error: string
  userLocale: string
}

function DeleteConfirmBody({ note, error, userLocale }: DeleteConfirmBodyProps) {
  const t = useIntl()

  return (
    <div className="pm-shell">
      <header className="pm-hero">
        <span className="pm-hero__eyebrow pm-hero__eyebrow--danger">
          {t.formatMessage({ id: 'providers.modal_v2.note_eyebrow_delete' })}
        </span>
        <h1 className="pm-hero__title pm-hero__title--danger">
          {t.formatMessage(
            { id: 'providers.modal_v2.note_title_delete' },
            { em: (chunks) => <em>{chunks}</em> },
          )}
        </h1>
        <p className="pm-hero__subtitle">
          {t.formatMessage({ id: 'providers.modal_v2.note_subtitle_delete' })}
        </p>
      </header>

      {error && <div className="pm-error" role="alert">{error}</div>}

      {/* Specimen — italic Fraunces title, mono "EDITED ..." caption,
          3-line clamped body so a long note doesn't push the confirm
          pill below the fold. */}
      <div className="pv-note-specimen">
        <p className="pv-note-specimen__title">{note.title}</p>
        <span className="pv-note-specimen__meta">
          {t.formatMessage(
            { id: 'providers.note_edited_on' },
            { date: formatRelative(note.updatedAt, userLocale) },
          )}
        </span>
        <p className="pv-note-specimen__body">{note.body}</p>
      </div>
    </div>
  )
}
