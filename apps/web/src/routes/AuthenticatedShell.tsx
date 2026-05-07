import { Route } from 'react-router-dom'
import { IonRouterOutlet } from '@ionic/react'

import { AccountPage } from '@/routes/AccountPage'
import { BusinessProvidersFromUrl } from '@/routes/BusinessProvidersFromUrl'
import { BusinessTabsLayout } from '@/routes/BusinessTabsLayout'
import { HubPage } from '@/routes/HubPage'
import { JoinPage } from '@/routes/JoinPage'

export function AuthenticatedShell() {
  return (
    <BusinessProvidersFromUrl>
      <IonRouterOutlet>
        <Route exact path="/account">
          <AccountPage />
        </Route>
        <Route exact path="/join">
          <JoinPage />
        </Route>
        <Route exact path="/">
          <HubPage />
        </Route>
        <Route path="/:businessId([A-Za-z0-9_-]{9,})">
          <BusinessTabsLayout />
        </Route>
      </IonRouterOutlet>
    </BusinessProvidersFromUrl>
  )
}
