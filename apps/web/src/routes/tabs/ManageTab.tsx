import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useIntl } from 'react-intl'

import { ManageView } from '@/components/tab-shell/views/ManageView'

/**
 * Manage tab — business settings hub plus drill-down shortcuts to Team
 * and Providers, plus owner-only danger actions (transfer, delete).
 *
 * Mounted at `/<businessId>/manage` from BusinessTabsLayout's IonRouterOutlet.
 *
 * Phase 11.2: ports the legacy `ManageView` content into Ionic chrome.
 *
 * Pattern choice:
 *   - We REUSE `<ManageView />` verbatim. The view consumes
 *     BusinessContext, PageTransitionContext, PendingTransferContext,
 *     IncomingTransferContext (all mounted by BusinessTabsLayout) and
 *     renders its many edit/transfer/leave/delete modals as portals so
 *     they slot cleanly into `<IonContent>`.
 *   - We DO render `<IonHeader>` with the `navigation.manage` title to
 *     match the rest of the bottom-tab pages and give the "tap active
 *     tab to scroll-to-top" gesture a stable anchor.
 *   - ManageView has NO custom in-view header / action bar — it renders
 *     section headers (`<SettingsSectionHeader />`) inside its body, not
 *     a top-level page header. So no buttons need promoting to
 *     `<IonToolbar>`.
 *   - Drill-down navigation: ManageView calls
 *     `usePageTransition().navigate('/<businessId>/team')` and
 *     `.../providers`. Those routes already exist as Phase 10.1 stubs in
 *     this same `IonRouterOutlet`, so the navigation will animate as a
 *     native iOS-style push. Phases 12.1 and 12.2 will replace the stubs
 *     with real content; this tab needs no changes for that.
 */
export function ManageTab() {
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'navigation.manage' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ManageView />
      </IonContent>
    </IonPage>
  )
}
