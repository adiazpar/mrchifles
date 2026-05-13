import { useEffect } from 'react'
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, useIonRouter,
} from '@ionic/react'
import { useIntl } from 'react-intl'
import { OTPInput } from '@/components/OTPInput'
import { useVerifyEmail } from '@/hooks/useVerifyEmail'
import './VerifyEmail.css'

/**
 * Email-verification entry surface. Reached from:
 *   - Register wizard's final step (T21) — same hook, embedded layout.
 *   - Login when the server returns EMAIL_NOT_VERIFIED (T24) — redirected here.
 *   - Direct navigation when the user closes the tab mid-flow.
 *
 * On a successful submit, we redirect to "/" (the hub) — the route guard in
 * AuthenticatedShell will resolve the new emailVerified=true session and
 * land the user on the right inner page.
 */
export function VerifyEmail() {
  const intl = useIntl()
  const router = useIonRouter()
  const { code, setCode, submit, resend, cooldown, error, submitting, email } = useVerifyEmail()

  // No signed-in user means we shouldn't be here. Bounce to login so the
  // OTP flow can resume from a sign-in attempt.
  useEffect(() => {
    if (!email) router.push('/login', 'root', 'replace')
  }, [email, router])

  if (!email) return null

  async function handleComplete(value: string) {
    const ok = await submit(value)
    if (ok) router.push('/', 'root', 'replace')
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'verify_email_title' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding verify-email">
        <div className="verify-email__inner">
          <p className="verify-email__instruction">
            {intl.formatMessage({ id: 'verify_email_instruction' }, { email })}
          </p>
          <OTPInput
            value={code}
            onChange={setCode}
            onComplete={handleComplete}
            disabled={submitting}
            error={!!error}
          />
          {error && (
            <p role="alert" className="verify-email__error">
              {intl.formatMessage({ id: error })}
            </p>
          )}
          <IonButton
            fill="clear"
            disabled={cooldown > 0 || submitting}
            onClick={resend}
            className="verify-email__resend"
          >
            {cooldown > 0
              ? intl.formatMessage({ id: 'verify_email_resend_cooldown' }, { seconds: cooldown })
              : intl.formatMessage({ id: 'verify_email_resend' })}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default VerifyEmail
