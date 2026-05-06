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
//   - IonReactRouter must wrap everything because AuthContext calls
//     useRouter() (via the next-navigation-shim that wraps useHistory).
//   - AppIntlProvider must be ABOVE AuthProvider because AuthProvider
//     calls useIntl() and useApiMessage() at render time (for non-
//     envelope error fallbacks like `auth.connection_error`). If
//     AppIntlProvider sat below AuthProvider, those hook calls would
//     fire in a tree position with no IntlProvider ancestor and
//     IntlProvider would throw `Could not find required intl object`,
//     which React's error boundary unmounts the whole tree from —
//     producing a blank black page on fresh load.
//   - AppIntlProvider does NOT consume useAuth(). It reads the active
//     locale from `@/lib/user-cache` (same localStorage entry that
//     AuthProvider writes to via setCachedUser) and listens for the
//     LANGUAGE_CHANGE_EVENT custom event that auth-context dispatches
//     whenever user.language mutates. This decoupling is what lets it
//     sit above AuthProvider.
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
        <AppIntlProvider>
          <AuthProvider>
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
              {/* Use Route children syntax (NOT `component={...}`) so
                  IonRouterOutlet's stack-based animation can keep the
                  outgoing IonPage mounted during transitions. The
                  `component` prop unmounts and remounts on every render,
                  which Ionic's outlet treats as a fresh page (no
                  animation) and which can cause empty-outlet flashes
                  on first paint. */}
              <IonRouterOutlet>
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
                    must remain LAST in the outlet — `/:businessId`
                    matches anything else, so any literal route declared
                    after it would be unreachable. NOT `exact` because
                    the inner outlet matches sub-paths like `/<id>/home`.

                    The path-to-regexp constraint `[A-Za-z0-9_-]{9,}` is
                    REQUIRED. Without it, IonRouterOutlet's internal
                    matcher selects `/:businessId` over the more specific
                    `/login`, `/register`, etc. routes (Ionic's outlet is
                    not strict-Switch-first-match), which makes those
                    pages render BusinessTabsLayout's reserved-paths
                    bail-out (null) instead of LoginPage/etc. — producing
                    a blank screen at the auth boundary.

                    The constraint excludes reserved words by length:
                    real businessIds are 21-char nanoids (alphabet
                    [A-Za-z0-9_-]); the longest reserved word `register`
                    is 8 chars. Requiring 9+ matches every legit
                    businessId and rejects every named top-level route.
                    path-to-regexp v6 doesn't support inline lookaheads,
                    which is why we don't use a name-based exclusion. */}
                <Route path="/:businessId([A-Za-z0-9_-]{9,})">
                  <BusinessTabsLayout />
                </Route>
              </IonRouterOutlet>
            </AuthGateProvider>
          </AuthProvider>
        </AppIntlProvider>
      </IonReactRouter>
    </IonApp>
  )
}
