'use client'

import { useIntl } from 'react-intl';
import { useState, useCallback, useEffect } from 'react'
import { IonButton, IonInput, IonItem, IonList, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui/modal-shell'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useApiMessage } from '@/hooks/useApiMessage'
import { hasMessageEnvelope } from '@kasero/shared/api-messages'

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
  const t = useIntl()
  const tCommon = useIntl()
  const translateApiMessage = useApiMessage()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // Step state: 'form' → 'success'
  const [step, setStep] = useState<'form' | 'success'>('form')

  // Reset to form step after the dismissal animation plays so the form
  // doesn't flash back into view while the modal is still sliding away.
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStep('form')
        setCurrent('')
        setNext('')
        setConfirm('')
        setError('')
        setIsSaving(false)
        onExitComplete?.()
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onExitComplete])

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

  const handleSave = useCallback(async () => {
    if (!isValid || isSaving) return
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
            : tCommon.formatMessage({
            id: 'common.error'
          }),
        )
        return
      }
      setStep('success')
    } catch (err) {
      console.error('Change password error:', err)
      setError(tCommon.formatMessage({
        id: 'common.error'
      }))
    } finally {
      setIsSaving(false)
    }
  }, [isValid, isSaving, current, next, translateApiMessage, tCommon, onClose])

  // Client-side "passwords don't match" hint, shown only when both fields
  // are populated and differ. Distinct from the save-time error shown above.
  const confirmHint =
    confirm.length > 0 && next.length > 0 && next !== confirm
      ? t.formatMessage({ id: 'account.password_mismatch' })
      : undefined

  const saveButton = (
    <IonButton
      expand="block"
      onClick={handleSave}
      disabled={!isValid || isSaving}
      className="flex-1"
    >
      {isSaving ? <IonSpinner name="crescent" /> : tCommon.formatMessage({ id: 'common.save' })}
    </IonButton>
  )

  const doneButton = (
    <IonButton expand="block" onClick={onClose} className="flex-1">
      {tCommon.formatMessage({ id: 'common.done' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'form' ? t.formatMessage({ id: 'account.password_modal_title' }) : ''}
      footer={step === 'form' ? saveButton : doneButton}
      noSwipeDismiss
    >
      {step === 'form' && (
        <>
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mb-4">
              {error}
            </div>
          )}

          <IonList lines="full" inset>
            <IonItem>
              <IonInput
                type="password"
                label={t.formatMessage({ id: 'account.password_current_label' })}
                labelPlacement="floating"
                value={current}
                onIonInput={(e) => setCurrent(e.detail.value ?? '')}
                autocomplete="current-password"
                required
              />
            </IonItem>
            <IonItem>
              <IonInput
                type="password"
                label={t.formatMessage({ id: 'account.password_new_label' })}
                labelPlacement="floating"
                value={next}
                onIonInput={(e) => setNext(e.detail.value ?? '')}
                autocomplete="new-password"
                required
              />
            </IonItem>
            <IonItem>
              <IonInput
                type="password"
                label={t.formatMessage({ id: 'account.password_confirm_label' })}
                labelPlacement="floating"
                value={confirm}
                onIonInput={(e) => setConfirm(e.detail.value ?? '')}
                autocomplete="new-password"
                required
              />
            </IonItem>
          </IonList>
          <p className="text-xs text-text-tertiary mt-1 px-4">
            {t.formatMessage({ id: 'account.password_hint' })}
          </p>
          {confirmHint && (
            <p className="text-xs text-error mt-1 px-4">{confirmHint}</p>
          )}
        </>
      )}

      {step === 'success' && (
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
            {t.formatMessage({ id: 'account.password_saved_heading' })}
          </p>
          <p className="text-sm text-text-tertiary mt-1">
            {t.formatMessage({ id: 'account.password_saved_description' })}
          </p>
        </div>
      )}
    </ModalShell>
  )
}
