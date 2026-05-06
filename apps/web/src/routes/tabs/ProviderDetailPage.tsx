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

import { ProviderDetailClient } from '@/components/providers/ProviderDetailClient'
import { useProviders } from '@/contexts/providers-context'

/**
 * Provider detail drill-down — renders provider info, embedded notes,
 * stats and order history for a single provider.
 *
 * Mounted at `/<businessId>/providers/:id` from BusinessTabsLayout's
 * IonRouterOutlet. Reached via `router.push()` from the providers list,
 * which animates as a native iOS-style slide.
 *
 * Pattern choice (mirrors `ProvidersTab` / `TeamTab` from Phase 12.1
 * and 12.2):
 *   - We REUSE `<ProviderDetailClient businessId=... providerId=... />`
 *     verbatim. Its legacy `DrillDownHeader` was stripped (see the
 *     component) so the `IonHeader` + `IonBackButton` here is the only
 *     chrome.
 *   - The dynamic title (the provider's name) is hoisted up: we look
 *     up `useProviders().providers.find(p => p.id === id)` here, so the
 *     `IonTitle` can render the name even before `ProviderDetailClient`
 *     finishes its detail GET. The body still owns the canonical detail
 *     fetch — this hoist is title-only. Until the providers list cache
 *     populates (e.g. on a deep-link entry), the title falls back to
 *     the generic `providers.detail_title` label and the body shows
 *     its loading spinner.
 *   - Provider-not-found UX (delete-while-viewing, deep-link to a
 *     stale id) stays inside `ProviderDetailClient` so the route
 *     component doesn't redirect or branch on a transient state.
 *   - The `IonBackButton` defaults to `/<businessId>/providers` so a
 *     deep-link entry (no in-app history) lands on the parent list.
 *     With history present, Ionic uses the actual stack.
 */
export function ProviderDetailPage() {
  const { businessId, id } = useParams<{ businessId: string; id: string }>()
  const intl = useIntl()
  const { providers } = useProviders()
  const provider = providers.find((p) => p.id === id)
  const title = provider?.name ?? intl.formatMessage({ id: 'providers.detail_title' })

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/${businessId}/providers`} />
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ProviderDetailClient businessId={businessId} providerId={id} />
      </IonContent>
    </IonPage>
  )
}
