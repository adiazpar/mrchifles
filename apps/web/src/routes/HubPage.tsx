'use client'

import { IonButtons, IonContent, IonHeader, IonPage, IonToolbar } from '@ionic/react'
import { PageSpinner } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { CreateBusinessProvider } from '@/contexts/create-business-context'
import { JoinBusinessProvider } from '@/contexts/join-business-context'
import { IncomingTransferProvider } from '@/contexts/incoming-transfer-context'
import { PageTransitionProvider } from '@/contexts/page-transition-context'
import { UserMenu } from '@/components/layout/user-menu'
import { HubHome } from '@/components/hub/HubHome'
import { EntryPage } from '@/routes/EntryPage'

/**
 * Hub home page (the / route, post-login). Lists the user's businesses
 * and exposes Create / Join business actions via auto-mounted modals
 * from their respective providers.
 *
 * Provider tree mirrors what app-shell.tsx mounts in the original
 * Next.js implementation, minus BusinessProvider (the hub has no active
 * business by definition) and minus PendingTransferProvider (that's a
 * business-scoped provider, not user-scoped). The four providers we DO
 * mount here are the ones HubHome and UserMenu rely on:
 *   - JoinBusinessProvider     -> auto-mounts JoinBusinessModal,
 *                                 handles ?code=... QR deep links
 *   - CreateBusinessProvider   -> auto-mounts CreateBusinessModal
 *   - IncomingTransferProvider -> feeds the UserMenu badge dot
 *   - PageTransitionProvider   -> required by HubHome's navigate() and
 *                                 by UserMenuContent for cross-context
 *                                 navigation back into a business
 *
 * Auth gating: `/` serves a dual role — EntryPage (unauthenticated) and
 * the business hub (authenticated). Once auth resolves with no user, we
 * render EntryPage inline rather than redirecting, so the URL stays at
 * `/` for both states. After sign-in, AuthContext updates `user` and
 * this component re-renders into the hub tree.
 */
export function HubPage() {
  const { user, isLoading: authLoading } = useAuth()

  if (!authLoading && !user) {
    return <EntryPage />
  }

  return (
    <IonPage>
      {authLoading ? (
        <IonContent>
          <PageSpinner />
        </IonContent>
      ) : (
        <PageTransitionProvider>
          <JoinBusinessProvider>
            <CreateBusinessProvider>
              <IncomingTransferProvider>
                <HubPageChrome />
              </IncomingTransferProvider>
            </CreateBusinessProvider>
          </JoinBusinessProvider>
        </PageTransitionProvider>
      )}
    </IonPage>
  )
}

function HubPageChrome() {
  return (
    <>
      <IonHeader>
        <IonToolbar>
          <div className="hub-topbar">
            <span className="hub-topbar__brand">Kasero</span>
            <IonButtons className="hub-topbar__actions">
              <UserMenu trigger="hamburger" />
            </IonButtons>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <HubHome />
      </IonContent>
    </>
  )
}
