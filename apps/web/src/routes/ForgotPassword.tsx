import { useState, useCallback } from 'react'
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonSpinner, IonIcon, IonButtons,
} from '@ionic/react'
import { chevronBack } from 'ionicons/icons'
import { useIntl } from 'react-intl'
import { AuthLayout, AuthField } from '@/components/auth'
import { BrandMark } from '@/components/auth/BrandMark'
import { authClient } from '@/lib/auth-client'
import { useRouter } from '@/lib/next-navigation-shim'

/**
 * ForgotPassword form. Always shows the success message after submit
 * regardless of whether the email exists — better-auth on the server
 * silently no-ops for unknown emails, and we mirror that here to
 * prevent email enumeration. The reset link is only delivered to real
 * accounts; the UI feedback is identical either way.
 */
export function ForgotPassword() {
  const intl = useIntl()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || submitting) return
    setSubmitting(true)
    // We deliberately do NOT inspect the result here — success and
    // failure are reported the same way to the user. Errors are
    // swallowed so the message rendered to the user can't leak
    // "this email exists" / "this email doesn't exist".
    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      })
    } catch {
      // Intentionally swallowed.
    }
    setSubmitted(true)
    setSubmitting(false)
  }, [email, submitting])

  const handleBack = useCallback(() => {
    router.push('/login')
  }, [router])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={handleBack} aria-label="Back">
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>
            <BrandMark />
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <AuthLayout>
          <header className="auth-hero">
            <h1 className="auth-hero__title">
              {intl.formatMessage({ id: 'forgot_password_title' })}
            </h1>
            <p className="auth-hero__subtitle">
              {intl.formatMessage({ id: 'forgot_password_instruction' })}
            </p>
          </header>

          {submitted ? (
            <p className="auth-info" role="status">
              {intl.formatMessage({ id: 'forgot_password_success' })}
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-2.5 w-full"
            >
              <AuthField
                label={intl.formatMessage({ id: 'forgot_password_email_label' })}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
                inputMode="email"
              />
              <IonButton
                expand="block"
                type="submit"
                disabled={!email || submitting}
                className="mt-3"
              >
                {submitting ? (
                  <IonSpinner name="crescent" />
                ) : (
                  intl.formatMessage({ id: 'forgot_password_submit' })
                )}
              </IonButton>
            </form>
          )}
        </AuthLayout>
      </IonContent>
    </IonPage>
  )
}

export default ForgotPassword
