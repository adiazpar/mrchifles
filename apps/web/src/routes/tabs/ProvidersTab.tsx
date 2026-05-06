import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
} from '@ionic/react'
import { useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'

import { ProvidersDrilldown } from '@/components/providers/ProvidersDrilldown'

/**
 * Providers drill-down tab — list of suppliers with add/edit/delete via
 * `ProviderModal`, swipe actions for new-order/edit/delete, and
 * navigation into `/<businessId>/providers/:id` (Phase 12.3) on tap.
 *
 * Mounted at `/<businessId>/providers` from BusinessTabsLayout's
 * IonRouterOutlet. Reached via the Manage tab's "Providers" shortcut,
 * which animates as a native iOS-style push.
 *
 * Pattern choice (mirrors `ManageTab` / `AccountPage`):
 *   - We REUSE `<ProvidersDrilldown businessId=... />` verbatim. Its
 *     legacy `DrillDownHeader` was stripped (see the component) so the
 *     `IonHeader` + `IonBackButton` here is the only chrome.
 *   - The view consumes `OrdersContext`, `ProvidersContext`,
 *     `BusinessContext` (via `useProviderManagement`) — all mounted by
 *     `BusinessTabsLayout`, plus `useRouter()` from the
 *     next-navigation-shim for `router.push('/<id>/providers/:id')`.
 *     Because the detail route is a sibling registered in the same
 *     IonRouterOutlet, Ionic animates that push as an iOS-style slide.
 *   - The "+ Add provider" CTA stays inline in the body rather than
 *     promoted to `<IonButtons slot="end">`. The legacy UX places it
 *     adjacent to the count chip in the providers card, and an
 *     in-empty-state CTA when the list is empty — the toolbar copy
 *     would duplicate (or hide) that affordance and lose the count
 *     context.
 *   - The `IonBackButton` defaults to `/<businessId>/manage` so a
 *     deep-link entry (no in-app history) lands on the parent page.
 *     With history present, Ionic uses the actual stack.
 */
export function ProvidersTab() {
  const { businessId } = useParams<{ businessId: string }>()
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/${businessId}/manage`} />
          </IonButtons>
          <IonTitle>{intl.formatMessage({ id: 'navigation.providers' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ProvidersDrilldown businessId={businessId} />
      </IonContent>
    </IonPage>
  )
}
