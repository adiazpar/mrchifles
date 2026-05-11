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
import { CheckCircle2 } from 'lucide-react'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { ModalShell } from '@/components/ui'

type Step = 'form' | 'save-success'

export interface AddProviderModalProps {
  isOpen: boolean
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

  isSaving: boolean
  error: string

  /** Parent-driven flag toggled by the optimistic save handler. The
   *  success seal animation gates on this so the celebration plays the
   *  moment the API resolves rather than the moment the user taps Save. */
  providerSaved: boolean

  onSubmit: () => Promise<boolean>
}

/**
 * Add-provider flow — Modern Mercantile.
 *
 * Pattern 1 (single `step` state, conditional body inside one ModalShell)
 * and `rawContent` so we own the .pm-header / .pm-content / .pm-footer
 * chrome the team modals use. Mirrors InviteModal's chrome contract so
 * the page-to-modal transition feels seamless when entering from the
 * Providers roster.
 *
 * DESIGN NOTE — wizard vs single form:
 * The four supplier fields (name, phone, email, active) are independent.
 * There's no gating: choosing one doesn't change what the next one looks
 * like. A wizard would mean four next-button taps for what is in essence
 * a single business card. The team's InviteModal is multi-step because
 * role selection GATES whether a partner-warning surface is shown before
 * the code is generated; that's not the case here. We keep this surface
 * single-form and use the team modal's typographic vocabulary
 * (.pm-hero, .pv-fields, .pv-status) to give it the same printed-stub
 * feel without the ceremony.
 */
export function AddProviderModal({
  isOpen,
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
  isSaving,
  error,
  providerSaved,
  onSubmit,
}: AddProviderModalProps) {
  const t = useIntl()
  const [step, setStep] = useState<Step>('form')

  // Reset to root surface every time the modal opens. The same modal is
  // reused across multiple add attempts, so without this it could open
  // on a stale success step from the previous attempt.
  useEffect(() => {
    if (isOpen) setStep('form')
  }, [isOpen])

  // Delayed cleanup — runs ~250ms after the modal animates closed so the
  // parent's onExitComplete (clears form state) doesn't fire mid-dismiss.
  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(onExitComplete, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onExitComplete])

  const isFormValid = name.trim().length > 0

  // Optimistic save: jump to success immediately, fire API in background.
  // The user dismisses the success step manually via the Done button.
  const handleSave = () => {
    setStep('save-success')
    void onSubmit()
  }

  // Footer derived per step. Form step: terracotta primary pill. Success:
  // same pill rendering "Done", which dismisses the modal.
  let footer: React.ReactNode
  if (step === 'form') {
    footer = (
      <button
        type="button"
        className="order-modal__primary-pill"
        onClick={handleSave}
        disabled={isSaving || !isFormValid}
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
            name={name}
            onNameChange={onNameChange}
            phone={phone}
            onPhoneChange={onPhoneChange}
            email={email}
            onEmailChange={onEmailChange}
            active={active}
            onActiveChange={onActiveChange}
            error={error}
          />
        )}
        {step === 'save-success' && (
          <SuccessBody triggered={providerSaved} mode="add" />
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

/* ==========================================================================
   Body components — kept inside this file because they're not reused
   elsewhere. Direct children of <Modal>/<ModalShell> are still observed
   correctly because we're rendering plain JSX inside IonContent, not
   <Modal.Step>/<Modal.Footer>. The compound modal's invisible-children
   restriction only applies to <Modal>, which we're not using here.
   ========================================================================== */

interface FormBodyProps {
  name: string
  onNameChange: (v: string) => void
  phone: string
  onPhoneChange: (v: string) => void
  email: string
  onEmailChange: (v: string) => void
  active: boolean
  onActiveChange: (v: boolean) => void
  error: string
}

/**
 * The composed form. Hero + identity field + reach section (phone +
 * email) + status row. The hero leans on the team-page vocabulary by
 * em-pivoting the italic word "supplier" so the modal title reads like
 * "Add a new <em>supplier</em>".
 */
function FormBody({
  name,
  onNameChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  active,
  onActiveChange,
  error,
}: FormBodyProps) {
  const t = useIntl()

  return (
    <div className="pm-shell">
      <header className="pm-hero">
        <span className="pm-hero__eyebrow">
          {t.formatMessage({ id: 'providers.modal_v2.eyebrow_add' })}
        </span>
        <h1 className="pm-hero__title">
          {t.formatMessage(
            { id: 'providers.modal_v2.title_add' },
            { em: (chunks) => <em>{chunks}</em> },
          )}
        </h1>
        <p className="pm-hero__subtitle">
          {t.formatMessage({ id: 'providers.modal_v2.subtitle_add' })}
        </p>
      </header>

      {error && <div className="pm-error" role="alert">{error}</div>}

      <div className="pv-fields">
        <ProviderNameField value={name} onChange={onNameChange} />
      </div>

      <span className="pv-section-label">
        {t.formatMessage({ id: 'providers.modal_v2.section_reach' })}
      </span>
      <div className="pv-fields">
        <ProviderPhoneField value={phone} onChange={onPhoneChange} />
        <ProviderEmailField value={email} onChange={onEmailChange} />
      </div>

      <span className="pv-section-label">
        {t.formatMessage({ id: 'providers.modal_v2.section_status' })}
      </span>
      <ProviderStatusRow active={active} onChange={onActiveChange} />
    </div>
  )
}

interface SuccessBodyProps {
  triggered: boolean
  mode: 'add' | 'edit' | 'delete'
}

/**
 * Terminal step — circular brand seal + mono "DONE" stamp + Fraunces
 * italic title. Uses the .pv-seal vocabulary (matches .tm-invite__seal)
 * so the celebration reads in the same voice as the team flow.
 */
function SuccessBody({ triggered, mode }: SuccessBodyProps) {
  const t = useIntl()

  // Heading text varies by mode but the seal animation is the same.
  const stampKey =
    mode === 'add'
      ? 'providers.modal_v2.success_added_stamp'
      : mode === 'edit'
        ? 'providers.modal_v2.success_updated_stamp'
        : 'providers.modal_v2.success_deleted_stamp'

  const titleKey =
    mode === 'add'
      ? 'providers.modal_v2.success_added_title'
      : mode === 'edit'
        ? 'providers.modal_v2.success_updated_title'
        : 'providers.modal_v2.success_deleted_title'

  const subtitleKey =
    mode === 'add'
      ? 'providers.modal_v2.success_added_subtitle'
      : mode === 'edit'
        ? 'providers.modal_v2.success_updated_subtitle'
        : 'providers.modal_v2.success_deleted_subtitle'

  const isDanger = mode === 'delete'

  return (
    <div className="pv-seal" aria-hidden={!triggered}>
      {/* Add + edit (save-success) play the canonical Lottie tick that
          every other success step in the app uses (see
          EditOrderSuccessStep / EditSuccessStep). Delete-success keeps
          the quiet oxblood ring + glyph — destructive actions are
          confirmed, not celebrated. */}
      {isDanger ? (
        <span className="pv-seal__circle pv-seal__circle--danger">
          <CheckCircle2 size={44} strokeWidth={1.4} />
        </span>
      ) : (
        <div style={{ width: 144, height: 144 }}>
          {triggered && (
            <LottiePlayer
              src="/animations/success.json"
              loop={false}
              autoplay={true}
              delay={300}
              style={{ width: 144, height: 144 }}
            />
          )}
        </div>
      )}

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
   Field primitives — re-exported so EditProviderModal can use them too.
   ========================================================================== */

export interface ProviderNameFieldProps {
  value: string
  onChange: (v: string) => void
}

export function ProviderNameField({ value, onChange }: ProviderNameFieldProps) {
  const t = useIntl()
  return (
    <div className="pv-field">
      <div className="pv-field__head">
        <span className="pv-field__label">
          {t.formatMessage({ id: 'providers.modal_v2.field_name_label' })}
          <span className="pv-field__label-required">*</span>
        </span>
        <span className="pv-field__head-line" aria-hidden="true" />
        <span className="pv-field__caption">
          {t.formatMessage({ id: 'providers.modal_v2.field_required' })}
        </span>
      </div>
      <input
        id="provider-name"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pv-field__input pv-field__input--name"
        placeholder={t.formatMessage({ id: 'providers.modal_v2.field_name_placeholder' })}
        autoComplete="off"
        maxLength={80}
      />
    </div>
  )
}

export interface ProviderPhoneFieldProps {
  value: string
  onChange: (v: string) => void
}

export function ProviderPhoneField({ value, onChange }: ProviderPhoneFieldProps) {
  const t = useIntl()
  return (
    <div className="pv-field">
      <div className="pv-field__head">
        <span className="pv-field__label">
          {t.formatMessage({ id: 'providers.modal_v2.field_phone_label' })}
        </span>
        <span className="pv-field__head-line" aria-hidden="true" />
        <span className="pv-field__caption">
          {t.formatMessage({ id: 'providers.modal_v2.field_optional' })}
        </span>
      </div>
      <input
        id="provider-phone"
        type="tel"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pv-field__input pv-field__input--phone"
        placeholder={t.formatMessage({ id: 'providers.modal_v2.field_phone_placeholder' })}
        autoComplete="off"
        inputMode="tel"
      />
    </div>
  )
}

export interface ProviderEmailFieldProps {
  value: string
  onChange: (v: string) => void
}

export function ProviderEmailField({ value, onChange }: ProviderEmailFieldProps) {
  const t = useIntl()
  return (
    <div className="pv-field">
      <div className="pv-field__head">
        <span className="pv-field__label">
          {t.formatMessage({ id: 'providers.modal_v2.field_email_label' })}
        </span>
        <span className="pv-field__head-line" aria-hidden="true" />
        <span className="pv-field__caption">
          {t.formatMessage({ id: 'providers.modal_v2.field_optional' })}
        </span>
      </div>
      <input
        id="provider-email"
        type="email"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pv-field__input pv-field__input--email"
        placeholder={t.formatMessage({ id: 'providers.modal_v2.field_email_placeholder' })}
        autoComplete="off"
        inputMode="email"
      />
    </div>
  )
}

export interface ProviderStatusRowProps {
  active: boolean
  onChange: (v: boolean) => void
}

/**
 * Replaces the old generic <input type="checkbox" class="toggle"> row
 * with a tappable card that mirrors .tm-member__action's chassis.
 * Whole card is the hit target. The right-edge pill flips between
 * "ACTIVE" (terracotta) and "PAUSED" (paper warm) and the leading dot
 * mirrors the same state.
 */
export function ProviderStatusRow({ active, onChange }: ProviderStatusRowProps) {
  const t = useIntl()
  return (
    <button
      type="button"
      className="pv-status"
      data-active={active ? 'true' : 'false'}
      role="switch"
      aria-checked={active}
      onClick={() => onChange(!active)}
    >
      <span className="pv-status__dot" aria-hidden="true" />
      <span className="pv-status__body">
        <span className="pv-status__label">
          {t.formatMessage({ id: 'providers.modal_v2.status_label' })}
        </span>
        <span className="pv-status__value">
          {t.formatMessage({
            id: active
              ? 'providers.modal_v2.status_value_active'
              : 'providers.modal_v2.status_value_paused',
          })}
        </span>
      </span>
      <span className="pv-status__pill">
        {t.formatMessage({
          id: active
            ? 'providers.modal_v2.status_pill_active'
            : 'providers.modal_v2.status_pill_paused',
        })}
      </span>
    </button>
  )
}

// Re-export SuccessBody so EditProviderModal can render the same surface.
export { SuccessBody as ProviderSuccessBody }
