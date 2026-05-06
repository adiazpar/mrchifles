import { IonApp, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route, Switch } from 'react-router-dom'
import { IntlProvider } from 'react-intl'
import { AuthProvider } from '@/contexts/auth-context'
import { AuthGateProvider } from '@/contexts/auth-gate-context'
import { LoginPage } from '@/routes/LoginPage'
import { RegisterPage } from '@/routes/RegisterPage'
import enMessages from '@/i18n/messages/en-US.json'
import { DEFAULT_LOCALE } from '@/i18n/config'

setupIonicReact({ mode: 'ios' })

// NOTE: Routes and additional providers (i18n locale switching, business
// context, page transitions, drill-down stacks, etc.) land in later
// migration phases:
//   - Phase 5.2 (DONE): login/register pages mounted at /login and /register
//   - Phase 6.2 (DONE): codemod next-intl -> react-intl across consumers
//   - Phase 6.3:  AppIntlProvider with locale switching, useApiMessage
//                 adapter, full removal of next-intl dependency
//   - Phase 7-12: hub, account, business tabs, drill-downs
//
// AuthProvider + AuthGateProvider are wired so login/register can call
// useAuth() and useAuthGate(). The Ion router lives ABOVE the auth
// providers because AuthContext uses useRouter() internally (via the
// next-navigation-shim that wraps react-router's useHistory).
//
// react-intl's IntlProvider is mounted with a hardcoded en-US bundle as
// a temporary shim. Phase 6.3 replaces this with an AppIntlProvider that
// reads the active locale from AuthContext and reactively swaps the
// message bundle. Until then, this keeps the codemodded
// `intl.formatMessage(...)` calls from throwing at runtime.
export function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IntlProvider locale={DEFAULT_LOCALE} defaultLocale={DEFAULT_LOCALE} messages={enMessages}>
          <AuthProvider>
            <AuthGateProvider>
              <Switch>
                <Route exact path="/login">
                  <LoginPage />
                </Route>
                <Route exact path="/register">
                  <RegisterPage />
                </Route>
                {/* Default placeholder route stays until Phase 7+ ports
                    the hub. Once that lands, this route is replaced by
                    HubPage and the auth pages become reachable from
                    auth redirects. */}
                <Route exact path="/">
                  <IonPage>
                    <IonHeader>
                      <IonToolbar>
                        <IonTitle>Kasero</IonTitle>
                      </IonToolbar>
                    </IonHeader>
                    <IonContent>
                      <div className="p-4">
                        Auth providers wired. Login/register at /login and /register (Phase 5.2).
                      </div>
                    </IonContent>
                  </IonPage>
                </Route>
              </Switch>
            </AuthGateProvider>
          </AuthProvider>
        </IntlProvider>
      </IonReactRouter>
    </IonApp>
  )
}
