import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useIntl } from 'react-intl'

import { SalesView } from '@/components/tab-shell/views/SalesView'

/**
 * Sales tab — point-of-sale surface (open/close session, cart, reports).
 *
 * Mounted at `/<businessId>/sales` from BusinessTabsLayout's IonRouterOutlet.
 * IonTabs preserves this page's scroll + state when other tabs are active,
 * which matters for an open POS session: tabbing to Products and back must
 * not reset the cart or scroll position inside ProductPicker.
 *
 * Phase 11.2: ports the legacy `SalesView` content into Ionic chrome.
 *
 * Pattern choice:
 *   - We REUSE `<SalesView />` verbatim. The view consumes
 *     BusinessContext + SalesContext + SalesSessionsContext (all mounted
 *     by BusinessTabsLayout) and renders its own modals as portals to
 *     body, so it slots cleanly into `<IonContent>`.
 *   - We DO render `<IonHeader>` with the `navigation.sales` title to
 *     match the rest of the bottom-tab pages and give the "tap active
 *     tab to scroll-to-top" gesture a stable anchor.
 *   - SalesView has NO custom in-view header / action bar, so no
 *     buttons need promoting to `<IonToolbar>`.
 *
 * Note on scroll: the no-session branch of SalesView wraps content in its
 * own `overflow-y-auto` container so the SalesStatsCard slides off as the
 * user explores reports. This is intentional inner scroll — it sits
 * inside IonContent's outer scroll container but only the inner one ever
 * has overflowing content because SalesView's `<main className="page-content">`
 * is a fixed-height flex column. No double-scroll behavior in practice.
 */
export function SalesTab() {
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'navigation.sales' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <SalesView />
      </IonContent>
    </IonPage>
  )
}
