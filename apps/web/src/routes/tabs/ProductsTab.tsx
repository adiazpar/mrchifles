import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useIntl } from 'react-intl'

import { ProductsView } from '@/components/tab-shell/views/ProductsView'

export function ProductsTab() {
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'navigation.products' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ProductsView />
      </IonContent>
    </IonPage>
  )
}
