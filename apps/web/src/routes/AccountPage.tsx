import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { Redirect } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { useAuth } from '@/contexts/auth-context'
import { IncomingTransferProvider } from '@/contexts/incoming-transfer-context'
import { PageTransitionProvider } from '@/contexts/page-transition-context'
import { AccountPageContent } from '@/components/account/AccountPage'

/**
 * Account page route (`/account`). Drill-down off the Hub home (`/`).
 *
 * Ionic chrome:
 *   - `IonHeader` + `IonToolbar` provide the top bar
 *   - `IonBackButton defaultHref="/"` handles both in-app history and
 *     deep-link entries (no history → falls back to the Hub)
 *   - The body component (`AccountPageContent`) was stripped of its
 *     legacy `DrillDownHeader` so the toolbar is the only chrome
 *
 * Provider tree mirrors HubPage. The body consumes:
 *   - `useAuth()` (provided at App.tsx)
 *   - `useAuthGate()` (provided at App.tsx) for the logout exit
 *     animation via `playExit('/login')`
 *   - `useIncomingTransferContext()` for the inbound-transfer banner +
 *     modal — mounted locally here, matching HubPage's pattern. Phase
 *     13.1 will dedupe by hoisting if appropriate.
 *   - `PageTransitionProvider` is mounted because the legacy body still
 *     calls `useRouter()` (next-navigation-shim). The shim itself does
 *     NOT need PageTransition, but several components reachable from
 *     here (e.g. modals that may navigate) historically did. Mounting
 *     it here matches HubPage and avoids surprise context-missing
 *     errors for any descendant that pulls it in.
 */
export function AccountPage() {
  const { user, isLoading: authLoading } = useAuth()
  const intl = useIntl()

  // Until auth resolves, render the chrome with an empty body. Avoids
  // a flash of unauthenticated redirect during initial /me probe.
  if (authLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/" />
            </IonButtons>
            <IonTitle>{intl.formatMessage({ id: 'navigation.account' })}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent />
      </IonPage>
    )
  }

  if (!user) {
    return <Redirect to="/login" />
  }

  return (
    <PageTransitionProvider>
      <IncomingTransferProvider>
        <IonPage>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonBackButton defaultHref="/" />
              </IonButtons>
              <IonTitle>{intl.formatMessage({ id: 'navigation.account' })}</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <AccountPageContent />
          </IonContent>
        </IonPage>
      </IncomingTransferProvider>
    </PageTransitionProvider>
  )
}
