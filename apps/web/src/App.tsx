import { IonApp, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route, Switch } from 'react-router-dom'
import { NextIntlClientProvider } from 'next-intl'
import { AuthProvider } from '@/contexts/auth-context'
import { AuthGateProvider } from '@/contexts/auth-gate-context'
import enMessages from '@/i18n/messages/en-US.json'
import { DEFAULT_LOCALE } from '@/i18n/config'

setupIonicReact({ mode: 'ios' })

// NOTE: Routes and additional providers (i18n locale switching, business
// context, page transitions, drill-down stacks, etc.) land in later
// migration phases:
//   - Phase 5.2: login/register pages
//   - Phase 6:   IntlProvider with locale switching, codemod next-intl ->
//                react-intl, useApiMessage adapter
//   - Phase 7-12: hub, account, business tabs, drill-downs
//
// For Phase 5.1 we wire AuthProvider + AuthGateProvider so the next
// phase's login page can call useAuth() and useAuthGate(). The Ion
// router lives ABOVE the auth providers because AuthContext uses
// useRouter() internally (via the next-navigation-shim that wraps
// react-router's useHistory).
//
// next-intl is mounted as a temporary placeholder. The current intl
// surface in the ported code calls useTranslations() everywhere. Phase
// 6 codemods these calls to react-intl and the next-intl dep gets
// removed. Until then, NextIntlClientProvider with the en-US message
// bundle keeps the moved code from throwing at runtime.
export function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={enMessages}>
          <AuthProvider>
            <AuthGateProvider>
              <Switch>
                <Route exact path="/">
                  <IonPage>
                    <IonHeader>
                      <IonToolbar>
                        <IonTitle>Kasero</IonTitle>
                      </IonToolbar>
                    </IonHeader>
                    <IonContent>
                      <div className="p-4">
                        Auth providers wired. Awaiting login page (Phase 5.2).
                      </div>
                    </IonContent>
                  </IonPage>
                </Route>
              </Switch>
            </AuthGateProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </IonReactRouter>
    </IonApp>
  )
}
