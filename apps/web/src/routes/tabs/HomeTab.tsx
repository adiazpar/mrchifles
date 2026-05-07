import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useIntl } from 'react-intl'

import { HomeView } from '@/components/tab-shell/views/HomeView'

export function HomeTab() {
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'navigation.home' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <HomeView />
      </IonContent>
    </IonPage>
  )
}
