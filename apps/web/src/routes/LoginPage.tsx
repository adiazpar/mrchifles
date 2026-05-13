import { useIntl } from 'react-intl'
import { useState, useCallback, useMemo } from 'react'
import { IonPage, IonContent, IonButton, IonSpinner, IonHeader, IonToolbar, IonTitle } from '@ionic/react'
import { BrandMark } from '@/components/auth/BrandMark'
import { useRouter, useSearchParams } from '@/lib/next-navigation-shim'
import { AuthLayout, AuthField } from '@/components/auth'
import { useAuth } from '@/contexts/auth-context'
import { useAuthGate } from '@/contexts/auth-gate-context'
import { APP_VERSION } from '@/lib/version'

// Defense against open-redirect via the `?redirect=` query param.
// `//attacker.tld/foo` is a protocol-relative URL — passing it to
// router.push lands the user on a phishing site after a successful
// login. Match `/<single-non-slash-non-backslash>...` so the value is
// always a same-origin path; anything else falls back to / (the Hub).
function safeRedirect(raw: string | null): string {
  if (!raw) return '/'
  return /^\/[^/\\]/.test(raw) ? raw : '/'
}

export function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = safeRedirect(searchParams.get('redirect'))
  const { login } = useAuth()
  const { playEntry } = useAuthGate()
  const intl = useIntl()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setIsLoading(true)

      try {
        const result = await login(email, password)

        if (!result.success) {
          setError(result.error ?? '')
          setIsLoading(false)
          return
        }

        // playEntry handles router.push + router.refresh internally and
        // resolves when the overlay has fully faded out. We intentionally
        // do NOT clear isLoading on success — the form is covered by the
        // overlay during the transition and unmounted afterward.
        await playEntry(redirect)
      } catch {
        setError(intl.formatMessage({ id: 'auth.connection_error' }))
        setIsLoading(false)
      }
    },
    [email, password, redirect, login, playEntry, intl]
  )

  const handleGoToRegister = useCallback(() => {
    router.push('/register')
  }, [router])

  // Title with italic accent on a single word. The emphasis term comes
  // from i18n so locales can pick a word that lands the same accent
  // (English: "back"; Spanish: "vuelta"). If the term isn't found in
  // the title (translator skipped or chose a different sentence), we
  // fall back to plain text — no italic, but no broken render either.
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

  const footer = (
    <>
      <div className="auth-divider">
        {intl.formatMessage({ id: 'common.or' })}
      </div>
      <p className="auth-link-row">
        {intl.formatMessage({ id: 'auth.no_account_prefix' })}
        <button type="button" onClick={handleGoToRegister}>
          {intl.formatMessage({ id: 'auth.create_account_link' })}
        </button>
      </p>
      <p className="auth-version">
        {intl.formatMessage(
          { id: 'auth.version_label' },
          { version: APP_VERSION }
        )}
      </p>
    </>
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
          <header className="auth-hero">
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
          >
            {error && <div className="auth-error">{error}</div>}

            <AuthField
              label={intl.formatMessage({ id: 'auth.email_label' })}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
              inputMode="email"
            />
            <AuthField
              label={intl.formatMessage({ id: 'auth.password_label' })}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <div className="auth-field-utility">
              <button type="button">
                {intl.formatMessage({ id: 'auth.forgot_password' })}
              </button>
            </div>

            <IonButton
              expand="block"
              type="submit"
              disabled={isLoading}
              className="mt-3"
            >
              {isLoading ? (
                <IonSpinner name="crescent" />
              ) : (
                intl.formatMessage({ id: 'auth.continue_button' })
              )}
            </IonButton>
          </form>
        </AuthLayout>
      </IonContent>
    </IonPage>
  )
}
