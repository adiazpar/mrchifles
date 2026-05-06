import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useIntl } from 'react-intl'

import { ProductsView } from '@/components/tab-shell/views/ProductsView'

/**
 * Products tab — catalog list, search/sort/filter, AI add-product flow,
 * and the Orders sub-tab.
 *
 * Mounted at `/<businessId>/products` from BusinessTabsLayout's
 * IonRouterOutlet. IonTabs preserves this page's scroll + state so
 * tabbing away mid-search keeps the query and scroll position intact.
 *
 * Phase 11.2: ports the legacy `ProductsView` content into Ionic chrome.
 *
 * Pattern choice:
 *   - We REUSE `<ProductsView />` verbatim. The view consumes
 *     ProductsContext, OrdersContext, ProvidersContext,
 *     ProductSettingsContext, AuthContext, BusinessContext (all mounted
 *     by BusinessTabsLayout / App.tsx) and renders its modals as portals
 *     so it slots cleanly into `<IonContent>`.
 *   - We DO render `<IonHeader>` with the `navigation.products` title.
 *     ProductsView's body has its own internal sub-tabs (`section-tabs`
 *     for Products vs Orders) plus search inputs, sort sheets, and an
 *     "Add Product" button — none of those need promoting to
 *     `<IonToolbar>` because they're part of the per-sub-tab UI inside
 *     `<TabContainer>`, not a single page-wide header bar.
 *   - The Add/Edit/Settings modals + ProductInfoDrawer + OrderFlows
 *     modals live inside ProductsView's render and portal to body, so
 *     they render correctly above IonContent.
 *
 * Note on scroll: ProductsView wraps content in `<main className="page-content space-y-4">`.
 * The TabContainer has `fitActiveHeight + preserveScrollOnChange`, so the
 * inner scroll lives inside the lists themselves (filters at the top
 * stay sticky-ish via the layout, then list scrolls). IonContent
 * provides the outer scroll container. Tap-active-tab scroll-to-top
 * targets IonContent's scroll, which is the desired behavior.
 */
export function ProductsTab() {
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'navigation.products' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ProductsView />
      </IonContent>
    </IonPage>
  )
}
