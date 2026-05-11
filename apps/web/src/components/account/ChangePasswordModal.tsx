'use client'

import { useIntl } from 'react-intl'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { Check } from 'lucide-react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui/modal-shell'
import { AuthField, PasswordStrength } from '@/components/auth'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useApiMessage } from '@/hooks/useApiMessage'
import { hasMessageEnvelope } from '@kasero/shared/api-messages'

export interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete?: () => void
}

const PASSWORD_MIN = 8
const PASSWORD_REGEX_UPPER = /[A-Z]/
const PASSWORD_REGEX_DIGIT = /[0-9]/

export function ChangePasswordModal({
  isOpen,
  onClose,
  onExitComplete,
}: ChangePasswordModalProps) {
  const intl = useIntl()
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
            : intl.formatMessage({ id: 'common.error' }),
        )
        return
      }
      setStep('success')
    } catch (err) {
      console.error('Change password error:', err)
      setError(intl.formatMessage({ id: 'common.error' }))
    } finally {
      setIsSaving(false)
    }
  }, [isValid, isSaving, current, next, translateApiMessage, intl])

  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'account.password_hero_title' })
    const emphasis = intl.formatMessage({ id: 'account.password_hero_title_emphasis' })
    const idx = full.indexOf(emphasis)
    if (!emphasis || idx === -1) return full
    return (
      <>
        {full.slice(0, idx)}
        <em>{emphasis}</em>
        {full.slice(idx + emphasis.length)}
      </>
    )
  }, [intl])

  const successHeading = useMemo(() => {
    const full = intl.formatMessage({ id: 'account.password_saved_heading_v2' })
    const emphasis = intl.formatMessage({ id: 'account.password_saved_heading_v2_emphasis' })
    const idx = full.indexOf(emphasis)
    if (!emphasis || idx === -1) return full
    return (
      <>
        {full.slice(0, idx)}
        <em>{emphasis}</em>
        {full.slice(idx + emphasis.length)}
      </>
    )
  }, [intl])

  const showMismatch = confirm.length > 0 && next.length > 0 && next !== confirm

  const rules: Array<{ key: string; label: string; met: boolean }> = [
    {
      key: 'length',
      label: intl.formatMessage({ id: 'account.password_rule_length' }),
      met: hasMinLen,
    },
    {
      key: 'upper',
      label: intl.formatMessage({ id: 'account.password_rule_upper' }),
      met: hasUpper,
    },
    {
      key: 'digit',
      label: intl.formatMessage({ id: 'account.password_rule_digit' }),
      met: hasDigit,
    },
    {
      key: 'match',
      label: intl.formatMessage({ id: 'account.password_rule_match' }),
      met: passwordsMatch,
    },
  ]

  const saveButton = (
    <IonButton
      expand="block"
      onClick={handleSave}
      disabled={!isValid || isSaving}
      className="flex-1"
      data-haptic
    >
      {isSaving ? <IonSpinner name="crescent" /> : intl.formatMessage({ id: 'common.save' })}
    </IonButton>
  )

  const doneButton = (
    <IonButton expand="block" onClick={onClose} className="flex-1">
      {intl.formatMessage({ id: 'common.done' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'form' ? intl.formatMessage({ id: 'account.password_modal_title' }) : ''}
      footer={step === 'form' ? saveButton : doneButton}
      noSwipeDismiss
    >
      {step === 'form' && (
        <>
          {error && <div className="modal-error">{error}</div>}

          <header className="modal-hero change-password__hero">
            <div className="modal-hero__eyebrow">
              {intl.formatMessage({ id: 'account.password_hero_eyebrow' })}
            </div>
            <h1 className="modal-hero__title">{titleNode}</h1>
            <p className="modal-hero__subtitle">
              {intl.formatMessage({ id: 'account.password_hero_subtitle' })}
            </p>
          </header>

          <div className="change-password__form">
            <AuthField
              label={intl.formatMessage({ id: 'account.password_current_label' })}
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
            <AuthField
              label={intl.formatMessage({ id: 'account.password_new_label' })}
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
              below={<PasswordStrength password={next} />}
            />
            <AuthField
              label={intl.formatMessage({ id: 'account.password_confirm_label' })}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
            />
            {showMismatch && (
              <p className="change-password__mismatch">
                {intl.formatMessage({ id: 'account.password_mismatch' })}
              </p>
            )}
          </div>

          <div className="change-password__rules">
            <div className="change-password__rules-eyebrow">
              {intl.formatMessage({ id: 'account.password_rules_eyebrow' })}
            </div>
            <ul className="change-password__rule-list">
              {rules.map((rule) => (
                <li
                  key={rule.key}
                  className={`change-password__rule${rule.met ? ' is-met' : ''}`}
                >
                  <span className="change-password__rule-marker" aria-hidden="true">
                    <Check />
                  </span>
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {step === 'success' && (
        <div className="change-password__success">
          <div style={{ width: 160, height: 160 }}>
            <LottiePlayer
              src="/animations/success.json"
              loop={false}
              autoplay={true}
              delay={300}
              style={{ width: 160, height: 160 }}
            />
          </div>
          <p className="change-password__success-heading">{successHeading}</p>
          <p className="change-password__success-desc">
            {intl.formatMessage({ id: 'account.password_saved_description' })}
          </p>
        </div>
      )}
    </ModalShell>
  )
}
