import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useIntl } from 'react-intl'

import { HomeView } from '@/components/tab-shell/views/HomeView'

/**
 * Home tab — the per-business dashboard surface.
 *
 * Mounted at `/<businessId>/home` from BusinessTabsLayout's IonRouterOutlet.
 * IonTabs preserves this page's scroll + state when other tabs are active.
 *
 * Phase 11.1: ports the legacy `HomeView` content into Ionic chrome.
 *
 * Pattern choice:
 *   - We REUSE `<HomeView />` verbatim rather than inlining the markup.
 *     HomeView is a small self-contained view with no header of its own,
 *     so it slots cleanly into `<IonContent>`.
 *   - We DO render `<IonHeader>` with the `navigation.home` title. This
 *     mirrors how every other Ionic page in the migration sets its title
 *     and gives the bottom-tab "tap active tab to scroll-to-top" gesture
 *     a stable header to anchor against.
 *   - No UserMenu in this header.
 *     Account access lives on the user-scoped HubPage / AccountPage.
 *
 * The HomeView body is currently a "coming soon" stub (this matches the
 * legacy state — the home dashboard has always been a placeholder; the
 * tab exists in the IA but the dashboard widgets are not built yet).
 * When real dashboard content lands, it goes inside HomeView so the
 * Ionic chrome here stays untouched.
 */
export function HomeTab() {
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'navigation.home' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <HomeView />
      </IonContent>
    </IonPage>
  )
}
