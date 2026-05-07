import { useIntl } from 'react-intl';
import { useState, useCallback } from 'react'
import { IonPage, IonContent, IonList, IonItem, IonInput, IonButton, IonSpinner } from '@ionic/react'
import { useRouter, useSearchParams } from '@/lib/next-navigation-shim'
import { AuthLayout } from '@/components/auth'
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
  // Allow only paths that start with exactly one '/' followed by a
  // non-'/' non-'\\' character. This rejects '//host', '/\\host',
  // 'http://...', and the empty string.
  return /^\/[^/\\]/.test(raw) ? raw : '/';
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
        setError(intl.formatMessage({
          id: 'auth.connection_error'
        }))
        setIsLoading(false)
      }
    },
    [email, password, redirect, login, playEntry, intl]
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <h1 className="text-3xl font-bold text-text-primary mb-2 text-center">
              {intl.formatMessage({ id: 'auth.heading_login' })}
            </h1>

            {error && (
              <div className="p-3 bg-error-subtle text-error text-sm rounded-xl">
                {error}
              </div>
            )}

            <IonList lines="full" inset>
              <IonItem>
                <IonInput
                  type="email"
                  label={intl.formatMessage({ id: 'auth.email_placeholder' })}
                  labelPlacement="floating"
                  value={email}
                  onIonInput={(e) => setEmail(e.detail.value ?? '')}
                  autocomplete="email"
                  autofocus
                  required
                />
              </IonItem>
              <IonItem>
                <IonInput
                  type="password"
                  label={intl.formatMessage({ id: 'auth.password_placeholder' })}
                  labelPlacement="floating"
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value ?? '')}
                  autocomplete="current-password"
                  required
                />
              </IonItem>
            </IonList>

            <IonButton expand="block" type="submit" disabled={isLoading}>
              {isLoading ? (
                <IonSpinner name="crescent" />
              ) : (
                intl.formatMessage({ id: 'auth.continue_button' })
              )}
            </IonButton>
          </form>

          <div className="mt-6">
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-bg-base px-4 text-sm text-text-tertiary">
                  {intl.formatMessage({ id: 'common.or' })}
                </span>
              </div>
            </div>
            <IonButton expand="block" fill="outline" type="button" onClick={handleGoToRegister}>
              {intl.formatMessage({ id: 'auth.register_button' })}
            </IonButton>
            <p className="text-xs text-text-tertiary text-center mt-6">
              {intl.formatMessage({ id: 'auth.version_label' }, { version: APP_VERSION })}
            </p>
          </div>
        </AuthLayout>
      </IonContent>
    </IonPage>
  );
}
