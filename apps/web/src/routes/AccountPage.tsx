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
 *   - The body component (`AccountPageContent`) renders no in-view
 *     header — the toolbar is the only chrome
 *
 * Provider tree mirrors HubPage. The body consumes:
 *   - `useAuth()` (provided at App.tsx)
 *   - `useAuthGate()` (provided at App.tsx) for the logout flow
 *     via `requestLogout('/')` (opens confirmation modal which then
 *     plays the exit choreography on confirm)
 *   - `useIncomingTransferContext()` for the inbound-transfer banner +
 *     modal — mounted locally here, matching HubPage's pattern.
 *   - `PageTransitionProvider` is mounted because the body and several
 *     descendants (notably modals that may navigate) call `useRouter()`
 *     via the next-navigation-shim. Mounting it here matches HubPage
 *     and avoids context-missing errors for any descendant.
 */
export function AccountPage() {
  const { user, isLoading: authLoading } = useAuth()
  const intl = useIntl()

  if (!authLoading && !user) {
    return <Redirect to="/" />
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref="/"
              text={intl.formatMessage({ id: 'common.back' })}
            />
          </IonButtons>
          <IonTitle>{intl.formatMessage({ id: 'navigation.account' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {!authLoading && (
          <PageTransitionProvider>
            <IncomingTransferProvider>
              <AccountPageContent />
            </IncomingTransferProvider>
          </PageTransitionProvider>
        )}
      </IonContent>
    </IonPage>
  )
}
