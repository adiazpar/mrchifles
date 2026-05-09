import { IonContent, IonPage } from '@ionic/react'

import { BusinessHeader } from '@/components/layout'
import { HomeView } from '@/components/tab-shell/views/HomeView'

export function HomeTab() {
  return (
    <IonPage>
      <BusinessHeader />
      <IonContent>
        <HomeView />
      </IonContent>
    </IonPage>
  )
}
