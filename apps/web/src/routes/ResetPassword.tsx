import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonSpinner,
} from '@ionic/react'
import { useIntl } from 'react-intl'
import { AuthLayout, AuthField } from '@/components/auth'
import { BrandMark } from '@/components/auth/BrandMark'
import type { MessageId } from '@/i18n/messageIds'
import { authClient } from '@/lib/auth-client'
import { useRouter } from '@/lib/next-navigation-shim'

type ResetErrorKey = Extract<
  MessageId,
  'reset_password_invalid_token' | 'verify_error_generic'
>

/**
 * ResetPassword reads the single-use token from ?token=... in the URL
 * (emailed via the React Email template in T8). On submit, calls
 * authClient.resetPassword({ newPassword, token }) and navigates to /
 * on success — better-auth automatically signs the user in after a
 * successful reset.
 *
 * Failure modes surfaced to the user:
 *   - Missing or invalid token (link expired / already used): generic
 *     message keyed off `reset_password_invalid_token`.
 *   - Any other server error: generic `verify_error_generic`.
 */
export function ResetPassword() {
  const intl = useIntl()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ResetErrorKey | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Parse token at first render so the missing-token branch shows
  // immediately on bad links.
  const token = useMemo(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('token')
  }, [])

  useEffect(() => {
    if (!token) setError('reset_password_invalid_token')
  }, [token])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !password || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) {
        const code = result.error.code
        setError(
          code === 'INVALID_TOKEN' || code === 'EXPIRED_TOKEN'
            ? 'reset_password_invalid_token'
            : 'verify_error_generic',
        )
        setSubmitting(false)
        return
      }
      // better-auth's resetPassword does NOT sign the user in; the user
      // returns to /login. The success copy hints at that flow.
      router.push('/login', undefined)
    } catch {
      setError('verify_error_generic')
      setSubmitting(false)
    }
  }, [password, token, submitting, router])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <BrandMark />
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <AuthLayout>
          <header className="auth-hero">
            <h1 className="auth-hero__title">
              {intl.formatMessage({ id: 'reset_password_title' })}
            </h1>
          </header>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2.5 w-full"
          >
            {error && (
              <div className="auth-error" role="alert">
                {intl.formatMessage({ id: error })}
              </div>
            )}
            <AuthField
              label={intl.formatMessage({ id: 'reset_password_label' })}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              required
              disabled={!token}
            />
            <IonButton
              expand="block"
              type="submit"
              disabled={!token || !password || submitting}
              className="mt-3"
            >
              {submitting ? (
                <IonSpinner name="crescent" />
              ) : (
                intl.formatMessage({ id: 'reset_password_submit' })
              )}
            </IonButton>
          </form>
        </AuthLayout>
      </IonContent>
    </IonPage>
  )
}

export default ResetPassword
