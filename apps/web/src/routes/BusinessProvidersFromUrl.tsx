import type { ReactNode } from 'react'
import { useRouteMatch } from 'react-router-dom'

import { BusinessDataPreloader } from '@/components/layout/BusinessDataPreloader'
import { NavigationErrorNotice } from '@/components/layout/NavigationErrorNotice'
import { ContentGuard } from '@/components/auth'
import { BusinessProvider } from '@/contexts/business-context'
import { IncomingTransferProvider } from '@/contexts/incoming-transfer-context'
import { OrdersProvider } from '@/contexts/orders-context'
import { PageTransitionProvider } from '@/contexts/page-transition-context'
import { PendingTransferProvider } from '@/contexts/pending-transfer-context'
import { ProductsProvider } from '@/contexts/products-context'
import { ProductSettingsProvider } from '@/contexts/product-settings-context'
import { ProvidersProvider } from '@/contexts/providers-context'
import { SalesProvider } from '@/contexts/sales-context'
import { SalesSessionsProvider } from '@/contexts/sales-sessions-context'

// Top-level path segments that share the `/:businessId` shape but are
// NOT business ids. The single shared IonRouterOutlet matches any
// `/:bizId/...` path; without this guard, the providers below would
// mount with `businessId` set to the literal `'login'` (etc.), kicking
// off `/api/businesses/login/*` 404s.
//
// Real businessIds are 21-char nanoids (alphabet `[A-Za-z0-9_-]`), so
// the route regex `[A-Za-z0-9_-]{9,}` already filters anything shorter
// — the longest reserved word is `register` at 8 chars. This Set is the
// runtime backstop in case the regex is ever loosened.
const RESERVED_BUSINESS_PATHS = new Set(['login', 'register', 'account', 'join'])

/**
 * Mounts the per-business provider tree when the URL is a business URL
 * (`/:businessId/...`), and renders children passthrough otherwise.
 *
 * Sits outside the IonRouterOutlet so providers stay mounted across
 * tab switches. The matched businessId is the React `key` on each
 * provider so per-business caches reset cleanly when the user switches
 * businesses.
 *
 * `ContentGuard` gates rendering until BusinessContext resolves the
 * business + role. `BusinessDataPreloader` warms `ensure*Loaded()`
 * data so any tab landing first sees populated caches.
 */
export function BusinessProvidersFromUrl({ children }: { children: ReactNode }) {
  // The path here mirrors the route patterns mounted in AuthenticatedShell
  // (`/:businessId/...`). Match is non-exact so it triggers for any
  // sub-path under a businessId (home, sales, providers, providers/:id,
  // team, etc.).
  const match = useRouteMatch<{ businessId: string }>({
    path: '/:businessId([A-Za-z0-9_-]{9,})',
    exact: false,
  })

  const businessId = match?.params.businessId

  if (!businessId || RESERVED_BUSINESS_PATHS.has(businessId)) {
    // Hub / Account / Join / auth pages: pass through, no business
    // providers needed.
    return <>{children}</>
  }

  // Per-business `key` resets each provider's internal state when the
  // user switches businesses (cache instances, refs, in-flight
  // promises). Without it, entering business A then business B would
  // leak A's cached arrays into B's first render.
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
                          <NavigationErrorNotice />
                          {children}
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
