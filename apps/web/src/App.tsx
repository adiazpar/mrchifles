import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/auth-context'
import { AuthGateProvider } from '@/contexts/auth-gate-context'
import { AuthGateOverlay } from '@/components/layout/auth-gate-overlay'
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
// Top-level routing uses `IonRouterOutlet` (not react-router's `Switch`)
// so navigation BETWEEN top-level pages (Hub <-> Account, Hub <-> Join,
// Login -> Hub, etc.) gets the same iOS-style slide / peel-back / parallax
// / scroll-lock that we already get inside `BusinessTabsLayout`. Each
// route's component renders an `<IonPage>` at its root; `IonRouterOutlet`
// resolves routes top-to-bottom (first match wins, like `Switch`) and
// auto-detects push vs pop direction from history changes.
//
// Nested `IonRouterOutlet` inside `BusinessTabsLayout` is fully supported
// by Ionic — that's the same mechanism `IonTabs` uses internally to
// manage per-tab navigation stacks. The two outlets coexist without
// collision: this top-level outlet handles `/login`, `/register`, `/`,
// `/account`, `/join`, and the catch-all `/:businessId/*`; the nested
// outlet inside `BusinessTabsLayout` handles the per-tab routes.
export function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <AuthProvider>
          <AppIntlProvider>
            <AuthGateProvider>
              {/* AuthGateOverlay is the brand-specific full-viewport
                  logo+fade choreography for auth-boundary transitions
                  (login/register -> hub, logout -> login). It must be
                  a descendant of AuthGateProvider so useAuthGate()
                  resolves, and a SIBLING of IonRouterOutlet so it
                  survives route changes (it's not a route). The
                  overlay positions itself with `position: fixed;
                  inset: 0` and sits at z-index --z-auth-gate (250),
                  above modals and below toasts. */}
              <AuthGateOverlay />
              <IonRouterOutlet>
                <Route exact path="/login" component={LoginPage} />
                <Route exact path="/register" component={RegisterPage} />
                {/* Account (drill-down off the Hub). Auth gating and
                    its feature providers live inside AccountPage. The
                    `/account` route is matched before `/` so the
                    exact-match Hub never swallows it. */}
                <Route exact path="/account" component={AccountPage} />
                {/* Join (QR-code deep-link landing pad). Thin redirector
                    that forwards `?code=ABC` to `/?code=ABC` so the Hub's
                    JoinBusinessProvider can pick it up. Mounted before
                    `/` so the exact-match Hub never swallows it. */}
                <Route exact path="/join" component={JoinPage} />
                {/* Hub home (post-login landing page). Auth gating and
                    its tree of feature providers live inside HubPage
                    rather than App.tsx so future per-route guards stay
                    co-located with the route they protect. */}
                <Route exact path="/" component={HubPage} />
                {/* Business tabs shell (`/:businessId/*`). Catch-all that
                    must remain LAST in the outlet — `/:businessId`
                    matches anything, so any literal route declared after
                    it would be unreachable. The layout owns its own
                    `IonTabs` + nested `IonRouterOutlet` and all
                    per-business data providers (BusinessProvider,
                    OrdersProvider, ProductsProvider, etc.). NOT `exact`
                    because the inner outlet matches sub-paths like
                    `/<id>/home`. */}
                <Route path="/:businessId" component={BusinessTabsLayout} />
              </IonRouterOutlet>
            </AuthGateProvider>
          </AppIntlProvider>
        </AuthProvider>
      </IonReactRouter>
    </IonApp>
  )
}
