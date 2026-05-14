// TODO(B4): This step is being deleted as part of the wizard rewrite —
// the new 3-step flow (email -> OTP -> name) no longer collects a
// password. The body below has been stubbed to keep the build green
// after auth-context lost its `register` method; do not invest in
// fixing the dead code paths here.
import { useCallback, useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { IonButton, IonSpinner } from '@ionic/react'
import { useRouter } from '@/lib/next-navigation-shim'
import { AuthLayout } from '../AuthLayout'
import { AuthField } from '../AuthField'
import { PasswordStrength } from '../PasswordStrength'
import { APP_VERSION } from '@/lib/version'
import { useAuth } from '@/contexts/auth-context'
import { useRegisterNav } from './RegisterNavContext'

export function PasswordStep() {
  const intl = useIntl()
  const router = useRouter()
  // TODO(B4): useAuth() no longer exposes `register`. The hook call is
  // retained so this dead component still type-checks until B4 deletes
  // it; the form submit below is now a no-op stub.
  useAuth()
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
      // TODO(B4): the password-based register flow is gone. This handler
      // is a stub so the obsolete form keeps building; the wizard rewrite
      // replaces this entire step with the OTP path collected via
      // EntryPage + a NameStep.
      setError(intl.formatMessage({ id: 'auth.connection_error' }))
      setErrorCode(null)
      setSubmitting(false)
      // References preserved so the destructured wizard-context fields
      // stay live until B4 removes the file outright.
      void email
      void name
      void goTo
    },
    [canSubmit, email, name, goTo, intl],
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
            below={
              error ? (
                <div className="auth-error" role="alert">
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
              ) : (
                <PasswordStrength password={password} />
              )
            }
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
