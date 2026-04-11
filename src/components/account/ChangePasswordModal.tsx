'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Modal, Input, Spinner, useMorphingModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useApiMessage } from '@/hooks/useApiMessage'
import { hasMessageEnvelope } from '@/lib/api-messages'

export interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete?: () => void
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  onExitComplete,
}: ChangePasswordModalProps) {
  const t = useTranslations('account')
  const tCommon = useTranslations('common')
  const translateApiMessage = useApiMessage()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const PASSWORD_MIN = 8
  const PASSWORD_REGEX_UPPER = /[A-Z]/
  const PASSWORD_REGEX_DIGIT = /[0-9]/

  const hasMinLen = next.length >= PASSWORD_MIN
  const hasUpper = PASSWORD_REGEX_UPPER.test(next)
  const hasDigit = PASSWORD_REGEX_DIGIT.test(next)
  const passwordsMatch = next.length > 0 && next === confirm
  const notSameAsOld = current.length > 0 && next !== current
  const hasCurrent = current.length > 0
  const isValid = hasCurrent && hasMinLen && hasUpper && hasDigit && passwordsMatch && notSameAsOld

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!isValid || isSaving) return false
    setIsSaving(true)
    setError('')
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(
          hasMessageEnvelope(data)
            ? translateApiMessage(data)
            : tCommon('error'),
        )
        return false
      }
      return true
    } catch (err) {
      console.error('Change password error:', err)
      setError(tCommon('error'))
      return false
    } finally {
      setIsSaving(false)
    }
  }, [isValid, isSaving, current, next, translateApiMessage, tCommon])

  const handleExitComplete = useCallback(() => {
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
    setIsSaving(false)
    onExitComplete?.()
  }, [onExitComplete])

  // Client-side "passwords don't match" hint, shown only when both fields
  // are populated and differ. Distinct from the save-time error shown above.
  const confirmHint =
    confirm.length > 0 && next.length > 0 && next !== confirm
      ? t('password_mismatch')
      : undefined

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={handleExitComplete}
    >
      <Modal.Step title={t('password_modal_title')}>
        <Modal.Item>
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mb-4">
              {error}
            </div>
          )}

          <Input
            label={t('password_current_label')}
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={t('password_current_placeholder')}
            autoComplete="current-password"
            required
          />

          <div className="mt-4">
            <Input
              label={t('password_new_label')}
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder={t('password_new_placeholder')}
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-text-tertiary mt-1">
              {t('password_hint')}
            </p>
          </div>

          <div className="mt-4">
            <Input
              label={t('password_confirm_label')}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t('password_confirm_placeholder')}
              autoComplete="new-password"
              required
            />
            {confirmHint && (
              <p className="text-xs text-error mt-1">{confirmHint}</p>
            )}
          </div>
        </Modal.Item>
        <Modal.Footer>
          <SavePasswordButton
            isValid={isValid}
            isSaving={isSaving}
            onSave={handleSave}
          />
        </Modal.Footer>
      </Modal.Step>

      <Modal.Step title={t('password_saved_heading')} hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              <LottiePlayer
                src="/animations/success.json"
                loop={false}
                autoplay={true}
                delay={300}
                style={{ width: 160, height: 160 }}
              />
            </div>
            <p className="text-lg font-semibold text-text-primary mt-4">
              {t('password_saved_heading')}
            </p>
            <p className="text-sm text-text-tertiary mt-1">
              {t('password_saved_description')}
            </p>
          </div>
        </Modal.Item>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={onClose}
          >
            {tCommon('done')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}

// ============================================================================
// SAVE BUTTON
// ============================================================================

interface SavePasswordButtonProps {
  isValid: boolean
  isSaving: boolean
  onSave: () => Promise<boolean>
}

function SavePasswordButton({ isValid, isSaving, onSave }: SavePasswordButtonProps) {
  const tCommon = useTranslations('common')
  const { goToStep } = useMorphingModal()

  const handleClick = async () => {
    const ok = await onSave()
    if (ok) {
      goToStep(1)
    }
  }

  return (
    <button
      type="button"
      className="btn btn-primary flex-1"
      onClick={handleClick}
      disabled={!isValid || isSaving}
    >
      {isSaving ? <Spinner /> : tCommon('save')}
    </button>
  )
}
