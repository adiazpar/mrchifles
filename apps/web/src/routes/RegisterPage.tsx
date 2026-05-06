import { useIntl } from 'react-intl';
import { useState, useCallback } from 'react'
import { IonPage, IonContent } from '@ionic/react'
import { useRouter } from '@/lib/next-navigation-shim'
import { Input, Spinner } from '@/components/ui'
import { AuthLayout } from '@/components/auth'
import { useAuth } from '@/contexts/auth-context'
import { useAuthGate } from '@/contexts/auth-gate-context'
import { APP_VERSION } from '@/lib/version'

export function RegisterPage() {
  const router = useRouter()
  const t = useIntl()
  const tCommon = useIntl()
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
        setError(t.formatMessage({
          id: 'auth.passwords_dont_match'
        }))
        return
      }

      if (password.length < 8) {
        setError(t.formatMessage({
          id: 'auth.password_too_short'
        }))
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
        setError(t.formatMessage({
          id: 'auth.connection_error'
        }))
        setIsLoading(false)
      }
    },
    [email, password, passwordConfirm, name, register, playEntry, t]
  )

  // Originally usePageTransition().navigate('/login'). See LoginPage for
  // the rationale: PageTransitionProvider isn't mounted yet, so we go
  // straight through the router shim.
  const handleGoToLogin = useCallback(() => {
    router.push('/login')
  }, [router])

  return (
    <IonPage>
      <IonContent>
        <AuthLayout>
          <form onSubmit={handleSubmit} className="auth-main">
            <h1 className="auth-heading">{t.formatMessage({
              id: 'auth.heading_register'
            })}</h1>

            {error && (
              <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
                {error}
              </div>
            )}

            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.formatMessage({
                id: 'auth.name_placeholder'
              })}
              autoComplete="name"
              autoFocus
              required
            />

            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.formatMessage({
                id: 'auth.email_placeholder'
              })}
              autoComplete="email"
              required
            />

            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.formatMessage({
                id: 'auth.password_new_placeholder'
              })}
              autoComplete="new-password"
              required
            />

            <Input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder={t.formatMessage({
                id: 'auth.password_confirm_placeholder'
              })}
              autoComplete="new-password"
              required
            />

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner />
                  <span className="sr-only">{t.formatMessage({
                    id: 'auth.creating_account'
                  })}</span>
                </>
              ) : (
                t.formatMessage({
                  id: 'auth.register_button'
                })
              )}
            </button>
          </form>

          <div className="auth-page-footer">
            <div className="auth-or-divider">{tCommon.formatMessage({
              id: 'common.or'
            })}</div>
            <button
              type="button"
              onClick={handleGoToLogin}
              className="btn btn-secondary btn-lg w-full"
            >
              {t.formatMessage({
                id: 'auth.login_button'
              })}
            </button>
            <p className="auth-version">
              {t.formatMessage({
                id: 'auth.version_label'
              }, { version: APP_VERSION })}
            </p>
          </div>
        </AuthLayout>
      </IonContent>
    </IonPage>
  );
}
