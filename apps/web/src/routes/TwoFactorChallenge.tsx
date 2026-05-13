import { useState, useCallback } from 'react'
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton,
  IonInput, IonItem, IonLabel, useIonRouter,
} from '@ionic/react'
import { useIntl } from 'react-intl'
import { OTPInput } from '@/components/OTPInput'
import type { MessageId } from '@/i18n/messageIds'
import { authClient } from '@/lib/auth-client'
import { useAuth } from '@/contexts/auth-context'
import './TwoFactorChallenge.css'

type Mode = 'totp' | 'backup'
type ErrorKey = Extract<MessageId, 'two_factor_error_invalid' | 'two_factor_error_locked'>

/**
 * Sign-in 2FA challenge page. Reached after authClient.signIn.email returned
 * TWO_FACTOR_REQUIRED. The user enters their authenticator's 6-digit code
 * OR a single-use backup code. On success, refreshUser() pulls the new
 * fully-elevated session and we land on /.
 */
export function TwoFactorChallenge() {
  const intl = useIntl()
  const router = useIonRouter()
  const { refreshUser } = useAuth()
  const [mode, setMode] = useState<Mode>('totp')
  const [code, setCode] = useState('')
  const [backup, setBackup] = useState('')
  const [error, setError] = useState<ErrorKey | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submitTotp = useCallback(async (value: string) => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await authClient.twoFactor.verifyTotp({ code: value })
      if (result.error) {
        setError(result.error.code === 'RATE_LIMITED' ? 'two_factor_error_locked' : 'two_factor_error_invalid')
        setCode('')
        setSubmitting(false)
        return
      }
      await refreshUser()
      router.push('/', 'root', 'replace')
    } catch {
      setError('two_factor_error_invalid')
      setCode('')
      setSubmitting(false)
    }
  }, [refreshUser, router])

  const submitBackup = useCallback(async () => {
    if (!backup || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await authClient.twoFactor.verifyBackupCode({ code: backup })
      if (result.error) {
        setError(result.error.code === 'RATE_LIMITED' ? 'two_factor_error_locked' : 'two_factor_error_invalid')
        setSubmitting(false)
        return
      }
      await refreshUser()
      router.push('/', 'root', 'replace')
    } catch {
      setError('two_factor_error_invalid')
      setSubmitting(false)
    }
  }, [backup, submitting, refreshUser, router])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'two_factor_challenge_title' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding two-factor-challenge">
        <div className="two-factor-challenge__inner">
          {mode === 'totp' ? (
            <>
              <p className="two-factor-challenge__instruction">
                {intl.formatMessage({ id: 'two_factor_challenge_instruction' })}
              </p>
              <OTPInput
                value={code}
                onChange={setCode}
                onComplete={submitTotp}
                disabled={submitting}
                error={!!error}
              />
              {error && (
                <p role="alert" className="two-factor-challenge__error">
                  {intl.formatMessage({ id: error })}
                </p>
              )}
              <IonButton fill="clear" onClick={() => { setMode('backup'); setError(null); setCode('') }}>
                {intl.formatMessage({ id: 'two_factor_challenge_use_backup' })}
              </IonButton>
            </>
          ) : (
            <>
              <IonItem>
                <IonLabel position="floating">{intl.formatMessage({ id: 'two_factor_challenge_backup_label' })}</IonLabel>
                <IonInput
                  value={backup}
                  onIonInput={(e) => setBackup(e.detail.value ?? '')}
                  autocomplete="one-time-code"
                />
              </IonItem>
              {error && (
                <p role="alert" className="two-factor-challenge__error">
                  {intl.formatMessage({ id: error })}
                </p>
              )}
              <IonButton expand="block" disabled={!backup || submitting} onClick={submitBackup}>
                {intl.formatMessage({ id: 'two_factor_challenge_verify' })}
              </IonButton>
              <IonButton fill="clear" onClick={() => { setMode('totp'); setError(null); setBackup('') }}>
                {intl.formatMessage({ id: 'two_factor_challenge_back' })}
              </IonButton>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default TwoFactorChallenge
