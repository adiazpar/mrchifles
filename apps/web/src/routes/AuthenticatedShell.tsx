import { Route } from 'react-router-dom'
import { IonRouterOutlet } from '@ionic/react'

import { AccountPage } from '@/routes/AccountPage'
import { Security } from '@/routes/account/Security'
import { TwoFactorSetup } from '@/routes/account/TwoFactorSetup'
import { BusinessProvidersFromUrl } from '@/routes/BusinessProvidersFromUrl'
import { BusinessTabsLayout } from '@/routes/BusinessTabsLayout'
import { HubPage } from '@/routes/HubPage'
import { JoinPage } from '@/routes/JoinPage'

// `BusinessProvidersFromUrl` is mounted INSIDE the `/:businessId` route,
// not around the outlet. Wrapping the outlet with a component whose
// rendered tree shape changes with the URL (Fragment vs. full provider
// stack) caused React to unmount and remount the outlet on every
// hub<->business transition. By the second remount Ionic's view-stack
// lifecycle stopped clearing `.ion-page-invisible` on the new page —
// the page mounted with `opacity: 0`, looked blank, but had working
// pointer-events (buttons fired haptics where they "would be").
// Keeping the outlet structurally stable fixes that.
export function AuthenticatedShell() {
  return (
    <IonRouterOutlet>
      <Route exact path="/account">
        <AccountPage />
      </Route>
      <Route exact path="/account/security">
        <Security />
      </Route>
      <Route exact path="/account/security/2fa-setup">
        <TwoFactorSetup />
      </Route>
      <Route exact path="/join">
        <JoinPage />
      </Route>
      <Route exact path="/">
        <HubPage />
      </Route>
      <Route path="/:businessId([A-Za-z0-9_-]{9,})">
        <BusinessProvidersFromUrl>
          <BusinessTabsLayout />
        </BusinessProvidersFromUrl>
      </Route>
    </IonRouterOutlet>
  )
}
