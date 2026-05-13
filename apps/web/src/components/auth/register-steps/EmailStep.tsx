import { useCallback, useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { IonButton, IonSpinner } from '@ionic/react'
import { useRouter } from '@/lib/next-navigation-shim'
import { useApiMessage } from '@/hooks/useApiMessage'
import { AuthLayout } from '../AuthLayout'
import { AuthField } from '../AuthField'
import { APP_VERSION } from '@/lib/version'
import { apiPost, ApiError } from '@/lib/api-client'
import { useRegisterNav } from './RegisterNavContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmailStep() {
  const intl = useIntl()
  const router = useRouter()
  const translateApiMessage = useApiMessage()
  const { name, email, setEmail, goTo } = useRegisterNav()

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const firstName = name.trim().split(/\s+/)[0] ?? ''
  const titleId = firstName
    ? 'auth.register_wizard.step_email_title'
    : 'auth.register_wizard.step_email_title_fallback'

  const valid = EMAIL_RE.test(email.trim())
  const canAdvance = valid && !submitting

  // Clear inline error when the user edits the email.
  useEffect(() => {
    if (error) setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!canAdvance) return
      setError(null)
      setSubmitting(true)
      try {
        await apiPost('/api/auth/check-email', { email: email.trim() })
        goTo('password')
      } catch (err) {
        if (err instanceof ApiError) {
          const code = err.messageCode
          if (code === 'AUTH_EMAIL_TAKEN') {
            setError(intl.formatMessage({ id: 'auth.register_wizard.error_email_taken_inline' }))
          } else if (err.envelope) {
            setError(translateApiMessage(err.envelope))
          } else {
            setError(intl.formatMessage({ id: 'auth.register_wizard.error_email_check_failed_inline' }))
          }
        } else {
          setError(intl.formatMessage({ id: 'auth.register_wizard.error_email_check_failed_inline' }))
        }
      } finally {
        setSubmitting(false)
      }
    },
    [canAdvance, email, goTo, intl, translateApiMessage],
  )

  const handleGoToLogin = useCallback(() => router.push('/login'), [router])

  const footer = (
    <>
      <div className="auth-divider">
        {intl.formatMessage({ id: 'common.or' })}
      </div>
      <p className="auth-link-row">
        {intl.formatMessage({ id: 'auth.have_account_prefix' })}
        <button type="button" onClick={handleGoToLogin}>
          {intl.formatMessage({ id: 'auth.have_account_link' })}
        </button>
      </p>
      <p className="auth-version">
        {intl.formatMessage({ id: 'auth.version_label' }, { version: APP_VERSION })}
      </p>
    </>
  )

  return (
    <AuthLayout footer={footer}>
      <form data-testid="register-email-form" onSubmit={handleSubmit} className="flex flex-col gap-2.5 w-full">
        <header className="auth-hero auth-step-item auth-step-item--head">
          <h1 className="auth-hero__title">
            {intl.formatMessage({ id: titleId }, { name: firstName })}
          </h1>
          <p className="auth-hero__subtitle">
            {intl.formatMessage({ id: 'auth.register_wizard.step_email_helper' })}
          </p>
        </header>

        <div className="auth-step-item auth-step-item--field">
          <AuthField
            label={intl.formatMessage({ id: 'auth.email_label' })}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            autoFocus
            required
            below={error ? <div className="auth-error" role="alert">{error}</div> : null}
          />
        </div>

        <div className="auth-step-item auth-step-item--footer">
          <IonButton
            expand="block"
            type="submit"
            disabled={!canAdvance}
            className="mt-3"
          >
            {submitting ? (
              <IonSpinner name="crescent" />
            ) : (
              intl.formatMessage({ id: 'auth.register_wizard.continue' })
            )}
          </IonButton>
        </div>
      </form>
    </AuthLayout>
  )
}
