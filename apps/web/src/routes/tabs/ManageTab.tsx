import { IonContent, IonPage } from '@ionic/react'

import { BusinessHeader } from '@/components/layout'
import { ManageView } from '@/components/tab-shell/views/ManageView'

export function ManageTab() {
  return (
    <IonPage>
      <BusinessHeader />
      <IonContent>
        <ManageView />
      </IonContent>
    </IonPage>
  )
}
