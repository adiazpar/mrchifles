import { useParams, Route, Redirect } from 'react-router-dom'
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonRouterOutlet,
  IonLabel,
  IonIcon,
} from '@ionic/react'
import {
  homeOutline,
  cartOutline,
  pricetagsOutline,
  settingsOutline,
} from 'ionicons/icons'
import { useIntl } from 'react-intl'

import { ContentGuard } from '@/components/auth'
import { PageTransitionProvider } from '@/contexts/page-transition-context'
import { IncomingTransferProvider } from '@/contexts/incoming-transfer-context'
import { BusinessProvider } from '@/contexts/business-context'
import { PendingTransferProvider } from '@/contexts/pending-transfer-context'
import { OrdersProvider } from '@/contexts/orders-context'
import { SalesSessionsProvider } from '@/contexts/sales-sessions-context'
import { SalesProvider } from '@/contexts/sales-context'
import { ProvidersProvider } from '@/contexts/providers-context'
import { ProductsProvider } from '@/contexts/products-context'
import { ProductSettingsProvider } from '@/contexts/product-settings-context'
import { BusinessDataPreloader } from '@/components/layout/BusinessDataPreloader'

import { HomeTab } from './tabs/HomeTab'
import { SalesTab } from './tabs/SalesTab'
import { ProductsTab } from './tabs/ProductsTab'
import { ProvidersTab } from './tabs/ProvidersTab'
import { TeamTab } from './tabs/TeamTab'
import { ManageTab } from './tabs/ManageTab'
import { ProviderDetailPage } from './tabs/ProviderDetailPage'

// Top-level path segments that share the `/:businessId` shape but are
// NOT business ids. `IonRouterOutlet` (unlike `Switch`) keeps overlapping
// matches mounted to support push/pop animations, so the catch-all
// `/:businessId` route in App.tsx ALSO matches `/login`, `/register`,
// `/account`, and `/join`. Without this guard, BusinessTabsLayout — and
// every business-scoped provider beneath it — would mount with
// `businessId` set to the literal string `'login'` (etc.), kicking off
// a wave of `/api/businesses/login/*` 404s.
const RESERVED_BUSINESS_PATHS = new Set(['login', 'register', 'account', 'join'])

/**
 * Business tabs shell — the structural heart of the migration.
 *
 * Replaces the legacy layer-stack + custom TabShell with Ionic primitives:
 *   - `IonTabs` orchestrates per-tab navigation stacks (each tab keeps its
 *     own scroll, drill-down history, and mounted state).
 *   - `IonRouterOutlet` owns the iOS-style slide / peel-back animations
 *     between sibling pages inside the same tab. Pages that pushed via
 *     `IonRouterLink`/`useIonRouter().push()` slide in; back gestures and
 *     `IonBackButton` slide them off.
 *   - `IonTabBar` is the persistent bottom nav. Tab order: Home, Sales,
 *     Products, Manage. Providers and Team do NOT appear in the bar —
 *     they are drill-downs from Manage that live inside the
 *     IonRouterOutlet's tab stack.
 *
 * Provider tree mirrors the legacy `app-shell.tsx` + `BusinessRoot.tsx`
 * combo (read those two files for the rationale):
 *
 *   PageTransitionProvider           // BusinessContext consumes useRouter +
 *                                    //   usePageTransition; mount above
 *   IncomingTransferProvider         // user-scoped; feeds the manage badge
 *     BusinessProvider               // canonical business identity
 *       PendingTransferProvider      // business-scoped; needs BusinessContext
 *         OrdersProvider             // mounted with key={businessId} so a
 *         SalesSessionsProvider      //   per-business switch resets state
 *         SalesProvider              //   without leaking cached arrays
 *         ProvidersProvider          //
 *         ProductsProvider           //
 *         ProductSettingsProvider    //
 *           ContentGuard             // gates render until BusinessContext
 *                                    //   has resolved the business + role
 *             BusinessDataPreloader  // fires ensure*Loaded() in the
 *                                    //   background regardless of which
 *                                    //   tab the user lands on first
 *             IonTabs / IonRouterOutlet / IonTabBar
 *
 * URL contract:
 *   - `/<businessId>` (no tab) → redirect to `/<businessId>/home`
 *   - `/<businessId>/home`     → HomeTab
 *   - `/<businessId>/sales`    → SalesTab
 *   - `/<businessId>/products` → ProductsTab
 *   - `/<businessId>/manage`   → ManageTab
 *   - `/<businessId>/providers`            → ProvidersTab (drill-down)
 *   - `/<businessId>/providers/:id`        → ProviderDetailPage (drill-down)
 *   - `/<businessId>/team`                  → TeamTab (drill-down)
 *
 * Phase 10.1 ships this with PLACEHOLDER tab bodies. Phases 11–12 fill
 * them in. The provider tree is final and load-bearing as of this phase.
 */
export function BusinessTabsLayout() {
  const { businessId } = useParams<{ businessId: string }>()
  const intl = useIntl()

  // Bail out when the matched `:businessId` is actually one of the
  // top-level reserved paths (see RESERVED_BUSINESS_PATHS comment).
  // `IonRouterOutlet` keeps overlapping routes mounted, so this layout
  // gets a parallel mount alongside the real route component for
  // /login, /register, /account, /join. Returning null here prevents
  // BusinessProvider et al. from firing API calls with bogus businessIds.
  if (!businessId || RESERVED_BUSINESS_PATHS.has(businessId)) {
    return null
  }

  // Per-business `key` resets each provider's internal state when the
  // user switches businesses (cache instances, refs, in-flight promises).
  // This matches the legacy BusinessRoot pattern verbatim — without it,
  // entering business A and then business B would leak A's cached arrays
  // into B's first render.
  return (
    <PageTransitionProvider>
      <IncomingTransferProvider>
        <BusinessProvider businessId={businessId}>
          <PendingTransferProvider>
            <OrdersProvider key={`orders-${businessId}`} businessId={businessId}>
              <SalesSessionsProvider key={`sales-sessions-${businessId}`} businessId={businessId}>
                <SalesProvider key={`sales-${businessId}`} businessId={businessId}>
                  <ProvidersProvider key={`providers-${businessId}`} businessId={businessId}>
                    <ProductsProvider key={`products-${businessId}`} businessId={businessId}>
                      <ProductSettingsProvider key={`product-settings-${businessId}`} businessId={businessId}>
                        <ContentGuard>
                          <BusinessDataPreloader businessId={businessId} />
                          <IonTabs>
                            <IonRouterOutlet>
                              <Route exact path="/:businessId/home" component={HomeTab} />
                              <Route exact path="/:businessId/sales" component={SalesTab} />
                              <Route exact path="/:businessId/products" component={ProductsTab} />
                              <Route exact path="/:businessId/manage" component={ManageTab} />
                              {/* Drill-downs. Live inside the same outlet
                                  so the iOS-style push animation is owned
                                  by Ionic. ProviderDetail must be
                                  registered BEFORE the providers list so
                                  its more specific pattern wins. */}
                              <Route exact path="/:businessId/providers/:id" component={ProviderDetailPage} />
                              <Route exact path="/:businessId/providers" component={ProvidersTab} />
                              <Route exact path="/:businessId/team" component={TeamTab} />
                              {/* Bare /<businessId> normalizes to /home so
                                  refresh + deep-link land on the canonical
                                  URL the IonTabBar's `selectedTab` logic
                                  recognizes. */}
                              <Route
                                exact
                                path="/:businessId"
                                render={({ match }) => (
                                  <Redirect to={`/${match.params.businessId}/home`} />
                                )}
                              />
                            </IonRouterOutlet>
                            <IonTabBar slot="bottom">
                              <IonTabButton tab="home" href={`/${businessId}/home`}>
                                <IonIcon icon={homeOutline} />
                                <IonLabel>{intl.formatMessage({ id: 'navigation.home' })}</IonLabel>
                              </IonTabButton>
                              <IonTabButton tab="sales" href={`/${businessId}/sales`}>
                                <IonIcon icon={cartOutline} />
                                <IonLabel>{intl.formatMessage({ id: 'navigation.sales' })}</IonLabel>
                              </IonTabButton>
                              <IonTabButton tab="products" href={`/${businessId}/products`}>
                                <IonIcon icon={pricetagsOutline} />
                                <IonLabel>{intl.formatMessage({ id: 'navigation.products' })}</IonLabel>
                              </IonTabButton>
                              <IonTabButton tab="manage" href={`/${businessId}/manage`}>
                                <IonIcon icon={settingsOutline} />
                                <IonLabel>{intl.formatMessage({ id: 'navigation.manage' })}</IonLabel>
                              </IonTabButton>
                            </IonTabBar>
                          </IonTabs>
                        </ContentGuard>
                      </ProductSettingsProvider>
                    </ProductsProvider>
                  </ProvidersProvider>
                </SalesProvider>
              </SalesSessionsProvider>
            </OrdersProvider>
          </PendingTransferProvider>
        </BusinessProvider>
      </IncomingTransferProvider>
    </PageTransitionProvider>
  )
}
