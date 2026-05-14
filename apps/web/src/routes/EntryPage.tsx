import { useIntl } from 'react-intl'
import { useCallback, useMemo, useState } from 'react'
import {
  IonPage,
  IonContent,
  IonButton,
  IonSpinner,
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/react'
import { BrandMark } from '@/components/auth/BrandMark'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { AuthLayout, AuthField } from '@/components/auth'
import { useRouter } from '@/lib/next-navigation-shim'
import { useAuth } from '@/contexts/auth-context'
import { APP_VERSION } from '@/lib/version'

// Match the validator used by the legacy register-wizard EmailStep so the
// pre-flight check on this screen and the wizard share the exact same
// acceptance semantics. Intentionally permissive — better-auth's server
// re-validates on the OTP send.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Unified passwordless entry. Single screen, two methods:
 *  - Continue with Google (handled by OAuthButtons; redirects away)
 *  - Continue with email — sends an OTP and forwards into the register
 *    wizard's verify step. The wizard handles new vs returning users
 *    based on whether the verified account has a name set.
 *
 * Replaces the old /login + /register split. Mounted at `/` by
 * HubPage's unauthenticated branch.
 */
export function EntryPage() {
  const intl = useIntl()
  const router = useRouter()
  const { sendOtp } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const trimmed = email.trim()
  const valid = EMAIL_RE.test(trimmed)
  const canSubmit = valid && !isLoading

  // Hero title with italic accent on a single word — mirrors the
  // pre-refactor LoginPage typography. The emphasis term comes from
  // i18n so locales can choose a word that lands the same accent.
  // Falls back to plain text when the term isn't found in the title.
  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'auth.heading_login' })
    const emphasis = intl.formatMessage({ id: 'auth.welcome_back_emphasis' })
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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!canSubmit) return
      setError(null)
      setIsLoading(true)
      const result = await sendOtp(trimmed)
      if (!result.success) {
        setError(
          result.error ??
            intl.formatMessage({ id: 'auth.connection_error' }),
        )
        setIsLoading(false)
        return
      }
      // Hand off to the register wizard at the verify step with the
      // email pre-set on the query string. B4 wires RegisterNavContext
      // to read these params; until then the wizard mounts at its
      // default first step (harmless — EntryPage is not yet routed).
      router.push(
        `/register?email=${encodeURIComponent(trimmed)}&step=verify`,
      )
    },
    [canSubmit, intl, router, sendOtp, trimmed],
  )

  // Clear inline error when the user resumes editing.
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (error) setError(null)
      setEmail(e.target.value)
    },
    [error],
  )

  const footer = (
    <p className="auth-version">
      {intl.formatMessage(
        { id: 'auth.version_label' },
        { version: APP_VERSION },
      )}
    </p>
  )

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
        <AuthLayout footer={footer}>
          <header className="auth-hero auth-step-item auth-step-item--head">
            <div className="auth-hero__eyebrow">
              {intl.formatMessage({ id: 'auth.sign_in_eyebrow' })}
            </div>
            <h1 className="auth-hero__title">{titleNode}</h1>
            <p className="auth-hero__subtitle">
              {intl.formatMessage({ id: 'auth.welcome_back_subtitle' })}
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2.5 w-full"
            data-testid="entry-form"
          >
            <div className="auth-step-item auth-step-item--field">
              <OAuthButtons callbackURL="/" disabled={isLoading} />
              <div className="oauth-divider">
                {intl.formatMessage({ id: 'oauth_or_divider' })}
              </div>

              <AuthField
                label={intl.formatMessage({ id: 'auth.email_label' })}
                type="email"
                value={email}
                onChange={handleEmailChange}
                autoComplete="email"
                inputMode="email"
                autoFocus
                required
                data-testid="entry-email-input"
                below={
                  error ? (
                    <div className="auth-error" role="alert">
                      {error}
                    </div>
                  ) : null
                }
              />
            </div>

            <div className="auth-step-item auth-step-item--footer">
              <IonButton
                expand="block"
                type="submit"
                disabled={!canSubmit}
                className="mt-3"
                data-testid="entry-email-submit"
              >
                {isLoading ? (
                  <IonSpinner name="crescent" />
                ) : (
                  intl.formatMessage({ id: 'auth.register_wizard.continue' })
                )}
              </IonButton>
            </div>
          </form>
        </AuthLayout>
      </IonContent>
    </IonPage>
  )
}
