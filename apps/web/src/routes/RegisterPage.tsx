import { useIntl } from 'react-intl'
import { useState, useCallback, useMemo } from 'react'
import { IonPage, IonContent, IonButton, IonSpinner } from '@ionic/react'
import { useRouter } from '@/lib/next-navigation-shim'
import { AuthLayout, AuthField, PasswordStrength } from '@/components/auth'
import { useAuth } from '@/contexts/auth-context'
import { useAuthGate } from '@/contexts/auth-gate-context'
import { APP_VERSION } from '@/lib/version'

export function RegisterPage() {
  const router = useRouter()
  const intl = useIntl()
  const { register } = useAuth()
  const { playEntry } = useAuthGate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (password !== passwordConfirm) {
        setError(intl.formatMessage({ id: 'auth.passwords_dont_match' }))
        return
      }

      if (password.length < 8) {
        setError(intl.formatMessage({ id: 'auth.password_too_short' }))
        return
      }

      setIsLoading(true)

      try {
        const result = await register(email, password, name)

        if (!result.success) {
          setError(result.error ?? '')
          setIsLoading(false)
          return
        }

        // Play entry animation; playEntry handles router navigation and
        // resolves when the overlay has fully faded out. Don't clear
        // isLoading on success — see login page for reasoning.
        await playEntry('/')
      } catch {
        setError(intl.formatMessage({ id: 'auth.connection_error' }))
        setIsLoading(false)
      }
    },
    [email, password, passwordConfirm, name, register, playEntry, intl]
  )

  const handleGoToLogin = useCallback(() => {
    router.push('/login')
  }, [router])

  // Italic accent on a single word in the title — same pattern as
  // LoginPage. Falls back to plain text when the locale's emphasis
  // term doesn't substring-match the title (e.g. Japanese).
  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'auth.heading_register' })
    const emphasis = intl.formatMessage({ id: 'auth.lets_get_started_emphasis' })
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
      <p className="auth-link-row">
        {intl.formatMessage({ id: 'auth.have_account_prefix' })}
        <button type="button" onClick={handleGoToLogin}>
          {intl.formatMessage({ id: 'auth.have_account_link' })}
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
      <IonContent>
        <AuthLayout footer={footer}>
          <header className="auth-hero">
            <div className="auth-hero__eyebrow">
              {intl.formatMessage({ id: 'auth.new_here_eyebrow' })}
            </div>
            <h1 className="auth-hero__title">{titleNode}</h1>
            <p className="auth-hero__subtitle">
              {intl.formatMessage({ id: 'auth.register_subtitle_short' })}
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2.5 w-full"
          >
            {error && <div className="auth-error">{error}</div>}

            <AuthField
              label={intl.formatMessage({ id: 'auth.name_label' })}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoFocus
              required
            />
            <AuthField
              label={intl.formatMessage({ id: 'auth.email_label' })}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              required
            />
            <AuthField
              label={intl.formatMessage({ id: 'auth.password_label' })}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              below={<PasswordStrength password={password} />}
            />
            <AuthField
              label={intl.formatMessage({ id: 'auth.password_confirm_label' })}
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />

            <IonButton
              expand="block"
              type="submit"
              disabled={isLoading}
              className="mt-3"
            >
              {isLoading ? (
                <IonSpinner name="crescent" />
              ) : (
                intl.formatMessage({ id: 'auth.register_button' })
              )}
            </IonButton>
          </form>
        </AuthLayout>
      </IonContent>
    </IonPage>
  )
}
