'use client'

import { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { Redirect } from 'react-router-dom'
import { IonContent, IonHeader, IonPage, IonToolbar } from '@ionic/react'
import { useAuth } from '@/contexts/auth-context'
import { CreateBusinessProvider } from '@/contexts/create-business-context'
import { JoinBusinessProvider } from '@/contexts/join-business-context'
import { IncomingTransferProvider } from '@/contexts/incoming-transfer-context'
import { PageTransitionProvider } from '@/contexts/page-transition-context'
import { Spinner } from '@/components/ui'
import { UserMenu } from '@/components/layout/user-menu'
import { HubHome } from '@/components/hub/HubHome'

// Time-of-day greeting bucket. Computed in an effect (rather than inline)
// to avoid a split-second hour-boundary render mismatch between mount and
// the first commit; matches the pattern documented in CLAUDE.md.
type GreetingKey =
  | 'hub.greeting_morning'
  | 'hub.greeting_afternoon'
  | 'hub.greeting_evening'

function computeGreetingKey(): GreetingKey {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'hub.greeting_morning'
  if (hour >= 12 && hour < 18) return 'hub.greeting_afternoon'
  return 'hub.greeting_evening'
}

/**
 * Hub home page (the / route, post-login). Lists the user's businesses,
 * shows the time-of-day greeting + UserMenu, and exposes Create/Join
 * business actions via auto-mounted modals from their respective
 * providers.
 *
 * Provider tree mirrors the one app-shell.tsx mounts in the original
 * Next.js implementation, minus BusinessProvider (the hub has no active
 * business by definition) and minus PendingTransferProvider (that's
 * a business-scoped provider, not user-scoped). The four providers we
 * DO mount here are the ones HubHome and UserMenu rely on:
 *   - JoinBusinessProvider     -> auto-mounts JoinBusinessModal,
 *                                 handles ?code=... QR deep links
 *   - CreateBusinessProvider   -> auto-mounts CreateBusinessModal
 *   - IncomingTransferProvider -> feeds the UserMenu badge dot
 *   - PageTransitionProvider   -> required by HubHome's navigate() and
 *                                 by UserMenuContent for cross-context
 *                                 navigation back into a business
 *
 * Auth gating: if the user is not authenticated once auth has finished
 * loading, redirect to /login. The redirect path mirrors what
 * AuthContext does on a 401, so deep links still work after sign-in.
 */
export function HubPage() {
  const { user, isLoading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <IonPage>
        <IonContent>
          <div className="flex-1 flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        </IonContent>
      </IonPage>
    )
  }

  if (!user) {
    return <Redirect to="/login" />
  }

  return (
    <PageTransitionProvider>
      <JoinBusinessProvider>
        <CreateBusinessProvider>
          <IncomingTransferProvider>
            <HubPageChrome />
          </IncomingTransferProvider>
        </CreateBusinessProvider>
      </JoinBusinessProvider>
    </PageTransitionProvider>
  )
}

function HubPageChrome() {
  const intl = useIntl()
  const { user } = useAuth()
  const [greetingKey, setGreetingKey] = useState<GreetingKey | null>(null)

  useEffect(() => {
    setGreetingKey(computeGreetingKey())
  }, [])

  const greeting =
    greetingKey && user?.name
      ? `${intl.formatMessage({ id: greetingKey })}, ${user.name}`
      : null

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <div className="flex items-center justify-between w-full px-2">
            <h1 className="page-title text-lg font-semibold truncate">
              {greeting ?? ' '}
            </h1>
            <div className="flex-shrink-0 ml-2">
              <UserMenu />
            </div>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <HubHome />
      </IonContent>
    </IonPage>
  )
}
