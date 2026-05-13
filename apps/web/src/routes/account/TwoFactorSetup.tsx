import { useState, useCallback } from 'react'
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton,
  IonInput, IonItem, IonLabel, IonSpinner, IonButtons, IonIcon, useIonRouter,
} from '@ionic/react'
import { chevronBack } from 'ionicons/icons'
import { useIntl } from 'react-intl'
import QRCode from 'qrcode'
import { OTPInput } from '@/components/OTPInput'
import type { MessageId } from '@/i18n/messageIds'
import { authClient } from '@/lib/auth-client'
import './TwoFactorSetup.css'

type Stage = 'password' | 'qr' | 'confirm' | 'backup'
type ErrorKey = Extract<MessageId, 'verify_error_generic' | 'two_factor_error_invalid'>

/**
 * 4-stage TOTP enrollment:
 *   password  -> proves the user owns this account
 *   qr        -> shows the secret (QR + manual code)
 *   confirm   -> user enters a TOTP code to prove their authenticator is configured
 *   backup    -> save backup codes before we land back on /account/security
 *
 * QR is rendered as a PNG data URL via the `qrcode` library — never via
 * innerHTML and never via a third-party fetch.
 */
export function TwoFactorSetup() {
  const intl = useIntl()
  const router = useIonRouter()
  const [stage, setStage] = useState<Stage>('password')
  const [password, setPassword] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [error, setError] = useState<ErrorKey | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const startSetup = useCallback(async () => {
    if (!password || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const result = await authClient.twoFactor.enable({ password })
      if (result.error) {
        setError('verify_error_generic')
        setSubmitting(false)
        return
      }
      const data = result.data as
        | { totpURI?: string; backupCodes?: string[] }
        | null
      const uri = data?.totpURI
      if (!uri) {
        setError('verify_error_generic')
        setSubmitting(false)
        return
      }
      // Some better-auth versions return backupCodes from enable(); stash
      // them here so they survive the confirm step.
      if (Array.isArray(data?.backupCodes)) {
        setBackupCodes(data.backupCodes)
      }
      const dataUrl = await QRCode.toDataURL(uri, { width: 220, margin: 1 })
      setQrDataUrl(dataUrl)
      // Extract the secret from the URI in the form
      // otpauth://totp/Issuer:label?secret=...&issuer=Kasero
      const parsed = new URL(uri.replace(/^otpauth:/, 'http:'))
      setSecret(parsed.searchParams.get('secret') ?? '')
      setStage('qr')
      setSubmitting(false)
    } catch {
      setError('verify_error_generic')
      setSubmitting(false)
    }
  }, [password, submitting])

  const confirmCode = useCallback(async (value: string) => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await authClient.twoFactor.verifyTotp({ code: value })
      if (result.error) {
        setError('two_factor_error_invalid')
        setCode('')
        setSubmitting(false)
        return
      }
      // backupCodes may have been returned by enable() earlier; in some
      // versions they come back from verifyTotp on first confirm. Try
      // both shapes.
      const codes =
        (result.data as { backupCodes?: string[] } | null)?.backupCodes ?? []
      if (codes.length > 0) {
        setBackupCodes(codes)
      }
      setStage('backup')
      setSubmitting(false)
    } catch {
      setError('two_factor_error_invalid')
      setCode('')
      setSubmitting(false)
    }
  }, [])

  const finish = useCallback(() => {
    router.push('/account/security', 'back', 'replace')
  }, [router])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => router.push('/account/security', 'back', 'replace')} aria-label="Back">
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>{intl.formatMessage({ id: 'security_2fa_enable' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding two-factor-setup">
        <div className="two-factor-setup__inner">
          {stage === 'password' && (
            <>
              <p className="two-factor-setup__instruction">
                {intl.formatMessage({ id: 'security_2fa_password_prompt' })}
              </p>
              <IonItem>
                <IonLabel position="floating">{intl.formatMessage({ id: 'auth.password_label' })}</IonLabel>
                <IonInput
                  type="password"
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value ?? '')}
                  autocomplete="current-password"
                />
              </IonItem>
              {error && <p role="alert" className="two-factor-setup__error">{intl.formatMessage({ id: error })}</p>}
              <IonButton expand="block" disabled={!password || submitting} onClick={startSetup}>
                {submitting ? <IonSpinner name="crescent" /> : intl.formatMessage({ id: 'security_2fa_continue' })}
              </IonButton>
            </>
          )}

          {stage === 'qr' && qrDataUrl && (
            <>
              <p className="two-factor-setup__instruction">
                {intl.formatMessage({ id: 'security_2fa_setup_scan' })}
              </p>
              <img src={qrDataUrl} alt="" width={220} height={220} className="two-factor-setup__qr" />
              <p className="two-factor-setup__instruction">
                {intl.formatMessage({ id: 'security_2fa_setup_manual' })}
              </p>
              <code className="two-factor-setup__secret">{secret}</code>
              <IonButton expand="block" onClick={() => setStage('confirm')}>
                {intl.formatMessage({ id: 'security_2fa_next' })}
              </IonButton>
            </>
          )}

          {stage === 'confirm' && (
            <>
              <p className="two-factor-setup__instruction">
                {intl.formatMessage({ id: 'security_2fa_setup_confirm' })}
              </p>
              <OTPInput value={code} onChange={setCode} onComplete={confirmCode} disabled={submitting} error={!!error} />
              {error && <p role="alert" className="two-factor-setup__error">{intl.formatMessage({ id: error })}</p>}
            </>
          )}

          {stage === 'backup' && (
            <>
              <h3 className="two-factor-setup__heading">
                {intl.formatMessage({ id: 'security_2fa_backup_codes_title' })}
              </h3>
              <p className="two-factor-setup__instruction">
                {intl.formatMessage({ id: 'security_2fa_backup_codes_instruction' })}
              </p>
              <ul className="two-factor-setup__codes">
                {backupCodes.map((c) => (
                  <li key={c}><code>{c}</code></li>
                ))}
              </ul>
              <IonButton expand="block" onClick={finish}>
                {intl.formatMessage({ id: 'security_2fa_backup_codes_acknowledge' })}
              </IonButton>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default TwoFactorSetup
