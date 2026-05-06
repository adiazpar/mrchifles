import { useState, useCallback } from 'react'
import { IonPage, IonContent } from '@ionic/react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from '@/lib/next-navigation-shim'
import { Input, Spinner } from '@/components/ui'
import { AuthLayout } from '@/components/auth'
import { useAuth } from '@/contexts/auth-context'
import { useAuthGate } from '@/contexts/auth-gate-context'
import { APP_VERSION } from '@/lib/version'

// Defense against open-redirect via the `?redirect=` query param.
// `//attacker.tld/foo` is a protocol-relative URL — passing it to
// router.push lands the user on a phishing site after a successful
// login. Match `/<single-non-slash-non-backslash>...` so the value is
// always a same-origin path; anything else falls back to /home.
function safeRedirect(raw: string | null): string {
  if (!raw) return '/home'
  // Allow only paths that start with exactly one '/' followed by a
  // non-'/' non-'\\' character. This rejects '//host', '/\\host',
  // 'http://...', and the empty string.
  return /^\/[^/\\]/.test(raw) ? raw : '/home'
}

export function LoginPage() {
  // The original Next.js page wrapped this content in <Suspense> because
  // useSearchParams() in the App Router opts into client rendering and
  // requires a Suspense boundary. react-router's useLocation()-based
  // shim is fully synchronous — no suspense needed, fallback dropped.
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = safeRedirect(searchParams.get('redirect'))
  const { login } = useAuth()
  const { playEntry } = useAuthGate()
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')

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
        setError(t('connection_error'))
        setIsLoading(false)
      }
    },
    [email, password, redirect, login, playEntry, t]
  )

  // Originally usePageTransition().navigate('/register'); the
  // PageTransitionProvider isn't mounted at this stage of the migration
  // (lands with the business shell in Phase 10+). Direct router.push
  // achieves the same cross-route navigation without the optimistic
  // pendingHref bookkeeping, which only matters once nav components
  // exist to read it.
  const handleGoToRegister = useCallback(() => {
    router.push('/register')
  }, [router])

  return (
    <IonPage>
      <IonContent>
        <AuthLayout>
          <form onSubmit={handleSubmit} className="auth-main">
            <h1 className="auth-heading">{t('heading_login')}</h1>

            {error && (
              <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
                {error}
              </div>
            )}

            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email_placeholder')}
              autoComplete="email"
              autoFocus
              required
            />

            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('password_placeholder')}
              autoComplete="current-password"
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
                  <span className="sr-only">{t('logging_in')}</span>
                </>
              ) : (
                t('continue_button')
              )}
            </button>
          </form>

          <div className="auth-page-footer">
            <div className="auth-or-divider">{tCommon('or')}</div>
            <button
              type="button"
              onClick={handleGoToRegister}
              className="btn btn-secondary btn-lg w-full"
            >
              {t('register_button')}
            </button>
            <p className="auth-version">
              {t('version_label', { version: APP_VERSION })}
            </p>
          </div>
        </AuthLayout>
      </IonContent>
    </IonPage>
  )
}
