import { useCallback, useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { IonButton, IonSpinner } from '@ionic/react'
import { useRouter } from '@/lib/next-navigation-shim'
import { AuthLayout } from '../AuthLayout'
import { AuthField } from '../AuthField'
import { PasswordStrength } from '../PasswordStrength'
import { APP_VERSION } from '@/lib/version'
import { useAuth } from '@/contexts/auth-context'
import { useAuthGate } from '@/contexts/auth-gate-context'
import { useRegisterNav } from './RegisterNavContext'

export function PasswordStep() {
  const intl = useIntl()
  const router = useRouter()
  const { register } = useAuth()
  const { playEntry } = useAuthGate()
  const { name, email, password, setPassword, goTo } = useRegisterNav()

  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const firstName = name.trim().split(/\s+/)[0] ?? ''
  const titleId = firstName
    ? 'auth.register_wizard.step_password_title'
    : 'auth.register_wizard.step_password_title_fallback'

  const canSubmit = password.length >= 8 && !submitting

  // Clear errors when the password is edited.
  useEffect(() => {
    if (error || errorCode) {
      setError(null)
      setErrorCode(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!canSubmit) return
      setError(null)
      setErrorCode(null)
      setSubmitting(true)
      try {
        const result = await register(email, password, name)
        if (result.success) {
          // Keep submitting=true; playEntry will navigate. Same pattern as LoginPage.
          await playEntry('/')
          return
        }
        if (result.messageCode === 'AUTH_EMAIL_TAKEN') {
          setError(intl.formatMessage({ id: 'auth.register_wizard.error_email_taken_race' }))
          setErrorCode('AUTH_EMAIL_TAKEN')
        } else {
          setError(result.error)
        }
        setSubmitting(false)
      } catch {
        setError(intl.formatMessage({ id: 'auth.connection_error' }))
        setSubmitting(false)
      }
    },
    [canSubmit, register, email, password, name, playEntry, intl],
  )

  const handleGoToLogin = useCallback(() => router.push('/login'), [router])

  const footer = (
    <>
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
    <AuthLayout footer={footer} onBack={() => goTo('email')}>
      <form
        data-testid="register-password-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-2.5 w-full"
      >
        <header className="auth-hero auth-step-item auth-step-item--head">
          <h1 className="auth-hero__title">
            {intl.formatMessage({ id: titleId }, { name: firstName })}
          </h1>
          <p className="auth-hero__subtitle">
            {intl.formatMessage({ id: 'auth.register_wizard.step_password_helper' })}
          </p>
        </header>

        {error ? (
          <div className="auth-step-item auth-error" role="alert">
            {error}
            {errorCode === 'AUTH_EMAIL_TAKEN' ? (
              <>
                {' '}
                <button type="button" onClick={() => goTo('email')}>
                  {intl.formatMessage({ id: 'auth.register_wizard.edit_email' })}
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="auth-step-item auth-step-item--field">
          <AuthField
            label={intl.formatMessage({ id: 'auth.password_label' })}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            required
            minLength={8}
            revealable
            below={<PasswordStrength password={password} />}
          />
        </div>

        <div className="auth-step-item auth-step-item--footer">
          <IonButton
            expand="block"
            type="submit"
            disabled={!canSubmit}
            className="mt-3"
          >
            {submitting ? (
              <IonSpinner name="crescent" />
            ) : (
              intl.formatMessage({ id: 'auth.register_wizard.create_account' })
            )}
          </IonButton>
        </div>
      </form>
    </AuthLayout>
  )
}
