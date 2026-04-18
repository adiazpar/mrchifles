'use client'

import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { Spinner, Modal, useMorphingModal, ConfirmationAnimation } from '@/components/ui'
import type { Provider } from '@/types'

// ============================================
// SAVE BUTTON
// ============================================

interface SaveProviderButtonProps {
  onSubmit: () => Promise<boolean>
  isSaving: boolean
  disabled: boolean
}

function SaveProviderButton({ onSubmit, isSaving, disabled }: SaveProviderButtonProps) {
  const { goToStep } = useMorphingModal()
  const t = useTranslations('providers')

  // Optimistic navigation: jump to the success step first, fire the API
  // in the background. If the save fails the parent will surface the
  // error in its own state and we rely on the user retrying.
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
      {isSaving ? <Spinner /> : t('save_button')}
    </button>
  )
}

// ============================================
// DELETE BUTTON
// ============================================

interface DeleteProviderButtonProps {
  onConfirm: () => Promise<boolean>
  isDeleting: boolean
}

function DeleteProviderButton({ onConfirm, isDeleting }: DeleteProviderButtonProps) {
  const tCommon = useTranslations('common')
  const { goToStep } = useMorphingModal()

  // Wait for the API response so a failure lands the user back on the
  // form step (with the error visible) instead of on the success screen.
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

export interface ProviderModalProps {
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

// ============================================
// COMPONENT
// ============================================

export function ProviderModal({
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
  const t = useTranslations('providers')
  const tCommon = useTranslations('common')
  const isFormValid = name.trim().length > 0
  const showDeleteAction = !!editingProvider && canDelete
  // In edit mode the Save button is disabled until the user changes
  // something; Add mode always has "changes" (the user is creating new).
  const hasChanges = editingProvider
    ? (
        name.trim() !== (editingProvider.name ?? '').trim() ||
        phone.trim() !== (editingProvider.phone ?? '').trim() ||
        email.trim() !== (editingProvider.email ?? '').trim() ||
        active !== editingProvider.active
      )
    : true

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title={editingProvider ? t('modal_title_edit') : t('modal_title_add')}
    >
      {/* Step 0: Form */}
      <Modal.Step title={editingProvider ? t('modal_title_edit') : t('modal_title_add')}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">{error}</div>
          </Modal.Item>
        )}

        <Modal.Item>
          <label htmlFor="provider-name" className="label">
            {t('name_label')} <span className="text-error">*</span>
          </label>
          <input
            id="provider-name"
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            className="input"
            placeholder={t('name_placeholder')}
            autoComplete="off"
            maxLength={80}
          />
        </Modal.Item>

        <Modal.Item>
          <label htmlFor="provider-phone" className="label">{t('phone_label')}</label>
          <input
            id="provider-phone"
            type="tel"
            value={phone}
            onChange={e => onPhoneChange(e.target.value)}
            className="input"
            placeholder="999 999 999"
          />
        </Modal.Item>

        <Modal.Item>
          <label htmlFor="provider-email" className="label">{t('email_label')}</label>
          <input
            id="provider-email"
            type="email"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            className="input"
            placeholder="email@example.com"
          />
        </Modal.Item>

        <Modal.Item>
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="label mb-0">{t('active_label')}</span>
              <p className="text-xs text-text-tertiary mt-0.5">{t('active_description')}</p>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={e => onActiveChange(e.target.checked)}
              className="toggle"
            />
          </div>
        </Modal.Item>

        <Modal.Footer>
          {showDeleteAction && (
            <Modal.GoToStepButton step={1} className="btn btn-secondary btn-icon">
              <Trash2 className="text-error" style={{ width: 16, height: 16 }} />
            </Modal.GoToStepButton>
          )}
          <SaveProviderButton
            onSubmit={onSubmit}
            isSaving={isSaving}
            disabled={isSaving || !isFormValid || !hasChanges}
          />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Delete confirmation */}
      <Modal.Step title={t('delete_provider_confirm_title')} backStep={0}>
        <Modal.Item>
          <p className="text-text-secondary">
            {t('delete_provider_confirm_body', { name: editingProvider?.name ?? '' })}
          </p>
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1" disabled={isDeleting}>
            {tCommon('cancel')}
          </Modal.GoToStepButton>
          <DeleteProviderButton onConfirm={onDelete} isDeleting={isDeleting} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Delete success */}
      <Modal.Step title={t('success_deleted_title')} hideBackButton>
        <Modal.Item>
          <ConfirmationAnimation
            type="error"
            triggered={providerDeleted}
            title={t('success_deleted_heading')}
            subtitle={t('success_deleted_subtitle')}
          />
        </Modal.Item>

        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('done')}
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: Save success */}
      <Modal.Step
        title={editingProvider ? t('success_updated_title') : t('success_added_title')}
        hideBackButton
      >
        <Modal.Item>
          <ConfirmationAnimation
            type="success"
            triggered={providerSaved}
            title={editingProvider ? t('success_updated_heading') : t('success_added_heading')}
            subtitle={editingProvider ? t('success_updated_subtitle') : t('success_added_subtitle')}
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
