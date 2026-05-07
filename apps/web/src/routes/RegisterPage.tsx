import { useIntl } from 'react-intl';
import { useState, useCallback } from 'react'
import { IonPage, IonContent, IonList, IonItem, IonInput, IonButton, IonSpinner } from '@ionic/react'
import { useRouter } from '@/lib/next-navigation-shim'
import { AuthLayout } from '@/components/auth'
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
        setError(intl.formatMessage({
          id: 'auth.passwords_dont_match'
        }))
        return
      }

      if (password.length < 8) {
        setError(intl.formatMessage({
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
        setError(intl.formatMessage({
          id: 'auth.connection_error'
        }))
        setIsLoading(false)
      }
    },
    [email, password, passwordConfirm, name, register, playEntry, intl]
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <h1 className="text-3xl font-bold text-text-primary mb-2 text-center">
              {intl.formatMessage({ id: 'auth.heading_register' })}
            </h1>

            {error && (
              <div className="p-3 bg-error-subtle text-error text-sm rounded-xl">
                {error}
              </div>
            )}

            <IonList lines="full" inset>
              <IonItem>
                <IonInput
                  type="text"
                  label={intl.formatMessage({ id: 'auth.name_placeholder' })}
                  labelPlacement="floating"
                  value={name}
                  onIonInput={(e) => setName(e.detail.value ?? '')}
                  autocomplete="name"
                  autofocus
                  required
                />
              </IonItem>
              <IonItem>
                <IonInput
                  type="email"
                  label={intl.formatMessage({ id: 'auth.email_placeholder' })}
                  labelPlacement="floating"
                  value={email}
                  onIonInput={(e) => setEmail(e.detail.value ?? '')}
                  autocomplete="email"
                  required
                />
              </IonItem>
              <IonItem>
                <IonInput
                  type="password"
                  label={intl.formatMessage({ id: 'auth.password_new_placeholder' })}
                  labelPlacement="floating"
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value ?? '')}
                  autocomplete="new-password"
                  required
                />
              </IonItem>
              <IonItem>
                <IonInput
                  type="password"
                  label={intl.formatMessage({ id: 'auth.password_confirm_placeholder' })}
                  labelPlacement="floating"
                  value={passwordConfirm}
                  onIonInput={(e) => setPasswordConfirm(e.detail.value ?? '')}
                  autocomplete="new-password"
                  required
                />
              </IonItem>
            </IonList>

            <IonButton expand="block" type="submit" disabled={isLoading}>
              {isLoading ? (
                <IonSpinner name="crescent" />
              ) : (
                intl.formatMessage({ id: 'auth.register_button' })
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
            <IonButton expand="block" fill="outline" type="button" onClick={handleGoToLogin}>
              {intl.formatMessage({ id: 'auth.login_button' })}
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
