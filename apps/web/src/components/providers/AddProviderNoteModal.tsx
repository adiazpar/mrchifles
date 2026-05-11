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
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { ModalShell } from '@/components/ui'
import { NOTE_TITLE_MAX, NOTE_BODY_MAX } from '@kasero/shared/provider-notes'

type Step = 'form' | 'success'

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

/**
 * Add-note flow — Modern Mercantile.
 *
 * Pattern 1, rawContent — same chrome contract as AddProviderModal so the
 * modal-to-modal aesthetic stays cohesive (a manager often opens this
 * directly after editing the provider). The body is a two-row form: a
 * mono "TITLE" field for the headline and a generous prose textarea for
 * the body, with a live mono character counter under the textarea that
 * turns oxblood at 95% of the cap.
 */
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
  const [step, setStep] = useState<Step>('form')
  // Tracks whether the modal has ever been opened in this mount. Without
  // this, the cleanup-effect would fire its 250ms onExitComplete timer on
  // initial mount (isOpen=false from the start) and wipe sibling draft
  // state — concretely: if a user clicks Add and starts typing within
  // 250ms of mount, the spurious timer clears their input.
  const wasOpenRef = useRef(false)

  // Reset to root surface every time the modal opens.
  useEffect(() => {
    if (isOpen) setStep('form')
  }, [isOpen])

  // Delayed cleanup — runs ~250ms after dismiss animation completes so
  // the parent's onExitComplete (clears form state) doesn't fire mid
  // dismissal. Only fires on open→close transitions (never on the
  // mount-with-isOpen=false initial state).
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true
      return
    }
    if (!wasOpenRef.current) return
    const timer = window.setTimeout(onExitComplete, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onExitComplete])

  const isValid = title.trim().length > 0 && body.trim().length > 0

  // Optimistic save: jump to success immediately, fire API in background.
  const handleSave = () => {
    setStep('success')
    void onSubmit()
  }

  let footer: React.ReactNode
  if (step === 'form') {
    footer = (
      <button
        type="button"
        className="order-modal__primary-pill"
        onClick={handleSave}
        disabled={isSaving || !isValid}
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
          <FormBody
            title={title}
            onTitleChange={onTitleChange}
            body={body}
            onBodyChange={onBodyChange}
            error={error}
          />
        )}
        {step === 'success' && <SuccessBody triggered={noteSaved} mode="add" />}
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
  error: string
}

function FormBody({ title, onTitleChange, body, onBodyChange, error }: FormBodyProps) {
  const t = useIntl()
  const bodyCharsLeft = NOTE_BODY_MAX - body.length
  const counterWarn = bodyCharsLeft <= NOTE_BODY_MAX * 0.05

  return (
    <div className="pm-shell">
      <header className="pm-hero">
        <span className="pm-hero__eyebrow">
          {t.formatMessage({ id: 'providers.modal_v2.note_eyebrow_add' })}
        </span>
        <h1 className="pm-hero__title">
          {t.formatMessage(
            { id: 'providers.modal_v2.note_title_add' },
            { em: (chunks) => <em key="em">{chunks}</em> },
          )}
        </h1>
        <p className="pm-hero__subtitle">
          {t.formatMessage({ id: 'providers.modal_v2.note_subtitle_add' })}
        </p>
      </header>

      {error && <div className="pm-error" role="alert">{error}</div>}

      <div className="pv-fields">
        <NoteTitleField value={title} onChange={onTitleChange} />
        <NoteBodyField
          value={body}
          onChange={onBodyChange}
          counterWarn={counterWarn}
          charsLeft={bodyCharsLeft}
        />
      </div>
    </div>
  )
}

interface SuccessBodyProps {
  triggered: boolean
  mode: 'add' | 'edit' | 'delete'
}

function SuccessBody({ triggered, mode }: SuccessBodyProps) {
  const t = useIntl()
  const stampKey =
    mode === 'add'
      ? 'providers.modal_v2.note_stamp_added'
      : mode === 'edit'
        ? 'providers.modal_v2.note_stamp_updated'
        : 'providers.modal_v2.note_stamp_deleted'
  const titleKey =
    mode === 'add'
      ? 'providers.modal_v2.note_success_added_title'
      : mode === 'edit'
        ? 'providers.modal_v2.note_success_updated_title'
        : 'providers.modal_v2.note_success_deleted_title'
  const subtitleKey =
    mode === 'add'
      ? 'providers.modal_v2.note_success_added_subtitle'
      : mode === 'edit'
        ? 'providers.modal_v2.note_success_updated_subtitle'
        : 'providers.modal_v2.note_success_deleted_subtitle'
  const isDanger = mode === 'delete'

  return (
    <div className="pv-seal" aria-hidden={!triggered}>
      {/* Add + edit play the canonical success tick; delete-success plays
          the trash Lottie so destructive confirmations get their own
          motion language without borrowing the celebratory tick. */}
      <div style={{ width: 144, height: 144 }}>
        {triggered && (
          <LottiePlayer
            src={isDanger ? '/animations/trash.json' : '/animations/success.json'}
            loop={false}
            autoplay={true}
            delay={300}
            style={{ width: 144, height: 144 }}
          />
        )}
      </div>
      <span className="pv-seal__stamp">{t.formatMessage({ id: stampKey })}</span>
      <h2
        className={
          isDanger
            ? 'pm-hero__title pm-hero__title--danger'
            : 'pm-hero__title'
        }
        style={{ textAlign: 'center' }}
      >
        {t.formatMessage(
          { id: titleKey },
          { em: (chunks) => <em>{chunks}</em> },
        )}
      </h2>
      <p
        className="pm-hero__subtitle"
        style={{ textAlign: 'center', margin: 0 }}
      >
        {t.formatMessage({ id: subtitleKey })}
      </p>
    </div>
  )
}

/* ==========================================================================
   Note field primitives — re-exported so EditProviderNoteModal uses them.
   ========================================================================== */

export interface NoteTitleFieldProps {
  value: string
  onChange: (v: string) => void
  /** When set, overrides the default DOM id so add + edit don't collide
   *  if both happen to mount briefly during a swipe transition. */
  inputId?: string
}

export function NoteTitleField({
  value,
  onChange,
  inputId = 'provider-note-title',
}: NoteTitleFieldProps) {
  const t = useIntl()
  return (
    <div className="pv-field">
      <div className="pv-field__head">
        <span className="pv-field__label">
          {t.formatMessage({ id: 'providers.modal_v2.note_field_title_label' })}
          <span className="pv-field__label-required">*</span>
        </span>
        <span className="pv-field__head-line" aria-hidden="true" />
        <span className="pv-field__caption">
          {t.formatMessage({ id: 'providers.modal_v2.field_required' })}
        </span>
      </div>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pv-field__input pv-field__input--name"
        placeholder={t.formatMessage({ id: 'providers.modal_v2.note_field_title_placeholder' })}
        autoComplete="off"
        maxLength={NOTE_TITLE_MAX}
      />
    </div>
  )
}

export interface NoteBodyFieldProps {
  value: string
  onChange: (v: string) => void
  counterWarn: boolean
  charsLeft: number
  inputId?: string
}

export function NoteBodyField({
  value,
  onChange,
  counterWarn,
  charsLeft,
  inputId = 'provider-note-body',
}: NoteBodyFieldProps) {
  const t = useIntl()
  return (
    <div className="pv-field">
      <div className="pv-field__head">
        <span className="pv-field__label">
          {t.formatMessage({ id: 'providers.modal_v2.note_field_body_label' })}
          <span className="pv-field__label-required">*</span>
        </span>
        <span className="pv-field__head-line" aria-hidden="true" />
        <span className="pv-field__caption">
          {t.formatMessage({ id: 'providers.modal_v2.field_required' })}
        </span>
      </div>
      <textarea
        id={inputId}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pv-field__input pv-field__input--prose"
        placeholder={t.formatMessage({ id: 'providers.modal_v2.note_field_body_placeholder' })}
        maxLength={NOTE_BODY_MAX}
      />
      <div
        className={
          counterWarn
            ? 'pv-note-counter pv-note-counter--warn'
            : 'pv-note-counter'
        }
        aria-live="polite"
      >
        {t.formatMessage(
          { id: 'providers.modal_v2.note_chars_left' },
          { count: charsLeft },
        )}
      </div>
    </div>
  )
}

// Re-export for the edit modal.
export { SuccessBody as ProviderNoteSuccessBody }
