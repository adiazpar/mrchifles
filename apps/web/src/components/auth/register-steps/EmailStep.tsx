import { useCallback, useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { IonButton } from '@ionic/react'
import { useRouter } from '@/lib/next-navigation-shim'
import { AuthLayout } from '../AuthLayout'
import { AuthField } from '../AuthField'
import { APP_VERSION } from '@/lib/version'
import { useRegisterNav } from './RegisterNavContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmailStep() {
  const intl = useIntl()
  const router = useRouter()
  const { name, email, setEmail, goTo } = useRegisterNav()

  const [error, setError] = useState<string | null>(null)

  const firstName = name.trim().split(/\s+/)[0] ?? ''
  const titleId = firstName
    ? 'auth.register_wizard.step_email_title'
    : 'auth.register_wizard.step_email_title_fallback'

  const valid = EMAIL_RE.test(email.trim())
  const canAdvance = valid

  // Clear inline error when the user edits the email.
  useEffect(() => {
    if (error) setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  // The legacy /api/auth/check-email pre-flight was removed when we
  // migrated to better-auth (no equivalent endpoint, and adding one
  // would leak account existence to anonymous callers). The PasswordStep
  // submits via authClient.signUp.email which rejects with USER_ALREADY_EXISTS
  // when the email is taken — the wizard handles that there. So this
  // step is purely a format-validation + advance.
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!canAdvance) return
      setError(null)
      goTo('password')
    },
    [canAdvance, goTo],
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
            {intl.formatMessage({ id: 'auth.register_wizard.continue' })}
          </IonButton>
        </div>
      </form>
    </AuthLayout>
  )
}
