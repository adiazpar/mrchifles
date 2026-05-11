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
import { close, chevronBack } from 'ionicons/icons'
import {
  ProviderNameField,
  ProviderPhoneField,
  ProviderEmailField,
  ProviderStatusRow,
  ProviderSuccessBody,
} from './AddProviderModal'
import { ModalShell } from '@/components/ui'
import { getProviderInitials } from './ProviderListItem'
import { pickProviderMarkColor } from '@/lib/provider-mark'
import type { Provider } from '@kasero/shared/types'

type Step = 'form' | 'delete-confirm' | 'delete-success' | 'save-success'

function stepFromProp(initialStep: number): Step {
  return initialStep === 1 ? 'delete-confirm' : 'form'
}

export interface EditProviderModalProps {
  isOpen: boolean
  /** Step to open on. 0 = form (edit), 1 = delete-confirm (swipe-tray). */
  initialStep?: number
  onClose: () => void
  onExitComplete: () => void

  editingProvider: Provider | null

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
  providerSaved: boolean
  onSubmit: () => Promise<boolean>

  // Delete flow — only the modal itself decides whether to show the
  // delete affordance based on canDelete.
  canDelete: boolean
  isDeleting: boolean
  providerDeleted: boolean
  onDelete: () => Promise<boolean>
}

/**
 * Edit-provider flow — Modern Mercantile.
 *
 * Pattern 1, rawContent. Mirrors AddProviderModal's chrome contract but
 * adds two extra steps:
 *   - delete-confirm: oxblood hero + provider specimen card + danger pill
 *   - delete-success: oxblood seal + "Provider deleted" stamp
 *
 * The delete affordance is rendered as a quiet ghost link in the form's
 * footer (left of the primary Save pill) so deletion never reads as the
 * page's primary action — same demotion logic the team's MemberModal
 * applies to "Remove from team".
 *
 * When opened from a swipe-tray "Delete" action, initialStep=1 jumps
 * straight to delete-confirm and the back chevron is suppressed (the
 * confirm IS the entry point — there's no form to back to).
 */
export function EditProviderModal({
  isOpen,
  initialStep = 0,
  onClose,
  onExitComplete,
  editingProvider,
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
  canDelete,
  isDeleting,
  providerDeleted,
  onDelete,
}: EditProviderModalProps) {
  const t = useIntl()
  const [step, setStep] = useState<Step>(stepFromProp(initialStep))

  // Sync step when the modal opens at a different initialStep. The
  // parent uses initialStep=1 to drop the user straight into the delete
  // confirm surface from a swipe-tray action.
  useEffect(() => {
    if (isOpen) setStep(stepFromProp(initialStep))
  }, [isOpen, initialStep])

  // Delayed cleanup — runs ~250ms after dismiss animation completes so
  // the parent's handleModalExitComplete (clears editingProvider + form
  // state) doesn't unmount the modal mid animation.
  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(onExitComplete, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onExitComplete])

  // When opened directly via the swipe-tray delete affordance, back/cancel
  // dismiss the modal instead of returning to the form (mirrors the
  // ProviderModal v1 behavior — the form is not the entry point in that
  // flow, so backing out should leave entirely).
  const openedFromSwipe = initialStep === 1

  const isFormValid = name.trim().length > 0
  // Disable save until the user actually changes something.
  const hasChanges = editingProvider
    ? name.trim() !== (editingProvider.name ?? '').trim() ||
      phone.trim() !== (editingProvider.phone ?? '').trim() ||
      email.trim() !== (editingProvider.email ?? '').trim() ||
      active !== editingProvider.active
    : false

  // Optimistic save — jump to success immediately, fire API in background.
  const handleSave = () => {
    setStep('save-success')
    void onSubmit()
  }

  // Await the delete API — navigate on result so a failure shows the
  // error on the form (or stays on confirm if openedFromSwipe).
  const handleDelete = async () => {
    const ok = await onDelete()
    if (ok) {
      setStep('delete-success')
    } else if (!openedFromSwipe) {
      setStep('form')
    }
  }

  // Toolbar back button visibility per step.
  const onBack: (() => void) | undefined =
    step === 'delete-confirm' && !openedFromSwipe
      ? () => setStep('form')
      : undefined

  // Footer derived per step.
  let footer: React.ReactNode = null
  if (step === 'form') {
    footer = (
      <>
        {canDelete && (
          <button
            type="button"
            className="provider-modal__delete-link"
            onClick={() => setStep('delete-confirm')}
            disabled={isSaving}
          >
            {t.formatMessage({ id: 'providers.modal_v2.delete_link' })}
          </button>
        )}
        <button
          type="button"
          className="order-modal__primary-pill"
          onClick={handleSave}
          disabled={isSaving || !isFormValid || !hasChanges}
          data-haptic
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
          t.formatMessage({ id: 'providers.modal_v2.delete_confirm' })
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
        {step === 'form' && editingProvider && (
          <FormBody
            editingProvider={editingProvider}
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
        {step === 'delete-confirm' && editingProvider && (
          <DeleteConfirmBody provider={editingProvider} error={error} />
        )}
        {step === 'save-success' && (
          <ProviderSuccessBody triggered={providerSaved} mode="edit" />
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

interface FormBodyProps {
  editingProvider: Provider
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
 * Edit form body — same field ledger as Add, but the hero em-pivots on
 * the provider's actual name so the modal opens with their identity.
 */
function FormBody({
  editingProvider,
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
          {t.formatMessage({ id: 'providers.modal_v2.eyebrow_edit' })}
        </span>
        <h1 className="pm-hero__title">
          {t.formatMessage(
            { id: 'providers.modal_v2.title_edit' },
            {
              // User-entered content — interpolated verbatim.
              name: editingProvider.name,
              em: (chunks) => <em key="em">{chunks}</em>,
            },
          )}
        </h1>
        <p className="pm-hero__subtitle">
          {t.formatMessage({ id: 'providers.modal_v2.subtitle_edit' })}
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

interface DeleteConfirmBodyProps {
  provider: Provider
  error: string
}

/**
 * Oxblood-tinted hero + small specimen card showing exactly which
 * supplier the action targets. The hero subtitle explains the
 * order-detachment side effect (orders stay but become unlinked).
 */
function DeleteConfirmBody({ provider, error }: DeleteConfirmBodyProps) {
  const t = useIntl()

  return (
    <div className="pm-shell">
      <header className="pm-hero">
        <span className="pm-hero__eyebrow pm-hero__eyebrow--danger">
          {t.formatMessage({ id: 'providers.modal_v2.eyebrow_delete' })}
        </span>
        <h1 className="pm-hero__title pm-hero__title--danger">
          {t.formatMessage(
            { id: 'providers.modal_v2.title_delete' },
            {
              // User-entered content — interpolated verbatim.
              name: provider.name,
              em: (chunks) => <em key="em">{chunks}</em>,
            },
          )}
        </h1>
        <p className="pm-hero__subtitle">
          {t.formatMessage({ id: 'providers.modal_v2.subtitle_delete' })}
        </p>
      </header>

      {error && <div className="pm-error" role="alert">{error}</div>}

      {/* Specimen — initials avatar + name + status meta. Mirrors
          .tm-member__specimen but tinted with provider chrome. */}
      <div
        className="pv-specimen"
        data-active={provider.active ? 'true' : 'false'}
      >
        <span
          className="pv-mark pv-mark--md"
          data-active={provider.active}
          style={provider.active ? { background: pickProviderMarkColor(provider.id) } : undefined}
          aria-hidden="true"
        >
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
                <span className="pv-specimen__meta-sep" aria-hidden="true">·</span>
                <span>
                  {(provider.phone || provider.email || '').toUpperCase()}
                </span>
              </>
            )}
          </span>
        </span>
      </div>
    </div>
  )
}
