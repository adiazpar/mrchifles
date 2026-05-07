import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useIntl } from 'react-intl'

import { ManageView } from '@/components/tab-shell/views/ManageView'

export function ManageTab() {
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'navigation.manage' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ManageView />
      </IonContent>
    </IonPage>
  )
}
