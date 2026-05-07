import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useIntl } from 'react-intl'

import { SalesView } from '@/components/tab-shell/views/SalesView'

// SalesContext / SalesSessionsContext are mounted above the route in
// BusinessProvidersFromUrl, so an open POS session survives tab switches
// (this page unmounts on tab change but the session state does not).
export function SalesTab() {
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'navigation.sales' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <SalesView />
      </IonContent>
    </IonPage>
  )
}
