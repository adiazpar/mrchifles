'use client'

import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Spinner, Modal, useMorphingModal, ConfirmationAnimation, DeleteConfirmationStep } from '@/components/ui'
import type { Provider } from '@/types'

// ============================================
// BUTTON COMPONENTS
// ============================================

interface SaveProviderButtonProps {
  onSubmit: () => Promise<boolean>
  isSaving: boolean
  disabled: boolean
}

function SaveProviderButton({ onSubmit, isSaving, disabled }: SaveProviderButtonProps) {
  const { goToStep } = useMorphingModal()
  const t = useTranslations('providers')

  const handleClick = () => {
    goToStep(2)
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
// PROPS INTERFACE
// ============================================

export interface ProviderModalProps {
  // Modal state
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  // Form state
  name: string
  onNameChange: (name: string) => void
  phone: string
  onPhoneChange: (phone: string) => void
  email: string
  onEmailChange: (email: string) => void
  notes: string
  onNotesChange: (notes: string) => void
  active: boolean
  onActiveChange: (active: boolean) => void

  // Editing state
  editingProvider: Provider | null

  // Operation states
  isSaving: boolean
  isDeleting: boolean
  error: string

  // Success states
  providerSaved: boolean
  providerDeleted: boolean

  // Handlers
  onSubmit: () => Promise<boolean>
  onDelete: () => Promise<boolean>

  // Permissions
  canDelete: boolean
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
  notes,
  onNotesChange,
  active,
  onActiveChange,
  editingProvider,
  isSaving,
  isDeleting,
  error,
  providerSaved,
  providerDeleted,
  onSubmit,
  onDelete,
  canDelete,
}: ProviderModalProps) {
  const t = useTranslations('providers')
  const tCommon = useTranslations('common')
  const isFormValid = name.trim().length > 0

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
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        {/* Name */}
        <Modal.Item>
          <label htmlFor="provider-name" className="label">{t('name_label')} <span className="text-error">*</span></label>
          <input
            id="provider-name"
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            className="input"
            placeholder={t('name_placeholder')}
            autoComplete="off"
          />
        </Modal.Item>

        {/* Phone */}
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

        {/* Email */}
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

        {/* Notes */}
        <Modal.Item>
          <label htmlFor="provider-notes" className="label">{t('notes_label')}</label>
          <textarea
            id="provider-notes"
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            className="input"
            rows={3}
            placeholder={t('notes_placeholder')}
          />
        </Modal.Item>

        {/* Active toggle */}
        <Modal.Item>
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="label mb-0">{t('active_label')}</span>
              <p className="text-xs text-text-tertiary mt-0.5">
                {t('active_description')}
              </p>
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
          {editingProvider && canDelete && (
            <Modal.GoToStepButton step={1} className="btn btn-secondary">
              <Trash2 className="w-5 h-5" />
            </Modal.GoToStepButton>
          )}
          <SaveProviderButton onSubmit={onSubmit} isSaving={isSaving} disabled={isSaving || !isFormValid} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Delete confirmation */}
      <DeleteConfirmationStep
        title={t('delete_title')}
        itemName={editingProvider?.name || ''}
        warningText={t('delete_warning')}
        cancelStep={0}
        onConfirm={onDelete}
        successStep={3}
        isDeleting={isDeleting}
      />

      {/* Step 2: Save success */}
      <Modal.Step title={editingProvider ? t('success_updated_title') : t('success_added_title')} hideBackButton>
        <Modal.Item>
          <ConfirmationAnimation
            type="success"
            triggered={providerSaved}
            title={editingProvider ? t('success_updated_heading') : t('success_added_heading')}
            subtitle={editingProvider ? t('success_updated_subtitle') : t('success_added_subtitle')}
          />
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary flex-1"
          >
            {tCommon('done')}
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: Delete success */}
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
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary flex-1"
          >
            {tCommon('done')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
