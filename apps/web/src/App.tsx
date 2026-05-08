import { IonApp } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route, Switch } from 'react-router-dom'

import { AuthGateOverlay } from '@/components/layout/auth-gate-overlay'
import { ErrorBoundary } from '@/components/layout/error-boundary'
import { HapticFeedbackProvider } from '@/components/layout/haptic-feedback-provider'
import { AuthGateProvider } from '@/contexts/auth-gate-context'
import { AuthProvider } from '@/contexts/auth-context'
import { AppIntlProvider } from '@/i18n/AppIntlProvider'
import { AuthenticatedShell } from '@/routes/AuthenticatedShell'
import { LoginPage } from '@/routes/LoginPage'
import { RegisterPage } from '@/routes/RegisterPage'

// Provider order:
//   - IonReactRouter wraps everything: AuthContext calls useRouter() (via the
//     next-navigation-shim) at module init.
//   - AppIntlProvider sits ABOVE AuthProvider because AuthProvider calls
//     useIntl()/useApiMessage() at render time. AppIntlProvider doesn't
//     depend on auth — it reads the locale from user-cache and listens for
//     LANGUAGE_CHANGE_EVENT.
//   - AuthGateOverlay is a sibling of the route surface (NOT a route) so it
//     survives route changes. Fixed-positioned at z-index --z-auth-gate.
//   - HapticFeedbackProvider mounts a single document-level click listener
//     that fires haptic() on any button-like target. Renders no DOM.
export function App() {
  return (
    <IonApp>
      <ErrorBoundary>
        <IonReactRouter>
          <AppIntlProvider>
            <AuthProvider>
              <AuthGateProvider>
                <HapticFeedbackProvider />
                <AuthGateOverlay />
                <Switch>
                  <Route exact path="/login">
                    <LoginPage />
                  </Route>
                  <Route exact path="/register">
                    <RegisterPage />
                  </Route>
                  <Route>
                    <AuthenticatedShell />
                  </Route>
                </Switch>
              </AuthGateProvider>
            </AuthProvider>
          </AppIntlProvider>
        </IonReactRouter>
      </ErrorBoundary>
    </IonApp>
  )
}
