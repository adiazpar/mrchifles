import { IonContent, IonPage } from '@ionic/react'

import { BusinessHeader } from '@/components/layout'
import { SalesView } from '@/components/tab-shell/views/SalesView'

// SalesContext / SalesSessionsContext are mounted above the route in
// BusinessProvidersFromUrl, so an open POS session survives tab switches
// (this page unmounts on tab change but the session state does not).
export function SalesTab() {
  return (
    <IonPage>
      <BusinessHeader />
      <IonContent>
        <SalesView />
      </IonContent>
    </IonPage>
  )
}
