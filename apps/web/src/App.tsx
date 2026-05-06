import { IonApp, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route, Switch } from 'react-router-dom'
import { AuthProvider } from '@/contexts/auth-context'
import { AuthGateProvider } from '@/contexts/auth-gate-context'
import { AppIntlProvider } from '@/i18n/AppIntlProvider'
import { LoginPage } from '@/routes/LoginPage'
import { RegisterPage } from '@/routes/RegisterPage'

setupIonicReact({ mode: 'ios' })

// Provider ordering rules:
//   - IonReactRouter must wrap AuthProvider because AuthContext calls
//     useRouter() (via the next-navigation-shim that wraps useHistory).
//   - AppIntlProvider must be INSIDE AuthProvider because it reads
//     user.language via useAuth() to pick the active locale bundle.
//   - AppIntlProvider must be OUTSIDE AuthGateProvider and any consumer
//     of useIntl() so translations are available everywhere downstream.
//
// Routes and additional providers (business context, page transitions,
// drill-down stacks, etc.) land in later migration phases:
//   - Phase 5.2 (DONE): login/register pages mounted at /login and /register
//   - Phase 6.2 (DONE): codemod next-intl -> react-intl across consumers
//   - Phase 6.3 (DONE): AppIntlProvider with locale switching, useApiMessage adapter
//   - Phase 7-12: hub, account, business tabs, drill-downs
export function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <AuthProvider>
          <AppIntlProvider>
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
          </AppIntlProvider>
        </AuthProvider>
      </IonReactRouter>
    </IonApp>
  )
}
