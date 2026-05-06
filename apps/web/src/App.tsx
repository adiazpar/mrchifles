import { IonApp, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route, Switch } from 'react-router-dom'
import { AuthProvider } from '@/contexts/auth-context'
import { AuthGateProvider } from '@/contexts/auth-gate-context'
import { AppIntlProvider } from '@/i18n/AppIntlProvider'
import { AccountPage } from '@/routes/AccountPage'
import { BusinessTabsLayout } from '@/routes/BusinessTabsLayout'
import { HubPage } from '@/routes/HubPage'
import { JoinPage } from '@/routes/JoinPage'
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
                {/* Account (drill-down off the Hub). Auth gating and
                    its feature providers live inside AccountPage. The
                    `/account` route is matched before `/` so the
                    exact-match Hub never swallows it. */}
                <Route exact path="/account">
                  <AccountPage />
                </Route>
                {/* Join (QR-code deep-link landing pad). Thin redirector
                    that forwards `?code=ABC` to `/?code=ABC` so the Hub's
                    JoinBusinessProvider can pick it up. Mounted before
                    `/` so the exact-match Hub never swallows it. */}
                <Route exact path="/join">
                  <JoinPage />
                </Route>
                {/* Hub home (post-login landing page). Auth gating and
                    its tree of feature providers live inside HubPage
                    rather than App.tsx so future per-route guards stay
                    co-located with the route they protect. */}
                <Route exact path="/">
                  <HubPage />
                </Route>
                {/* Business tabs shell (`/:businessId/*`). Catch-all that
                    must remain LAST in the Switch — `/:businessId`
                    matches anything, so any literal route declared after
                    it would be unreachable. The layout owns the
                    `IonTabs` + `IonRouterOutlet` and all per-business
                    data providers (BusinessProvider, OrdersProvider,
                    ProductsProvider, etc.). NOT `exact` because the
                    inner outlet matches sub-paths like `/<id>/home`. */}
                <Route path="/:businessId" component={BusinessTabsLayout} />
              </Switch>
            </AuthGateProvider>
          </AppIntlProvider>
        </AuthProvider>
      </IonReactRouter>
    </IonApp>
  )
}
