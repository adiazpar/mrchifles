import { IonContent, IonPage } from '@ionic/react'

import { BusinessHeader } from '@/components/layout'
import { ProductsView } from '@/components/tab-shell/views/ProductsView'

export function ProductsTab() {
  return (
    <IonPage>
      <BusinessHeader />
      <IonContent>
        <ProductsView />
      </IonContent>
    </IonPage>
  )
}
